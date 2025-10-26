/**
 * Sign Out Route
 *
 * Handles user sign out and redirects to login page.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  // Sign out the user with scope 'global' to clear all sessions
  await supabase.auth.signOut({ scope: 'global' });

  // Redirect to login page
  return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'));
}
