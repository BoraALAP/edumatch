'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { CheckCircle2, TriangleAlert } from 'lucide-react';

interface InviteAcceptFormProps {
  token: string;
  invitedEmail: string;
  schoolName: string;
}

export function InviteAcceptForm({ token, invitedEmail, schoolName }: InviteAcceptFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/invite/${token}/accept`, {
        method: 'POST',
      });

      if (response.ok) {
        setSuccess(true);
        router.refresh();
        return;
      }

      let message = 'Something went wrong while accepting the invitation.';
      try {
        const body = await response.json();
        message = body?.error ?? message;
      } catch {
        // ignore parsing issues
      }
      setError(message);
    });
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-md border border-green-500/60 bg-green-500/10 p-4 text-sm text-green-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Invitation accepted!</p>
            <p className="mt-1 text-sm">
              You now have access to <strong>{schoolName}</strong>. Continue to the dashboard to start practicing.
            </p>
          </div>
        </div>
        <Button onClick={() => router.push('/dashboard')}>Go to dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Unable to accept invitation</p>
            <p className="mt-1 text-sm">{error}</p>
          </div>
        </div>
      )}
      <Button onClick={handleAccept} disabled={isPending} className="w-full md:w-auto">
        {isPending ? 'Accepting...' : `Accept invitation as ${invitedEmail}`}
      </Button>
    </div>
  );
}
