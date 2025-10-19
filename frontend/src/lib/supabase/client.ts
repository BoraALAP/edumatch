/**
 * Supabase Client-Side Configuration
 *
 * This file provides the Supabase client for use in client components.
 * Use this in components marked with 'use client' directive.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
