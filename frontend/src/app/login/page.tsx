/**
 * Login Page
 *
 * Purpose: User authentication page with multiple sign-in options
 * Features:
 * - Social authentication (Google, GitHub)
 * - Email-based OTP authentication
 * - Two-step flow: email input → OTP verification
 * - Uses InputOTP component for secure 6-digit code entry
 * - Responsive design with shadcn UI components
 */

'use client';

import { Suspense, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft } from 'lucide-react';

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Alert dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const router = useRouter();
  const supabase = createClient();
  const redirectParam = searchParams.get('redirect_to');
  const redirectTo = redirectParam && redirectParam.startsWith('/') ? redirectParam : '/dashboard';

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  const handleSocialLogin = async (providerName: 'google' | 'github') => {
    setIsLoading(true);
    setProvider(providerName);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: providerName,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          // Force account selection for Google and GitHub
          prompt: 'select_account',
          // For Google, this ensures user sees the account picker
          access_type: 'offline',
        },
      },
    });

    if (error) {
      console.error('Error logging in:', error);
      showDialog('Login Failed', `Failed to log in with ${providerName}. Please try again.`);
      setIsLoading(false);
      setProvider(null);
    }
  };

  const handleSendOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email) {
      setOtpError('Please enter your email address.');
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
        console.error('Error sending OTP:', error);
        setOtpError(error.message || 'Failed to send login code. Please try again.');
        return;
      }

      setOtpSent(true);
      setOtpCode('');
      setOtpMessage('We emailed you a six-digit login code. Enter it below to continue.');
    } catch (err) {
      console.error('Unexpected OTP send error:', err);
      setOtpError('Something went wrong. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email || !otpCode) {
      setOtpError('Enter both your email and the code we sent.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);
    setOtpMessage(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email',
      });

      if (error) {
        console.error('Error verifying OTP:', error);
        setOtpError('Invalid or expired code. Please request a new one.');
        return;
      }

      setOtpMessage('Success! Redirecting you now...');
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      console.error('Unexpected OTP verify error:', err);
      setOtpError('Failed to verify the code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Welcome to EduMatch
          </h1>
          <p className="text-muted-foreground">
            Sign in to start practicing your English conversation skills
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/40 rounded-lg p-4">
            <p className="text-sm text-destructive-foreground">
              {error === 'auth_callback_error'
                ? 'Authentication failed. Please try again.'
                : 'An error occurred. Please try again.'}
            </p>
          </div>
        )}

        {/* Social Login Buttons */}
        <div className="space-y-3 flex flex-col gap-2">
          <Button
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}

            variant="outline"
          >
            {isLoading && provider === 'google' ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Connecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </span>
            )}
          </Button>

          {/* <Button
            onClick={() => handleSocialLogin('github')}
            disabled={isLoading}

          >
            {isLoading && provider === 'github' ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Connecting...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </span>
            )}
          </Button> */}
        </div>

        {/* Divider */}
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" aria-hidden="true" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-3 text-muted-foreground">or sign in with email</span>
          </div>
        </div>

        {/* Email OTP Login */}
        {!otpSent ? (
          // Step 1: Email Input
          <form className="space-y-4" onSubmit={handleSendOtp}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                disabled={isSendingOtp}
              />
            </div>
            {otpError && (
              <div
                role="alert"
                className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {otpError}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isSendingOtp}>
              {isSendingOtp ? 'Sending code…' : 'Send login code'}
            </Button>
          </form>
        ) : (
          // Step 2: OTP Verification
          <div className="space-y-4">
            {/* Back button and email display */}
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setOtpSent(false);
                  setOtpCode('');
                  setOtpError(null);
                  setOtpMessage(null);
                }}

              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <p className="text-sm text-muted-foreground">{email}</p>
            </div>

            <form className="space-y-4" onSubmit={handleVerifyOtp}>
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-center block">
                  Enter the 6-digit code sent to your email
                </Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(value) => setOtpCode(value)}
                  >
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

              {(otpMessage || otpError) && (
                <div
                  role="status"
                  className={`rounded-lg border p-3 text-sm ${otpError
                    ? 'border-destructive/40 bg-destructive/10 text-destructive'
                    : 'border-primary/30 bg-primary/10 text-primary/90'
                    }`}
                >
                  {otpError || otpMessage}
                </div>
              )}

              <div className="space-y-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={otpCode.length !== 6 || isVerifyingOtp}
                >
                  {isVerifyingOtp ? 'Verifying…' : 'Verify and sign in'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOtpError(null);
                    setOtpMessage(null);
                    handleSendOtp(new Event('submit') as unknown as React.FormEvent<HTMLFormElement>);
                  }}
                  disabled={isSendingOtp}
                >
                  {isSendingOtp ? 'Sending…' : 'Resend code'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </Card>

      {/* Alert Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </Card>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
