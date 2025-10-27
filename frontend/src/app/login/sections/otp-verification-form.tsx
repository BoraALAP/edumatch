/**
 * OTP Verification Form Section
 *
 * Purpose: 6-digit OTP code verification interface
 * Features:
 * - InputOTP component for secure code entry
 * - Back button to return to email input
 * - Resend code functionality
 * - Error and success message display
 * - Email address display for confirmation
 *
 * Used in: /app/login/page.tsx
 */

"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowLeft } from "lucide-react";

interface OtpVerificationFormProps {
  email: string;
  otpCode: string;
  onOtpChange: (value: string) => void;
  onVerify: (event: React.FormEvent<HTMLFormElement>) => void;
  onResend: () => void;
  onBack: () => void;
  isVerifying: boolean;
  isResending: boolean;
  error: string | null;
  message: string | null;
}

export function OtpVerificationForm({
  email,
  otpCode,
  onOtpChange,
  onVerify,
  onResend,
  onBack,
  isVerifying,
  isResending,
  error,
  message,
}: OtpVerificationFormProps) {
  return (
    <div className="space-y-4">
      {/* Back button and email display */}
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <form className="space-y-4" onSubmit={onVerify}>
        <div className="space-y-2">
          <Label htmlFor="otp" className="text-center block">
            Enter the 6-digit code sent to your email
          </Label>
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={onOtpChange}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
        </div>

        {(message || error) && (
          <div
            role="status"
            className={`rounded-lg border p-3 text-sm ${
              error
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-primary/30 bg-primary/10 text-primary/90"
            }`}
          >
            {error || message}
          </div>
        )}

        <div className="space-y-2">
          <Button
            type="submit"
            className="w-full"
            disabled={otpCode.length !== 6 || isVerifying}
          >
            {isVerifying ? "Verifying…" : "Verify and sign in"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onResend}
            disabled={isResending}
          >
            {isResending ? "Sending…" : "Resend code"}
          </Button>
        </div>
      </form>
    </div>
  );
}
