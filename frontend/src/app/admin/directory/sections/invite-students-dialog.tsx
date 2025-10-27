/**
 * Invite Members Dialog Component
 *
 * Dialog for inviting students, teachers, and school admins.
 * Supports batch email invitations with optional metadata.
 * Uses field components for consistent form styling.
 */

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
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from '@/components/ui/field';

type Props = {
  triggerLabel?: string;
  schoolId?: string;
};

export function InviteStudentsDialog({ triggerLabel = 'Invite Members', schoolId }: Props) {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [emailsInput, setEmailsInput] = useState('');
  const [role, setRole] = useState<'student' | 'teacher' | 'school_admin'>('student');
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

  const getRoleDescription = () => {
    switch (role) {
      case 'school_admin':
        return 'School admins can manage all school settings, invite members, and view reports.';
      case 'teacher':
        return 'Teachers can view their students and monitor practice sessions.';
      case 'student':
        return 'Students can practice conversations and match with peers.';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={isPending}>{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Invite students, teachers, or school admins. Each person will receive a unique invitation link that expires in 7 days.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="emails">
                Email addresses
              </FieldLabel>
              <FieldDescription>
                Enter one or more email addresses (comma, space, or newline separated)
              </FieldDescription>
              <Textarea
                id="emails"
                value={emailsInput}
                onChange={(event) => setEmailsInput(event.target.value)}
                placeholder="person1@example.com&#10;person2@example.com"
                rows={5}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="role">Role</FieldLabel>
              <FieldDescription>{getRoleDescription()}</FieldDescription>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as 'student' | 'teacher' | 'school_admin')}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="school_admin">School Admin</option>
              </select>
            </Field>
          </FieldGroup>

          {/* Optional metadata - only show for students and teachers */}
          {role !== 'school_admin' && (
            <FieldGroup>
              <div className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="grade">Grade (optional)</FieldLabel>
                  <FieldDescription>e.g., 9th, 10th, 11th</FieldDescription>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(event) => setGrade(event.target.value)}
                    placeholder="e.g. 9th"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="classroom">Class / Section (optional)</FieldLabel>
                  <FieldDescription>e.g., ESL-1, Room 203</FieldDescription>
                  <Input
                    id="classroom"
                    value={classroom}
                    onChange={(event) => setClassroom(event.target.value)}
                    placeholder="e.g. ESL-1"
                  />
                </Field>
              </div>
            </FieldGroup>
          )}

          <Field>
            <FieldLabel htmlFor="message">Custom message (optional)</FieldLabel>
            <FieldDescription>
              Add a personal note that will be included in the invitation email
            </FieldDescription>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(event) => setCustomMessage(event.target.value)}
              placeholder="Welcome to our school! We're excited to have you join EduMatch..."
              rows={3}
            />
          </Field>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {feedback && (
            <div className="space-y-2 rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-900 dark:text-green-100">
              <p className="font-medium">
                ✓ Sent {feedback.created} invitation{feedback.created === 1 ? '' : 's'} successfully.
              </p>
              {feedback.duplicates.length > 0 && (
                <p>
                  Skipped existing pending invites for:{' '}
                  <span className="font-medium">{feedback.duplicates.join(', ')}</span>
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
