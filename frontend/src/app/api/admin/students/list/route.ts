import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const querySchema = z.object({
  role: z.enum(['student', 'teacher']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
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

  const params = querySchema.safeParse({
    role: url.searchParams.get('role') ?? undefined,
    status: url.searchParams.get('status') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    schoolId: url.searchParams.get('schoolId') ?? undefined,
  });

  if (!params.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { role, status, search, page, limit, schoolId: requestedSchoolId } = params.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['school_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetSchoolId = profile.role === 'school_admin' ? profile.school_id : requestedSchoolId;

  if (!targetSchoolId) {
    return NextResponse.json({ error: 'schoolId is required for admins without an assigned school' }, { status: 400 });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('profiles')
    .select('id, full_name, display_name, avatar_url, role, onboarding_completed, last_active_at, created_at, updated_at', {
      count: 'exact',
    })
    .eq('school_id', targetSchoolId)
    .range(from, to)
    .order('full_name', { ascending: true, nullsFirst: false });

  if (role) {
    query = query.eq('role', role);
  }

  if (status) {
    query = query.eq('onboarding_completed', status === 'active');
  }

  if (search) {
    const searchTerm = `%${search}%`;
    query = query.or(`full_name.ilike.${searchTerm},display_name.ilike.${searchTerm}`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }

  return NextResponse.json({
    students: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      hasMore: typeof count === 'number' ? to + 1 < count : false,
    },
  });
}
