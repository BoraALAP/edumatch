import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  let serviceClient;

  try {
    serviceClient = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: 'Invitation service unavailable' }, { status: 503 });
  }

  const { data: invitation, error } = await serviceClient
    .from('student_invitations')
    .select('id, email, status, expires_at, role, metadata, school:schools(id, name, is_active, invitation_settings)')
    .eq('token', token)
    .maybeSingle();

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  const now = new Date();
  const expiresAt = new Date(invitation.expires_at);
  const isExpired = expiresAt.getTime() <= now.getTime();

  if (!invitation.school?.is_active) {
    return NextResponse.json({ error: 'School is not active' }, { status: 400 });
  }

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      status: invitation.status,
      role: invitation.role,
      expires_at: invitation.expires_at,
      isExpired,
      school: invitation.school,
      metadata: invitation.metadata ?? {},
    },
  });
}
