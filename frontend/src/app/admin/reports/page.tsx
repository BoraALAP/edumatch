import { redirect } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, school_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['school_admin', 'admin'].includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <Card className="border-dashed p-10 text-center text-muted-foreground">
      <h2 className="text-xl font-semibold text-foreground">Reports & Analytics</h2>
      <p className="mt-2 text-sm">
        Detailed usage analytics and AI insights will appear here. This page sets the scaffold for upcoming reporting features.
      </p>
    </Card>
  );
}
