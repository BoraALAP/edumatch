import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { AdminNavLink } from './nav-link';

const navigation = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/students', label: 'Students' },
  { href: '/admin/invitations', label: 'Invitations' },
  { href: '/admin/settings', label: 'Settings' },
  { href: '/admin/reports', label: 'Reports' },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
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

  const { data: school } = profile.school_id
    ? await supabase
      .from('schools')
      .select('id, name')
      .eq('id', profile.school_id)
      .maybeSingle()
    : { data: null };

  const hasSchoolContext = Boolean(profile.school_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-background text-foreground">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">School Administration</p>
            <h1 className="text-2xl font-semibold text-foreground">
              {school?.name ?? 'EduMatch Admin'}
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <AdminNavLink key={item.href} href={item.href}>
                {item.label}
              </AdminNavLink>
            ))}
          </nav>
        </div>
      </header>

      {!hasSchoolContext && (
        <div className="mx-auto max-w-7xl px-6 pt-4">
          <div className="rounded-md border border-amber-400/60 bg-amber-500/15 p-4 text-sm text-amber-100">
            Assign a school to your admin profile to unlock full functionality.
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
