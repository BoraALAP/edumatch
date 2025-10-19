import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getBaseUrl } from '@/lib/utils';
import { buildInvitationEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';
import type { TablesInsert } from '@/types/database.types';
import type { InvitationSettings } from '@/types/schools';

const invitationSchema = z.object({
  emails: z.array(z.string().email().transform((email) => email.toLowerCase().trim())).min(1).max(50),
  role: z.enum(['student', 'teacher']).optional().default('student'),
  metadata: z.record(z.any()).optional(),
  schoolId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request
    .json()
    .catch(() => null);

  const parseResult = invitationSchema.safeParse(payload);

  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid request', details: parseResult.error.format() }, { status: 400 });
  }

  const { emails, role, metadata, schoolId: requestedSchoolId } = parseResult.data;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, school_id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const allowedRoles = new Set(['school_admin', 'admin']);

  if (!allowedRoles.has(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetSchoolId = profile.role === 'school_admin' ? profile.school_id : requestedSchoolId;

  if (!targetSchoolId) {
    return NextResponse.json({ error: 'schoolId is required for admins without an assigned school' }, { status: 400 });
  }

  const { data: school, error: schoolError } = await supabase
    .from('schools')
    .select('id, name, admin_name, admin_email, max_students, is_active, invitation_settings')
    .eq('id', targetSchoolId)
    .maybeSingle();

  if (schoolError || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  if (!school.is_active) {
    return NextResponse.json({ error: 'School is inactive' }, { status: 400 });
  }

  const invitationSettings = (school.invitation_settings ?? {}) as InvitationSettings;
  const allowedDomains = (invitationSettings.allowed_domains ?? []).map((domain) => domain.toLowerCase());

  const domainViolations: string[] = [];

  if (allowedDomains.length > 0) {
    for (const email of emails) {
      const domain = email.split('@')[1];
      if (!allowedDomains.includes(domain)) {
        domainViolations.push(email);
      }
    }
  }

  if (domainViolations.length > 0) {
    return NextResponse.json({
      error: 'Email domain not allowed for one or more invitations',
      invalidEmails: domainViolations,
    }, { status: 400 });
  }

  const sanitizedEmails = Array.from(new Set(emails));

  const { data: existingInvites, error: existingError } = await supabase
    .from('student_invitations')
    .select('email, status')
    .eq('school_id', targetSchoolId)
    .eq('status', 'pending');

  if (existingError) {
    return NextResponse.json({ error: 'Failed to check existing invitations' }, { status: 500 });
  }

  const existingEmailSet = new Set((existingInvites ?? []).map((invite) => invite.email.toLowerCase()));

  const duplicateEmails = sanitizedEmails.filter((email) => existingEmailSet.has(email));
  const emailsToInvite = sanitizedEmails.filter((email) => !existingEmailSet.has(email));

  if (emailsToInvite.length === 0) {
    return NextResponse.json({
      error: 'All emails already have pending invitations',
      duplicateEmails,
    }, { status: 409 });
  }

  const [{ count: studentCount }, { count: pendingCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', targetSchoolId)
      .eq('role', 'student'),
    supabase
      .from('student_invitations')
      .select('id', { count: 'exact', head: true })
      .eq('school_id', targetSchoolId)
      .eq('status', 'pending'),
  ]);

  const maxStudents = school.max_students ?? Number.POSITIVE_INFINITY;
  const projectedTotal = (studentCount ?? 0) + (pendingCount ?? 0) + emailsToInvite.length;

  if (projectedTotal > maxStudents) {
    return NextResponse.json({
      error: 'Inviting these students exceeds the school capacity',
      capacity: {
        max: maxStudents,
        currentStudents: studentCount ?? 0,
        pendingInvitations: pendingCount ?? 0,
        requested: emailsToInvite.length,
      },
    }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const invitations: TablesInsert<'student_invitations'>[] = emailsToInvite.map((email) => ({
    email,
    invited_by: user.id,
    school_id: targetSchoolId,
    token: randomUUID(),
    expires_at: expiresAt,
    metadata: metadata ?? {},
    role,
  }));

  const { data: insertedInvitations, error: insertError } = await supabase
    .from('student_invitations')
    .insert(invitations)
    .select('*');

  if (insertError || !insertedInvitations) {
    return NextResponse.json({ error: 'Failed to create invitations' }, { status: 500 });
  }

  const baseUrl = getBaseUrl();
  const expiresInLabel = '7 days';
  const sendResults = [] as { email: string; success: boolean; error?: string }[];

  for (const invitation of insertedInvitations) {
    const inviteLink = `${baseUrl}/invite/${invitation.token}`;
    const emailTemplate = buildInvitationEmail({
      schoolName: school.name,
      adminName: profile.full_name ?? school.admin_name ?? null,
      inviteLink,
      expiresIn: expiresInLabel,
    });

    const { success, error } = await sendEmail({
      to: invitation.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    sendResults.push({ email: invitation.email, success, error });
  }

  // Optionally attach auth metadata when available
  try {
    const serviceClient = createServiceRoleClient();
    await serviceClient.auth.admin.updateUserById(profile.id, {
      user_metadata: {
        last_invitation_batch_at: now.toISOString(),
      },
    });
  } catch (error) {
    console.warn('[invitations] Failed to store admin metadata', error);
  }

  return NextResponse.json({
    created: insertedInvitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      token: invitation.token,
      expires_at: invitation.expires_at,
    })),
    duplicates: duplicateEmails,
    emailResults: sendResults,
  });
}
