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

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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

export default function SchoolSignupForm() {
  const router = useRouter();
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'auth' | 'school-info'>('auth');
  const [authMethod, setAuthMethod] = useState<'email' | 'social'>('social');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [maxStudents, setMaxStudents] = useState('50');

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/schools/setup`,
        },
      });

      if (error) {
        showDialog('Authentication Error', error.message);
      }
    } catch (error) {
      console.error('Social auth error:', error);
      showDialog('Authentication Failed', 'Failed to authenticate. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showDialog('Missing Information', 'Please enter email and password');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/schools/setup`,
          data: {
            is_school_admin: true, // Mark this as school admin signup
          },
        },
      });

      if (error) {
        showDialog('Signup Error', error.message);
        setIsLoading(false);
        return;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.session) {
          // User is logged in immediately (email confirmation disabled)
          setStep('school-info');
        } else {
          // Email confirmation required - show message and stay on auth step
          showDialog(
            '📧 Confirmation Email Sent!',
            'Please check your email inbox and click the confirmation link to verify your email address.\n\nAfter confirming, you\'ll be redirected back here to complete your school registration.'
          );
          // Don't move to next step - user needs to confirm email first
        }
      }
    } catch (error) {
      console.error('Email signup error:', error);
      showDialog('Signup Failed', 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
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

          {/* Auth Method Toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setAuthMethod('social')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMethod === 'social'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Social Login
            </button>
            <button
              onClick={() => setAuthMethod('email')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                authMethod === 'email'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Email & Password
            </button>
          </div>

          {authMethod === 'social' ? (
            <div className="space-y-3">
              <Button
                type="button"
                onClick={() => handleSocialAuth('google')}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
              </Button>

              <Button
                type="button"
                onClick={() => handleSocialAuth('github')}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                Continue with GitHub
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">
                    Quick and secure with OAuth
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yourschool.edu"
                  required
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Must be at least 6 characters
                </p>
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? 'Creating Account...' : 'Create Account & Continue'}
              </Button>
            </form>
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
