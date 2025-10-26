/**
 * Sign Out Route
 *
 * Handles user sign out and redirects to login page.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Sign out the user with scope 'global' to clear all sessions
  await supabase.auth.signOut({ scope: 'global' });

  // Get the origin from the request to construct the redirect URL
  const origin = request.nextUrl.origin;

  // Redirect to login page using the request's origin
  return NextResponse.redirect(new URL('/login', origin));
}
