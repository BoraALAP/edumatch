import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/utils';
import { buildInvitationEmail } from '@/lib/email/templates';
import { sendEmail } from '@/lib/email/send';

const requestSchema = z.object({
  id: z.string().uuid(),
  extendByDays: z.number().int().min(1).max(30).optional().default(7),
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

  const parsed = requestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parsed.error.format() }, { status: 400 });
  }

  const { id, extendByDays } = parsed.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id, full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['school_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: invitation, error } = await supabase
    .from('student_invitations')
    .select('id, email, status, school_id, role, metadata, token, expires_at')
    .eq('id', id)
    .maybeSingle();

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (profile.role === 'school_admin' && invitation.school_id !== profile.school_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending invitations can be resent' }, { status: 400 });
  }

  const newToken = randomUUID();
  const newExpiry = new Date(Date.now() + extendByDays * 24 * 60 * 60 * 1000).toISOString();

  const { data: updated, error: updateError } = await supabase
    .from('student_invitations')
    .update({
      token: newToken,
      expires_at: newExpiry,
      accepted_at: null,
      status: 'pending',
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to update invitation' }, { status: 500 });
  }

  const { data: school } = await supabase
    .from('schools')
    .select('name, admin_name')
    .eq('id', updated.school_id)
    .maybeSingle();

  const baseUrl = getBaseUrl();
  const inviteLink = `${baseUrl}/invite/${updated.token}`;
  const emailTemplate = buildInvitationEmail({
    schoolName: school?.name ?? 'Your School',
    adminName: profile.full_name ?? school?.admin_name ?? null,
    inviteLink,
    expiresIn: `${extendByDays} day${extendByDays === 1 ? '' : 's'}`,
  });

  const emailResult = await sendEmail({
    to: updated.email,
    subject: emailTemplate.subject,
    html: emailTemplate.html,
    text: emailTemplate.text,
  });

  return NextResponse.json({
    invitation: updated,
    email: emailResult,
  });
}
