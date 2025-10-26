/**
 * Invitation Creation API
 *
 * Creates invitations and auth users immediately.
 * Flow:
 * 1. Validate admin permissions and school capacity
 * 2. Create invitation records in database
 * 3. Create auth users with email confirmation
 * 4. Send password setup emails (using Supabase magic link)
 * 5. User clicks email → auto-login → complete profile
 *
 * This pattern gives admins control and reduces friction for invitees.
 */

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
  role: z.enum(['student', 'teacher', 'school_admin']).optional().default('student'),
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
    .select('id, role, school_id, full_name, first_name, last_name')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    console.error('[invitations] Profile lookup failed:', {
      userId: user.id,
      userEmail: user.email,
      error: profileError,
      profileExists: !!profile,
    });
    return NextResponse.json({
      error: 'Profile not found',
      details: 'Your user profile could not be found. Please complete onboarding first.',
      debug: {
        userId: user.id,
        hasError: !!profileError,
        errorMessage: profileError?.message,
      }
    }, { status: 404 });
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
    console.error('[invitations] Failed to check existing invitations:', {
      error: existingError,
      userId: user.id,
      profileRole: profile.role,
      profileSchoolId: profile.school_id,
      targetSchoolId,
    });
    return NextResponse.json({
      error: 'Failed to check existing invitations',
      details: existingError.message,
      debug: {
        profileRole: profile.role,
        hasSchoolId: !!profile.school_id,
      }
    }, { status: 500 });
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

  // Only check capacity for student invitations (not for teachers or school_admins)
  if (role === 'student') {
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
        .eq('role', 'student')
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

  // Step 1: Create invitation records in database
  const { data: insertedInvitations, error: insertError } = await supabase
    .from('student_invitations')
    .insert(invitations)
    .select('*');

  if (insertError || !insertedInvitations) {
    console.error('[invitations] Failed to create invitation records:', insertError);
    return NextResponse.json({ error: 'Failed to create invitations' }, { status: 500 });
  }

  // Step 2: Create auth users immediately (better pattern for schools)
  // This allows admins to "create" accounts rather than just send invites
  const serviceClient = createServiceRoleClient();
  const baseUrl = getBaseUrl();
  const sendResults = [] as { email: string; success: boolean; error?: string; userId?: string }[];

  for (const invitation of insertedInvitations) {
    try {
      // Create auth user with email confirmation
      // User will receive Supabase's magic link to set password and login
      const { data: authUser, error: authError } = await serviceClient.auth.admin.createUser({
        email: invitation.email,
        email_confirm: true, // User can login immediately after setting password
        user_metadata: {
          // Pre-populate metadata from invitation
          invited_by: user.id,
          school_id: targetSchoolId,
          role: invitation.role,
          invitation_id: invitation.id,
          // Include any metadata from invitation (grade, class, etc)
          ...(invitation.metadata as Record<string, unknown>),
        },
      });

      if (authError || !authUser.user) {
        console.error('[invitations] Failed to create auth user:', authError);
        sendResults.push({
          email: invitation.email,
          success: false,
          error: `Failed to create user account: ${authError?.message}`,
        });
        continue;
      }

      // Update invitation record with user_id
      await supabase
        .from('student_invitations')
        .update({ user_id: authUser.user.id })
        .eq('id', invitation.id);

      // Generate password reset link (user will set their password)
      const { data: resetData, error: resetError } = await serviceClient.auth.admin.generateLink({
        type: 'magiclink',
        email: invitation.email,
        options: {
          redirectTo: `${baseUrl}/onboarding?invited=true&token=${invitation.token}`,
        },
      });

      if (resetError || !resetData.properties) {
        console.error('[invitations] Failed to generate magic link:', resetError);
        sendResults.push({
          email: invitation.email,
          success: false,
          userId: authUser.user.id,
          error: `Account created but failed to send email: ${resetError?.message}`,
        });
        continue;
      }

      // Send email with magic link for password setup
      // Build admin name from first_name + last_name, or fall back to full_name or school admin_name
      const adminName = profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.full_name ?? school.admin_name ?? null;

      const emailTemplate = buildInvitationEmail({
        schoolName: school.name,
        adminName,
        inviteLink: resetData.properties.action_link, // This is the magic link
        expiresIn: '7 days',
      });

      const { success, error: sendError } = await sendEmail({
        to: invitation.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      sendResults.push({
        email: invitation.email,
        success,
        userId: authUser.user.id,
        error: sendError,
      });

    } catch (error) {
      console.error('[invitations] Unexpected error processing invitation:', error);
      sendResults.push({
        email: invitation.email,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update admin's last invitation timestamp (optional metadata)
  try {
    await serviceClient.auth.admin.updateUserById(user.id, {
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
