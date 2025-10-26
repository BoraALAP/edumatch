/**
 * Directory Client Component
 *
 * Client-side component for managing school directory with tabs for members and invitations.
 * Features tabbed interface to switch between viewing members and pending invitations.
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StudentRosterClient from './components/StudentRosterClient';
import { InviteStudentsDialog } from './components/InviteStudentsDialog';
import { InvitationRowActions } from './components/InvitationRowActions';

type School = {
  name: string;
  seats_total: number;
  seats_regular_used: number;
  seats_graduate_used: number;
};

type Member = {
  id: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
  seat_type: string | null;
  onboarding_completed: boolean;
  last_active_at: string | null;
  created_at: string;
  proficiency_level: string | null;
};

type Invitation = {
  id: string;
  email: string;
  status: string;
  role: string | null;
  created_at: string;
  expires_at: string;
  invited_by: string;
  accepted_at: string | null;
};

interface DirectoryClientProps {
  school?: School;
  members: Member[];
  invitations: Invitation[];
  schoolId: string;
}

export default function DirectoryClient({ school, members, invitations, schoolId }: DirectoryClientProps) {
  const [activeTab, setActiveTab] = useState('members');

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Directory</h2>
          <p className="text-sm text-muted-foreground">
            Manage school members, track seats, and send invitations.
          </p>
        </div>
        <InviteStudentsDialog schoolId={schoolId} />
      </div>

      {/* Seat Tracking Card */}
      {school && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground">{school.name}</h3>
              <p className="text-sm text-muted-foreground">Seat Allocation</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-foreground">
                {school.seats_regular_used + school.seats_graduate_used} / {school.seats_total}
              </div>
              <p className="text-sm text-muted-foreground">
                {school.seats_total - (school.seats_regular_used + school.seats_graduate_used)} remaining
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-primary/10 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Regular Seats</p>
              <p className="text-xl font-semibold text-foreground">{school.seats_regular_used}</p>
            </div>
            <div className="bg-secondary/10 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">Graduate Seats</p>
              <p className="text-xl font-semibold text-foreground">{school.seats_graduate_used}</p>
            </div>
          </div>
          {/* Capacity warning */}
          {(school.seats_regular_used + school.seats_graduate_used) / school.seats_total >= 0.8 && (
            <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                ⚠️ {(school.seats_regular_used + school.seats_graduate_used) / school.seats_total >= 0.95
                  ? 'Critical: Nearly at capacity!'
                  : 'Warning: 80% capacity reached'}
              </p>
            </div>
          )}
        </Card>
      )}

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="members">
            Members
            <Badge variant="secondary" className="ml-2">
              {members.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="invitations">
            Pending Invitations
            <Badge variant="secondary" className="ml-2">
              {pendingInvitations.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <StudentRosterClient students={members} />
        </TabsContent>

        {/* Invitations Tab */}
        <TabsContent value="invitations" className="mt-6">
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sent</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {invitations.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                        No invitations found. Click &quot;Invite Members&quot; to send your first invitations.
                      </td>
                    </tr>
                  )}
                  {invitations.map((invite) => (
                    <tr key={invite.id}>
                      <td className="px-4 py-3 font-medium text-foreground">{invite.email}</td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">{invite.role ?? 'student'}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            invite.status === 'pending'
                              ? 'secondary'
                              : invite.status === 'accepted'
                                ? 'default'
                                : 'outline'
                          }
                        >
                          {invite.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {invite.created_at ? new Date(invite.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {invite.status === 'accepted'
                          ? invite.accepted_at
                            ? `Accepted ${new Date(invite.accepted_at).toLocaleString()}`
                            : 'Accepted'
                          : new Date(invite.expires_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <InvitationRowActions invitationId={invite.id} status={invite.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
