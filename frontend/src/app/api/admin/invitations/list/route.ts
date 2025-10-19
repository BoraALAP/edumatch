import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const querySchema = z.object({
  status: z.enum(['pending', 'accepted', 'expired', 'cancelled']).optional(),
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
    status: url.searchParams.get('status') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    page: url.searchParams.get('page') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    schoolId: url.searchParams.get('schoolId') ?? undefined,
  });

  if (!params.success) {
    return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
  }

  const { status, search, page, limit, schoolId: requestedSchoolId } = params.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  const allowedRoles = new Set(['school_admin', 'admin']);

  if (!profile || !allowedRoles.has(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const targetSchoolId = profile.role === 'school_admin' ? profile.school_id : requestedSchoolId;

  if (!targetSchoolId) {
    return NextResponse.json({ error: 'schoolId is required for admins without an assigned school' }, { status: 400 });
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('student_invitations')
    .select('id, email, status, role, metadata, created_at, updated_at, expires_at, accepted_at, invited_by', {
      count: 'exact',
    })
    .eq('school_id', targetSchoolId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.ilike('email', `%${search}%`);
  }

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }

  return NextResponse.json({
    invitations: data ?? [],
    pagination: {
      page,
      limit,
      total: count ?? 0,
      hasMore: typeof count === 'number' ? to + 1 < count : false,
    },
  });
}
