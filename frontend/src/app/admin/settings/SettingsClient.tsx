/**
 * Settings Client Component
 *
 * Client-side settings panel for school admins.
 * Features:
 * - Toggle global matching (allow students to partner with individuals)
 * - Edit school information (name, admin details)
 * - Configure invitation policies (domains, default roles)
 * - Student visibility controls
 */

'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface School {
  id: string;
  name: string;
  admin_email: string | null;
  admin_name: string | null;
  is_active: boolean;
  max_students: number | null;
  allow_global_matching: boolean;
  invitation_settings: {
    require_approval?: boolean;
    auto_accept_domain?: boolean;
    allowed_domains?: string[];
    default_student_settings?: Record<string, unknown>;
  } | null;
}

interface SettingsClientProps {
  school: School;
}

export default function SettingsClient({ school }: SettingsClientProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [isEditingInvitation, setIsEditingInvitation] = useState(false);
  const [isSavingInvitation, setIsSavingInvitation] = useState(false);
  const [isTogglingMatching, setIsTogglingMatching] = useState(false);

  // School info form state
  const [schoolName, setSchoolName] = useState(school.name);
  const [adminName, setAdminName] = useState(school.admin_name || '');
  const [adminEmail, setAdminEmail] = useState(school.admin_email || '');

  // Invitation settings state
  const invitationSettings = school.invitation_settings || {};
  const [requireApproval, setRequireApproval] = useState(invitationSettings.require_approval || false);
  const [autoAcceptDomain, setAutoAcceptDomain] = useState(invitationSettings.auto_accept_domain || false);
  const [allowedDomains, setAllowedDomains] = useState<string[]>(invitationSettings.allowed_domains || []);
  const [newDomain, setNewDomain] = useState('');

  // Global matching state
  const [allowGlobalMatching, setAllowGlobalMatching] = useState(school.allow_global_matching);

  const handleSaveSchoolInfo = async () => {
    if (!schoolName.trim()) {
      alert('School name is required');
      return;
    }

    setIsSavingInfo(true);

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          name: schoolName.trim(),
          admin_name: adminName.trim() || null,
          admin_email: adminEmail.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', school.id);

      if (error) throw error;

      alert('School information updated successfully!');
      setIsEditingInfo(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating school info:', error);
      alert(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleCancelInfo = () => {
    setSchoolName(school.name);
    setAdminName(school.admin_name || '');
    setAdminEmail(school.admin_email || '');
    setIsEditingInfo(false);
  };

  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;

    // Basic domain validation
    if (!domain.includes('.') || domain.includes('@')) {
      alert('Please enter a valid domain (e.g., example.com)');
      return;
    }

    if (allowedDomains.includes(domain)) {
      alert('Domain already added');
      return;
    }

    setAllowedDomains([...allowedDomains, domain]);
    setNewDomain('');
  };

  const handleRemoveDomain = (domain: string) => {
    setAllowedDomains(allowedDomains.filter(d => d !== domain));
  };

  const handleSaveInvitationSettings = async () => {
    setIsSavingInvitation(true);

    try {
      const newSettings = {
        require_approval: requireApproval,
        auto_accept_domain: autoAcceptDomain,
        allowed_domains: allowedDomains,
        default_student_settings: invitationSettings.default_student_settings || {},
      };

      const { error } = await supabase
        .from('schools')
        .update({
          invitation_settings: newSettings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', school.id);

      if (error) throw error;

      alert('Invitation settings updated successfully!');
      setIsEditingInvitation(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating invitation settings:', error);
      alert(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSavingInvitation(false);
    }
  };

  const handleCancelInvitation = () => {
    setRequireApproval(invitationSettings.require_approval || false);
    setAutoAcceptDomain(invitationSettings.auto_accept_domain || false);
    setAllowedDomains(invitationSettings.allowed_domains || []);
    setNewDomain('');
    setIsEditingInvitation(false);
  };

  const handleToggleGlobalMatching = async () => {
    const newValue = !allowGlobalMatching;

    if (newValue) {
      const confirmed = confirm(
        'Enable global matching?\n\n' +
        'This will allow your students to be matched with individual users from the global pool. ' +
        'Students will remain invisible in public searches but can be paired for practice sessions.\n\n' +
        'Your students will need to opt-in individually from their profile settings.'
      );
      if (!confirmed) return;
    }

    setIsTogglingMatching(true);

    try {
      const { error } = await supabase
        .from('schools')
        .update({
          allow_global_matching: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', school.id);

      if (error) throw error;

      setAllowGlobalMatching(newValue);
      alert(`Global matching ${newValue ? 'enabled' : 'disabled'} successfully!`);
      router.refresh();
    } catch (error) {
      console.error('Error toggling global matching:', error);
      alert(`Failed to update: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsTogglingMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Matching Toggle */}
      <Card className="p-6 border-primary/20">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Global Matching</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Allow your students to practice with individual learners from the global pool.
              Students remain invisible in public searches and must opt-in individually.
            </p>
            {allowGlobalMatching && (
              <p className="text-sm text-primary mt-2">
                ℹ️ Students can enable this in their Profile Settings
              </p>
            )}
          </div>
          <div className="ml-4 flex items-center gap-3">
            <Badge variant={allowGlobalMatching ? 'default' : 'outline'}>
              {allowGlobalMatching ? 'Enabled' : 'Disabled'}
            </Badge>
            <Button
              onClick={handleToggleGlobalMatching}
              disabled={isTogglingMatching}
              variant={allowGlobalMatching ? 'outline' : 'default'}
            >
              {isTogglingMatching
                ? 'Updating...'
                : allowGlobalMatching
                  ? 'Disable'
                  : 'Enable'}
            </Button>
          </div>
        </div>
      </Card>

      {/* School Information */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">School Information</h3>
          {!isEditingInfo && (
            <Button onClick={() => setIsEditingInfo(true)} variant="outline">
              Edit
            </Button>
          )}
        </div>

        {!isEditingInfo ? (
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">School Name</dt>
              <dd className="text-base text-foreground">{school.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd className="text-base text-foreground">
                <Badge variant={school.is_active ? 'secondary' : 'outline'}>
                  {school.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Primary Admin</dt>
              <dd className="text-base text-foreground">{school.admin_name || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Admin Email</dt>
              <dd className="text-base text-foreground">{school.admin_email || 'Not set'}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Student Capacity</dt>
              <dd className="text-base text-foreground">{school.max_students || 'Unlimited'}</dd>
            </div>
          </dl>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                School Name *
              </label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Enter school name"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Primary Admin Name
              </label>
              <input
                type="text"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Enter admin name"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@school.edu"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveSchoolInfo} disabled={isSavingInfo}>
                {isSavingInfo ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancelInfo} disabled={isSavingInfo}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Invitation Policy */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Invitation Policy</h3>
          {!isEditingInvitation && (
            <Button onClick={() => setIsEditingInvitation(true)} variant="outline">
              Edit
            </Button>
          )}
        </div>

        {!isEditingInvitation ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">Require approval</p>
                <p className="text-sm text-muted-foreground">
                  Invitations require manual approval before users can join.
                </p>
              </div>
              <Badge variant={invitationSettings.require_approval ? 'secondary' : 'outline'}>
                {invitationSettings.require_approval ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">Auto-accept by domain</p>
                <p className="text-sm text-muted-foreground">
                  Automatically accepts users whose email domain matches the allowed list.
                </p>
              </div>
              <Badge variant={invitationSettings.auto_accept_domain ? 'secondary' : 'outline'}>
                {invitationSettings.auto_accept_domain ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <div>
              <p className="font-medium text-foreground">Allowed Domains</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {invitationSettings.allowed_domains?.length ? (
                  invitationSettings.allowed_domains.map((domain) => (
                    <Badge key={domain} variant="secondary">
                      {domain}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No domain restrictions configured.</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium text-foreground">Require approval</p>
                <p className="text-sm text-muted-foreground">
                  Invitations need admin approval before users can join
                </p>
              </div>
              <Button
                onClick={() => setRequireApproval(!requireApproval)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireApproval ? 'bg-primary' : 'bg-muted'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${requireApproval ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 border border-border rounded-lg">
              <div>
                <p className="font-medium text-foreground">Auto-accept by domain</p>
                <p className="text-sm text-muted-foreground">
                  Automatically accept users from allowed domains
                </p>
              </div>
              <Button
                onClick={() => setAutoAcceptDomain(!autoAcceptDomain)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoAcceptDomain ? 'bg-primary' : 'bg-muted'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${autoAcceptDomain ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </Button>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Allowed Domains
              </label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddDomain()}
                  placeholder="example.edu"
                  className="flex-1 px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                <Button onClick={handleAddDomain} variant="outline">
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {allowedDomains.map((domain) => (
                  <Badge key={domain} variant="secondary" className="px-3 py-1">
                    {domain}
                    <Button
                      onClick={() => handleRemoveDomain(domain)}

                    >
                      ×
                    </Button>
                  </Badge>
                ))}
                {allowedDomains.length === 0 && (
                  <p className="text-sm text-muted-foreground">No domains added yet</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSaveInvitationSettings} disabled={isSavingInvitation}>
                {isSavingInvitation ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancelInvitation} disabled={isSavingInvitation}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
