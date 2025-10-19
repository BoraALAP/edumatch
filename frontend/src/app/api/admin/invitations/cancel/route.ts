import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

const requestSchema = z.object({
  id: z.string().uuid(),
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

  const { id } = parsed.data;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['school_admin', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: invitation, error } = await supabase
    .from('student_invitations')
    .select('id, school_id, status')
    .eq('id', id)
    .maybeSingle();

  if (error || !invitation) {
    return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
  }

  if (profile.role === 'school_admin' && invitation.school_id !== profile.school_id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (invitation.status !== 'pending') {
    return NextResponse.json({ error: 'Only pending invitations can be cancelled' }, { status: 400 });
  }

  const { data: updated, error: updateError } = await supabase
    .from('student_invitations')
    .update({ status: 'cancelled' })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }

  return NextResponse.json({ invitation: updated });
}
