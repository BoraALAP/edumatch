import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

const ENABLED = process.env.ENABLE_DEV_ADMIN_SETUP === 'true';
const TEST_SCHOOL_NAME = 'Local Test School';

export async function POST() {
  if (process.env.NODE_ENV === 'production' || !ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let serviceClient;
  try {
    serviceClient = createServiceRoleClient();
  } catch (error) {
    console.error('[dev-setup-admin] Missing Supabase service role key', error);
    return NextResponse.json({ error: 'Service role client unavailable' }, { status: 500 });
  }

  const { data: existingSchool, error: findSchoolError } = await serviceClient
    .from('schools')
    .select('id')
    .eq('name', TEST_SCHOOL_NAME)
    .maybeSingle();

  if (findSchoolError) {
    console.error('[dev-setup-admin] Failed to lookup test school', findSchoolError);
    return NextResponse.json({ error: 'Failed to lookup test school' }, { status: 500 });
  }

  let schoolId = existingSchool?.id ?? null;

  if (!schoolId) {
    const { data: insertedSchool, error: insertSchoolError } = await serviceClient
      .from('schools')
      .insert({
        name: TEST_SCHOOL_NAME,
        domain: null,
        invitation_settings: {},
        is_active: true,
      })
      .select('id')
      .maybeSingle();

    if (insertSchoolError || !insertedSchool) {
      console.error('[dev-setup-admin] Failed to create test school', insertSchoolError);
      return NextResponse.json({ error: 'Failed to create test school' }, { status: 500 });
    }

    schoolId = insertedSchool.id;
  }

  const { data: updatedProfile, error: updateProfileError } = await serviceClient
    .from('profiles')
    .update({
      role: 'school_admin',
      school_id: schoolId,
      onboarding_completed: true,
    })
    .eq('id', user.id)
    .select('id')
    .maybeSingle();

  if (updateProfileError || !updatedProfile) {
    const { error: insertProfileError } = await serviceClient
      .from('profiles')
      .insert({
        id: user.id,
        role: 'school_admin',
        school_id: schoolId,
        onboarding_completed: true,
      });

    if (insertProfileError) {
      console.error('[dev-setup-admin] Failed to upsert profile', insertProfileError);
      return NextResponse.json({ error: 'Failed to create admin profile' }, { status: 500 });
    }
  }

  return NextResponse.json({
    message: 'Current user promoted to school admin for Local Test School.',
    schoolId,
  });
}
