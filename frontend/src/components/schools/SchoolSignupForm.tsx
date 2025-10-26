/**
 * School Signup Form Component
 *
 * Form for school administrators to register their institution.
 * Collects:
 * - School name and admin information
 * - Number of student seats needed
 * - Admin authentication (email/password or social)
 * - Creates school record and admin profile
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../ui/card';

export default function SchoolSignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'auth' | 'school-info'>('auth');
  const [provider, setProvider] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  // Form state
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [maxStudents, setMaxStudents] = useState('50');

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setEmail(user.email ?? '');
        setStep('school-info');
      }
    };

    void checkSession();
  }, [supabase]);

  const handleSocialAuth = async (providerName: 'google' | 'github') => {
    setIsLoading(true);
    setProvider(providerName);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/schools/setup`,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline',
          },
        },
      });

      if (error) {
        showDialog('Authentication Error', error.message);
        setIsLoading(false);
        setProvider(null);
      }
    } catch (error) {
      console.error('Social auth error:', error);
      showDialog('Authentication Failed', 'Failed to authenticate. Please try again.');
      setIsLoading(false);
      setProvider(null);
    } finally {
      // loading state will be reset when user returns or on error above
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
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/schools/setup`,
          data: {
            is_school_admin: true,
          },
        },
      });

      if (error) {
        console.error('OTP send error:', error);
        setOtpError(error.message || 'Failed to send login code. Please try again.');
        return;
      }

      setOtpSent(true);
      setOtpCode('');
      setOtpMessage('We emailed you a six-digit login code. Enter it below to continue.');
    } catch (error) {
      console.error('Unexpected OTP send error:', error);
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
        console.error('OTP verify error:', error);
        setOtpError('Invalid or expired code. Please request a new one.');
        return;
      }

      await supabase.auth.updateUser({
        data: { is_school_admin: true },
      });

      setOtpMessage('Success! Continue below to finish setting up your school.');
      setStep('school-info');
      router.refresh();
    } catch (error) {
      console.error('Unexpected OTP verify error:', error);
      setOtpError('Failed to verify the code. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleSchoolInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!schoolName || !adminName || !maxStudents) {
      showDialog('Missing Information', 'Please fill in all fields');
      return;
    }

    const seats = parseInt(maxStudents);
    if (isNaN(seats) || seats < 1) {
      showDialog('Invalid Input', 'Please enter a valid number of student seats');
      return;
    }

    setIsLoading(true);
    try {
      // Get current user and session
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.error('Auth error:', authError);
        showDialog(
          'Session Error',
          'Session expired or email not confirmed.\n\nIf you signed up with email/password, please check your email for the confirmation link first.\n\nIf you already confirmed, try signing in again at /login and then visit /schools/setup to complete registration.'
        );
        setIsLoading(false);
        return;
      }

      // Call API to create school and admin profile
      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolName,
          adminName,
          adminEmail: user.email,
          maxStudents: seats,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register school');
      }

      // Success! Redirect to admin dashboard
      router.push('/admin');
    } catch (error) {
      console.error('School registration error:', error);
      showDialog(
        'Registration Failed',
        error instanceof Error ? error.message : 'Failed to register school. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: Authentication
  if (step === 'auth') {
    return (
      <>
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Create Admin Account
            </h2>
            <p className="text-sm text-muted-foreground">
              First, set up your administrator account
            </p>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button
              type="button"
              onClick={() => handleSocialAuth('google')}
              disabled={isLoading}
              className="w-full"
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

            <Button
              type="button"
              onClick={() => handleSocialAuth('github')}
              disabled={isLoading}
              className="w-full"
              variant="outline"
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
            </Button>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" aria-hidden="true" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-3 text-muted-foreground">or sign up with email</span>
            </div>
          </div>

          {/* Email OTP Auth */}
          {!otpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Work email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@yourschool.edu"
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
            <div className="space-y-4">
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

              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-code" className="text-center block">
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
                    {isVerifyingOtp ? 'Verifying…' : 'Verify and continue'}
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
        </div>

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
      </>
    );
  }

  // Step 2: School Information
  return (
    <>
      <form onSubmit={handleSchoolInfoSubmit} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            School Information
          </h2>
          <p className="text-sm text-muted-foreground">
            Tell us about your institution
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="schoolName" className="block text-sm font-medium text-foreground mb-1">
              School Name <span className="text-destructive">*</span>
            </label>
            <input
              id="schoolName"
              type="text"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g., Lincoln High School"
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>

          <div>
            <label htmlFor="adminName" className="block text-sm font-medium text-foreground mb-1">
              Your Full Name <span className="text-destructive">*</span>
            </label>
            <input
              id="adminName"
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="e.g., Jane Smith"
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
          </div>

          <div>
            <label htmlFor="maxStudents" className="block text-sm font-medium text-foreground mb-1">
              Number of Student Seats <span className="text-destructive">*</span>
            </label>
            <input
              id="maxStudents"
              type="number"
              value={maxStudents}
              onChange={(e) => setMaxStudents(e.target.value)}
              placeholder="50"
              min="1"
              max="10000"
              required
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              How many students will use EduMatch at your school?
            </p>
          </div>

          <Card className="p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-3">
              <div className="text-2xl">💡</div>
              <div className="flex-1 text-sm">
                <p className="font-medium text-foreground mb-1">Free During Beta</p>
                <p className="text-muted-foreground">
                  All schools get full access during our beta period. No credit card required.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex gap-3">
          <Button
            type="button"
            onClick={() => setStep('auth')}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            Back
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? 'Setting Up School...' : 'Complete Registration'}
          </Button>
        </div>
      </form>

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
    </>
  );
}
