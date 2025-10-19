import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { InvitationSettings } from '@/types/schools';
import type { TablesUpdate } from '@/types/database.types';

export async function POST(
  _request: Request,
  context: { params: { token: string } }
) {
  const { token } = context.params;

  if (!token) {
    return NextResponse.json({ error: 'Token is required' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  let serviceClient;

  try {
    serviceClient = createServiceRoleClient();
  } catch {
    return NextResponse.json({ error: 'Invitation service unavailable' }, { status: 503 });
  }

  const { data: invitation, error } = await serviceClient
    .from('student_invitations')
    .select('id, email, status, school_id, expires_at, role, metadata, school:schools(id, name, is_active, invitation_settings)')
    .eq('token', token)
    .maybeSingle();

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (!invitation.school?.is_active) {
    return NextResponse.json({ error: 'School is no longer active' }, { status: 400 });
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: `Invitation already ${invitation.status}` }, { status: 400 });
  }

  const expiresAt = new Date(invitation.expires_at);
  if (expiresAt.getTime() <= Date.now()) {
    return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
  }

  if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: 'This invitation was sent to a different email address' }, { status: 403 });
  }

  let { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id, settings')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const { error: createProfileError } = await supabase
      .from('profiles')
      .insert({ id: user.id, role: 'student' });

    if (createProfileError) {
      return NextResponse.json({ error: 'Failed to prepare user profile' }, { status: 500 });
    }

    const { data: freshProfile } = await supabase
      .from('profiles')
      .select('id, role, school_id, settings')
      .eq('id', user.id)
      .maybeSingle();

    profile = freshProfile ?? null;
  }

  if (!profile) {
    return NextResponse.json({ error: 'Profile could not be loaded' }, { status: 500 });
  }

  if (profile.school_id && profile.school_id !== invitation.school_id) {
    return NextResponse.json({ error: 'User already belongs to a different school' }, { status: 409 });
  }

  const invitationSettings = (invitation.school?.invitation_settings ?? {}) as InvitationSettings;
  const defaultStudentSettings = invitationSettings.default_student_settings ?? {};
  const existingSettings = (profile.settings as Record<string, unknown> | null) ?? {};
  const mergedSettings = Object.keys(defaultStudentSettings).length
    ? { ...defaultStudentSettings, ...existingSettings }
    : existingSettings;

  const updatePayload: TablesUpdate<'profiles'> = {
    school_id: invitation.school_id,
    role: (invitation.role as TablesUpdate<'profiles'>['role']) ?? 'student',
  };

  if (Object.keys(mergedSettings).length > 0) {
    updatePayload.settings = mergedSettings;
  }

  const { error: updateProfileError, data: updatedProfile } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)
    .select('id, role, school_id, settings')
    .maybeSingle();

  if (updateProfileError || !updatedProfile) {
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }

  const acceptedAt = new Date().toISOString();
  const { error: updateInvitationError } = await serviceClient
    .from('student_invitations')
    .update({ status: 'accepted', accepted_at: acceptedAt })
    .eq('id', invitation.id);

  if (updateInvitationError) {
    return NextResponse.json({ error: 'Failed to mark invitation as accepted' }, { status: 500 });
  }

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      email: invitation.email,
      status: 'accepted',
      accepted_at: acceptedAt,
      school_id: invitation.school_id,
    },
    profile: updatedProfile,
  });
}
