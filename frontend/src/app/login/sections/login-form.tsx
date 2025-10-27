/**
 * Login Form Component
 *
 * Purpose: Client-side authentication form with OTP and social login
 * Features:
 * - Email-based OTP authentication (primary method)
 * - Social authentication (Google)
 * - Two-step flow: email input → OTP verification
 * - Toast notifications for user feedback
 * - Responsive design with shadcn UI components
 *
 * Used in: /app/login/page.tsx
 */

"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { SocialLoginButtons } from "./social-login-buttons";
import { EmailOtpForm } from "./email-otp-form";
import { OtpVerificationForm } from "./otp-verification-form";

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const router = useRouter();
  const supabase = createClient();
  const redirectParam = searchParams.get("redirect_to");
  const redirectTo =
    redirectParam && redirectParam.startsWith("/")
      ? redirectParam
      : "/dashboard";

  const handleSocialLogin = async (providerName: "google" | "github") => {
    setIsLoading(true);
    setProvider(providerName);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: providerName,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    });

    if (error) {
      console.error("Error logging in:", error);
      toast.error("Login Failed", {
        description: `Failed to log in with ${providerName}. Please try again.`,
      });
      setIsLoading(false);
      setProvider(null);
    }
  };

  const handleSendOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      setOtpError("Please enter your email address.");
      return;
    }

    setIsSendingOtp(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        console.error("Error sending OTP:", error);
        setOtpError(
          error.message || "Failed to send login code. Please try again.",
        );
        toast.error("Failed to send code", {
          description: error.message || "Please try again.",
        });
        return;
      }

      setOtpSent(true);
      setOtpCode("");
      setOtpMessage(
        "We emailed you a six-digit login code. Enter it below to continue.",
      );
      toast.success("Code sent!", {
        description: "Check your email for the 6-digit login code.",
      });
    } catch (err) {
      console.error("Unexpected OTP send error:", err);
      setOtpError("Something went wrong. Please try again.");
      toast.error("Error", {
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !otpCode) {
      setOtpError("Enter both your email and the code we sent.");
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });

      if (error) {
        console.error("Error verifying OTP:", error);
        setOtpError("Invalid or expired code. Please request a new one.");
        toast.error("Invalid code", {
          description:
            "The code is invalid or expired. Please request a new one.",
        });
        return;
      }

      setOtpMessage("Success! Redirecting you now...");
      toast.success("Success!", { description: "Redirecting you now..." });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error("Unexpected OTP verify error:", err);
      setOtpError("Failed to verify the code. Please try again.");
      toast.error("Verification failed", {
        description: "Failed to verify the code. Please try again.",
      });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError(null);
    setOtpMessage(null);
    setIsSendingOtp(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect_to=${encodeURIComponent(redirectTo)}`,
        },
      });

      if (error) {
        console.error("Error resending OTP:", error);
        toast.error("Failed to resend code", {
          description: error.message || "Please try again.",
        });
        return;
      }

      toast.success("Code sent!", {
        description: "A new code has been sent to your email.",
      });
      setOtpMessage("A new code has been sent to your email.");
    } catch (err) {
      console.error("Unexpected OTP resend error:", err);
      toast.error("Error", {
        description: "Failed to resend code. Please try again.",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleBack = () => {
    setOtpSent(false);
    setOtpCode("");
    setOtpError(null);
    setOtpMessage(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        {/* Back to Home Button */}
        <div className="flex justify-start">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to EduMatch
          </h1>
          <p className="text-muted-foreground">
            Sign in to start practicing your English conversation skills
          </p>
        </div>

        {/* Error Message from URL */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4">
            <p className="text-sm text-destructive">
              {error === "auth_callback_error"
                ? "Authentication failed. Please try again."
                : "An error occurred. Please try again."}
            </p>
          </div>
        )}

        {/* Email OTP Login (Primary Method) */}
        {!otpSent ? (
          <EmailOtpForm
            email={email}
            onEmailChange={setEmail}
            onSubmit={handleSendOtp}
            isLoading={isSendingOtp}
            error={otpError}
          />
        ) : (
          <OtpVerificationForm
            email={email}
            otpCode={otpCode}
            onOtpChange={setOtpCode}
            onVerify={handleVerifyOtp}
            onResend={handleResendOtp}
            onBack={handleBack}
            isVerifying={isVerifyingOtp}
            isResending={isSendingOtp}
            error={otpError}
            message={otpMessage}
          />
        )}

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span
              className="w-full border-t border-border"
              aria-hidden="true"
            />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-3 text-muted-foreground">
              or sign in with
            </span>
          </div>
        </div>

        {/* Social Login Buttons (Secondary Method) */}
        <SocialLoginButtons
          onGoogleLogin={() => handleSocialLogin("google")}
          isLoading={isLoading}
          provider={provider}
        />

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </Card>
    </div>
  );
}
