import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';
import type { InvitationSettings } from '@/types/schools';

const invitationSettingsSchema = z.object({
  require_approval: z.boolean().optional(),
  auto_accept_domain: z.boolean().optional(),
  allowed_domains: z.array(z.string()).transform((domains) => domains.map((domain) => domain.toLowerCase())).optional(),
  default_student_settings: z.record(z.any()).optional(),
});

const patchSchema = z.object({
  admin_email: z.string().email().optional(),
  admin_name: z.string().min(1).max(120).optional(),
  is_active: z.boolean().optional(),
  invitation_settings: invitationSettingsSchema.optional(),
  schoolId: z.string().uuid().optional(),
});

const querySchema = z.object({
  schoolId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = querySchema.safeParse({ schoolId: url.searchParams.get('schoolId') ?? undefined });

  if (!query.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['school_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const schoolId = profile.role === 'school_admin' ? profile.school_id : query.data.schoolId;

  if (!schoolId) {
    return NextResponse.json({ error: 'schoolId is required for admins without an assigned school' }, { status: 400 });
  }

  const { data: school, error } = await supabase
    .from('schools')
    .select('id, name, admin_email, admin_name, invitation_settings, is_active, max_students, country, timezone')
    .eq('id', schoolId)
    .maybeSingle();

  if (error || !school) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  return NextResponse.json({ school });
}

export async function PATCH(request: Request) {
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

  const parsed = patchSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body', details: parsed.error.format() }, { status: 400 });
  }

  const { admin_email, admin_name, is_active, invitation_settings, schoolId: requestedSchoolId } = parsed.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['school_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const schoolId = profile.role === 'school_admin' ? profile.school_id : requestedSchoolId;

  if (!schoolId) {
    return NextResponse.json({ error: 'schoolId is required for admins without an assigned school' }, { status: 400 });
  }

  const { data: existingSchool, error: fetchError } = await supabase
    .from('schools')
    .select('invitation_settings')
    .eq('id', schoolId)
    .maybeSingle();

  if (fetchError || !existingSchool) {
    return NextResponse.json({ error: 'School not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};

  if (typeof admin_email !== 'undefined') {
    updates.admin_email = admin_email;
  }

  if (typeof admin_name !== 'undefined') {
    updates.admin_name = admin_name;
  }

  if (typeof is_active !== 'undefined') {
    updates.is_active = is_active;
  }

  if (invitation_settings) {
    const currentSettings = (existingSchool.invitation_settings ?? {}) as InvitationSettings;
    updates.invitation_settings = {
      ...currentSettings,
      ...invitation_settings,
    };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
  }

  const { data: updatedSchool, error: updateError } = await supabase
    .from('schools')
    .update(updates)
    .eq('id', schoolId)
    .select('id, name, admin_email, admin_name, invitation_settings, is_active, max_students, country, timezone')
    .maybeSingle();

  if (updateError || !updatedSchool) {
    return NextResponse.json({ error: 'Failed to update school settings' }, { status: 500 });
  }

  return NextResponse.json({ school: updatedSchool });
}
