/**
 * Login Page
 *
 * Purpose: User authentication page with server-side session check
 * Features:
 * - Server component for auth validation
 * - Redirects authenticated users to dashboard
 * - Renders client LoginForm component for unauthenticated users
 */

import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { LoginForm } from "./sections/login-form";

export default async function LoginPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If already authenticated, redirect to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 text-center">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
