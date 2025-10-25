/**
 * Supabase Middleware Configuration
 *
 * This file provides middleware utilities for refreshing Supabase auth sessions.
 * Used in middleware.ts to maintain authentication state.
 *
 * Role-based routing:
 * - Individual users → /dashboard
 * - School admins → /admin (first visit shows onboarding wizard)
 * - School students/teachers → /dashboard (school-scoped)
 * - Protects admin routes from non-admin access
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Get user claims - more efficient than getUser() for middleware
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const user = claims?.sub ? { id: claims.sub } : null;

  // Extract role from JWT custom claims if available (set during auth)
  // This avoids DB queries on every request
  const userRole = claims?.user_role as string | undefined;

  // Define protected routes
  const protectedRoutes = ['/dashboard', '/chat', '/matches', '/profile'];
  const adminRoutes = ['/admin'];
  const isProtectedRoute = protectedRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Define auth routes (shouldn't be accessible when logged in)
  const authRoutes = ['/login', '/signup'];
  const isAuthRoute = authRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Redirect to login if accessing protected route without authentication
  if (!user && (isProtectedRoute || isAdminRoute)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect_to', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Role-based routing for authenticated users
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();

    // Use cached role from JWT claims if available, otherwise query DB
    if (userRole === 'school_admin') {
      url.pathname = '/admin';
    } else if (userRole) {
      // Role is cached in JWT, use it
      url.pathname = '/dashboard';
    } else {
      // Fallback: Query DB if role not in claims (backward compatibility)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.role === 'school_admin') {
        url.pathname = '/admin';
      } else {
        url.pathname = '/dashboard';
      }
    }

    return NextResponse.redirect(url);
  }

  // Protect admin routes - only school_admin and admin can access
  if (user && isAdminRoute) {
    // Use cached role from JWT claims if available, otherwise query DB
    let role = userRole;

    if (!role) {
      // Fallback: Query DB if role not in claims (backward compatibility)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      role = profile?.role;
    }

    if (role !== 'school_admin' && role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
