import Link from 'next/link';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import { getBaseUrl } from '@/lib/utils';

import { InviteAcceptForm } from './InviteAcceptForm';

export const dynamic = 'force-dynamic';

interface InvitationResponse {
  invitation: {
    id: string;
    email: string;
    status: string;
    role: string | null;
    expires_at: string;
    isExpired: boolean;
    school: {
      id: string;
      name: string;
      is_active: boolean;
    };
    metadata: Record<string, unknown>;
  };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  // Await params in Next.js 15
  const { token } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const validation = await fetch(`${getBaseUrl()}/api/invite/${token}/validate`, {
    cache: 'no-store',
  });

  if (!validation.ok) {
    let message = 'This invitation could not be found or is no longer valid.';
    try {
      const body = await validation.json();
      message = body?.error ?? message;
    } catch {
      // ignore parse errors
    }

    return (
      <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center pt-30 px-4 py-16">
        <Card className="w-full space-y-6 p-8 text-center">
          <h1 className="text-2xl font-semibold text-foreground">Invitation not available</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button asChild>
            <Link href="/">Return home</Link>
          </Button>
        </Card>
      </main>
    );
  }

  const data = (await validation.json()) as InvitationResponse;
  const invitation = data.invitation;

  const requiresLogin = !user;
  const showAcceptForm = !invitation.isExpired && invitation.status === 'pending' && !requiresLogin;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center pt-30 px-4 py-16">
      <Card className="w-full space-y-6 p-8">
        <header className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">Invitation to join</p>
          <h1 className="text-2xl font-semibold text-foreground">{invitation.school?.name ?? 'EduMatch'}</h1>
        </header>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            This invitation was sent to <span className="font-medium text-foreground">{invitation.email}</span>.
          </p>
          <p>
            Status: <span className="font-medium text-foreground">{invitation.status}</span>
          </p>
          <p>
            Expires at: <span className="font-medium text-foreground">{new Date(invitation.expires_at).toLocaleString()}</span>
          </p>
        </div>

        {invitation.isExpired && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            This invitation has expired. Contact your school administrator to request a new one.
          </div>
        )}

        {requiresLogin && !invitation.isExpired && invitation.status === 'pending' && (
          <div className="space-y-4">
            <div className="rounded-md border border-blue-500/40 bg-blue-500/10 p-4 text-sm text-blue-900">
              Please sign in with the email address that received this invitation to continue.
            </div>
            <Button asChild>
              <Link href={`/login?redirect=/invite/${token}`}>Sign in to accept</Link>
            </Button>
          </div>
        )}

        {showAcceptForm && (
          <InviteAcceptForm token={token} invitedEmail={invitation.email} schoolName={invitation.school?.name ?? 'your school'} />
        )}

        {!showAcceptForm && !requiresLogin && invitation.status !== 'pending' && (
          <div className="rounded-md border border-muted-foreground/40 bg-muted/20 p-4 text-sm text-muted-foreground">
            This invitation has already been {invitation.status}. If you believe this is a mistake, contact the school administrator.
          </div>
        )}
      </Card>
    </main>
  );
}
