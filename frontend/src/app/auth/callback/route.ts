/**
 * Auth Callback Route
 *
 * Handles the OAuth callback from social authentication providers.
 * This route exchanges the code for a session and redirects the user.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get('redirect_to') || '/dashboard';

  if (code) {
    const supabase = await createClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      // Redirect to login with error
      return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
    }
  }

  // Redirect to the app
  return NextResponse.redirect(`${origin}${redirectTo}`);
}
