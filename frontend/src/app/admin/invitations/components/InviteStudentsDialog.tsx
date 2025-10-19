'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

type Props = {
  triggerLabel?: string;
  schoolId?: string;
};

export function InviteStudentsDialog({ triggerLabel = 'Invite Students', schoolId }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [emailsInput, setEmailsInput] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [grade, setGrade] = useState('');
  const [classroom, setClassroom] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ created: number; duplicates: string[] } | null>(null);
  const [isPending, startTransition] = useTransition();

  const resetState = () => {
    setEmailsInput('');
    setRole('student');
    setGrade('');
    setClassroom('');
    setCustomMessage('');
    setError(null);
    setFeedback(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const parseEmails = () =>
    emailsInput
      .split(/[\s,;\n]+/)
      .map((email) => email.trim())
      .filter(Boolean);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setFeedback(null);

    const emails = parseEmails();
    if (emails.length === 0) {
      setError('Enter at least one valid email address.');
      return;
    }

    startTransition(async () => {
      const metadata: Record<string, unknown> = {};
      if (grade) metadata.grade = grade;
      if (classroom) metadata.class = classroom;
      if (customMessage) metadata.message = customMessage;

      const response = await fetch('/api/admin/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emails,
          role,
          metadata: Object.keys(metadata).length ? metadata : undefined,
          schoolId,
        }),
      });

      if (!response.ok) {
        let message = 'Could not send invitations.';
        try {
          const body = await response.json();
          message = body?.error ?? message;
        } catch {
          // ignore parse errors
        }

        setError(message);
        return;
      }

      const result = (await response.json()) as {
        created: Array<{ id: string; email: string }>;
        duplicates?: string[];
      };

      setFeedback({
        created: result.created.length,
        duplicates: result.duplicates ?? [],
      });

      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={isPending}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite students</DialogTitle>
          <DialogDescription>
            Enter one or more email addresses. We&apos;ll send each recipient a unique invitation link that expires in 7 days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Email addresses
              <span className="ml-1 text-xs font-normal text-muted-foreground">(comma, space, or newline separated)</span>
            </label>
            <Textarea
              value={emailsInput}
              onChange={(event) => setEmailsInput(event.target.value)}
              placeholder="student1@example.com&#10;student2@example.com"
              rows={5}
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as 'student' | 'teacher')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Grade (optional)</label>
              <Input value={grade} onChange={(event) => setGrade(event.target.value)} placeholder="e.g. 9th" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Class / Section (optional)</label>
              <Input value={classroom} onChange={(event) => setClassroom(event.target.value)} placeholder="e.g. ESL-1" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground">Custom message (optional)</label>
              <Textarea
                value={customMessage}
                onChange={(event) => setCustomMessage(event.target.value)}
                placeholder="Add context for the invite email"
                rows={3}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {feedback && (
            <div className="space-y-2 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-900">
              <p>
                Sent {feedback.created} invitation{feedback.created === 1 ? '' : 's'} successfully.
              </p>
              {feedback.duplicates.length > 0 && (
                <p>
                  Skipped existing pending invites for:{' '}
                  <span className="font-medium text-foreground">{feedback.duplicates.join(', ')}</span>
                </p>
              )}
            </div>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
              Close
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Sending…' : 'Send invitations'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
