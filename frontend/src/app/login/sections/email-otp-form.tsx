/**
 * Email OTP Form Section
 *
 * Purpose: Email input form for sending one-time password
 * Features:
 * - Email input with validation
 * - Error message display
 * - Loading state for OTP sending
 * - Accessible form with proper labels
 *
 * Used in: /app/login/page.tsx
 */

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EmailOtpFormProps {
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  error: string | null;
}

export function EmailOtpForm({
  email,
  onEmailChange,
  onSubmit,
  isLoading,
  error,
}: EmailOtpFormProps) {
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="space-y-2">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
          disabled={isLoading}
        />
      </div>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Sending code…" : "Send login code"}
      </Button>
    </form>
  );
}
