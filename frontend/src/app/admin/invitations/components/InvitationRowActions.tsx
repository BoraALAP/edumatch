'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';

type InvitationRowActionsProps = {
  invitationId: string;
  status: string;
};

export function InvitationRowActions({ invitationId, status }: InvitationRowActionsProps) {
  const router = useRouter();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isProcessing, startTransition] = useTransition();

  const isPending = status === 'pending';

  const runAction = (action: 'resend' | 'cancel') => {
    setFeedback(null);

    startTransition(async () => {
      const endpoint =
        action === 'resend'
          ? '/api/admin/invitations/resend'
          : '/api/admin/invitations/cancel';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invitationId }),
      });

      if (!response.ok) {
        let message = `Unable to ${action} invitation.`;
        try {
          const body = await response.json();
          message = body?.error ?? message;
        } catch {
          // ignore parse error
        }
        setFeedback({ type: 'error', message });
        return;
      }

      router.refresh();
      setFeedback({
        type: 'success',
        message: action === 'resend' ? 'Invitation resent.' : 'Invitation cancelled.',
      });
    });
  };

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!isPending || isProcessing}
          onClick={() => runAction('resend')}
        >
          Resend
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={!isPending || isProcessing}
          onClick={() => runAction('cancel')}
        >
          Cancel
        </Button>
      </div>
      {feedback && (
        <p
          className={`text-xs ${
            feedback.type === 'success' ? 'text-green-600' : 'text-destructive'
          }`}
        >
          {feedback.message}
        </p>
      )}
      {!isPending && (
        <p className="text-xs text-muted-foreground">Actions available for pending invitations only.</p>
      )}
    </div>
  );
}
