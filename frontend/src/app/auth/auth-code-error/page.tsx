/**
 * Auth Code Error Page
 *
 * Displayed when email confirmation fails or auth callback encounters an error.
 * Provides helpful instructions for users to retry the authentication process.
 */

'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function AuthCodeErrorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full p-8 space-y-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Authentication Failed
            </h1>
            <p className="text-muted-foreground">
              We couldn&apos;t verify your email confirmation link. This might happen if:
            </p>
          </div>

          <ul className="text-sm text-muted-foreground text-left space-y-2 w-full">
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>The confirmation link has expired (links are valid for 24 hours)</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>The link has already been used</span>
            </li>
            <li className="flex gap-2">
              <span className="text-primary">•</span>
              <span>The link was modified or corrupted</span>
            </li>
          </ul>

          <div className="w-full space-y-3 pt-4">
            <Button
              onClick={() => router.push('/schools/signup')}
              className="w-full"
            >
              Try Signing Up Again
            </Button>

            <Button
              onClick={() => router.push('/login')}
              variant="outline"
              className="w-full"
            >
              Go to Login
            </Button>

            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              className="w-full"
            >
              Back to Home
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-4">
            Need help? Contact support at{' '}
            <a href="mailto:support@edumatch.com" className="text-primary hover:underline">
              support@edumatch.com
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
