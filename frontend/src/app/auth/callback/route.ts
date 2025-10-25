/**
 * Auth Callback Route
 *
 * Handles the OAuth callback from authentication providers and email confirmations.
 * This route exchanges the auth code for a session using PKCE flow.
 *
 * The PKCE (Proof Key for Code Exchange) flow works as follows:
 * 1. Client generates code_verifier and code_challenge during signup/login
 * 2. Supabase stores the code_challenge and sends confirmation email with auth code
 * 3. This callback receives the code and exchanges it for a session
 * 4. The code_verifier is automatically retrieved from browser cookies
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();

    // Create Supabase client with proper cookie handling for PKCE flow
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (error) {
              // Handle cookie setting errors
              console.error('Error setting cookies:', error);
            }
          },
        },
      }
    );

    // Exchange the code for a session
    // This will automatically use the code_verifier from cookies
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      // Redirect to error page with message
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    // Successful authentication - redirect to the next page
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code provided - redirect to home
  return NextResponse.redirect(`${origin}/`);
}
