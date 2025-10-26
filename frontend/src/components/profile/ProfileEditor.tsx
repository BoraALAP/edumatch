/**
 * Profile Editor Component
 *
 * Allows users to view and edit their profile information.
 * Displays current profile data and provides form to update it.
 *
 * Features:
 * - Edit display name, age, language level, bio, interests
 * - View account type and seat information
 * - Convert to individual account (for school members only)
 * - Conversion frees seat immediately and gives global pool access
 */

'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { SelectionButton } from '@/components/ui/selection-button';
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldGroup,
} from '@/components/ui/field';
import { useRouter } from 'next/navigation';
import { TOPICS_AND_INTERESTS, LANGUAGE_LEVELS, LEARNING_GOALS } from '@/constants/onboarding';
import { toast } from 'sonner';

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  proficiency_level: string | null;
  interests: string[] | null;
  learning_goals: string[] | null;
  bio: string | null;
  age: number | null;
  avatar_url: string | null;
  native_language: string | null;
  learning_language: string | null;
  role: string | null;
  school_id: string | null;
  seat_type: string | null;
  allow_global_matching: boolean | null;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface ProfileEditorProps {
  profile: Profile;
  user: User;
}

export default function ProfileEditor({ profile, user }: ProfileEditorProps) {
  const router = useRouter();
  const supabase = createClient();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showConversionDialog, setShowConversionDialog] = useState(false);
  const [isTogglingMatching, setIsTogglingMatching] = useState(false);
  const [schoolAllowsGlobal, setSchoolAllowsGlobal] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [proficiencyLevel, setProficiencyLevel] = useState(profile.proficiency_level || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.interests || []);
  const [learningGoals, setLearningGoals] = useState<string[]>(profile.learning_goals || []);
  const [bio, setBio] = useState(profile.bio || '');
  const [age, setAge] = useState(profile.age?.toString() || '');

  // Check if user can convert to individual
  const canConvertToIndividual = profile.school_id && profile.role !== 'school_admin';

  // Check if school allows global matching
  useEffect(() => {
    const checkSchoolSettings = async () => {
      if (!profile.school_id) return;

      const { data: school } = await supabase
        .from('schools')
        .select('allow_global_matching')
        .eq('id', profile.school_id)
        .maybeSingle();

      setSchoolAllowsGlobal(school?.allow_global_matching || false);
    };

    checkSchoolSettings();
  }, [profile.school_id, supabase]);

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const toggleLearningGoal = (goal: string) => {
    if (learningGoals.includes(goal)) {
      setLearningGoals(learningGoals.filter((g) => g !== goal));
    } else {
      if (learningGoals.length < 3) {
        setLearningGoals([...learningGoals, goal]);
      }
    }
  };

  const handleSave = async () => {
    if (!bio.trim()) {
      toast.error('Please write a bio');
      return;
    }
    if (selectedInterests.length < 3) {
      toast.error('Please select at least 3 interests');
      return;
    }
    if (learningGoals.length < 1) {
      toast.error('Please select at least 1 learning goal');
      return;
    }
    if (!age || parseInt(age) < 13 || parseInt(age) > 100) {
      toast.error('Please enter a valid age (13-100)');
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          proficiency_level: proficiencyLevel,
          interests: selectedInterests,
          learning_goals: learningGoals,
          bio: bio.trim(),
          age: parseInt(age),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      toast.success('Profile updated successfully!');
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setDisplayName(profile.display_name || '');
    setProficiencyLevel(profile.proficiency_level || '');
    setSelectedInterests(profile.interests || []);
    setLearningGoals(profile.learning_goals || []);
    setBio(profile.bio || '');
    setAge(profile.age?.toString() || '');
    setIsEditing(false);
  };

  const handleConvertToIndividual = async () => {
    setIsConverting(true);

    try {
      const { data, error } = await supabase.rpc('rpc_convert_to_individual');

      if (error) throw error;

      if (data?.success) {
        toast.success('Successfully converted to individual account!', {
          description: 'Your seat has been freed and you now have access to the global matching pool.'
        });
        router.push('/dashboard');
        router.refresh();
      } else {
        throw new Error(data?.error || 'Conversion failed');
      }
    } catch (error) {
      console.error('Error converting to individual:', error);
      toast.error('Failed to convert to individual account', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsConverting(false);
      setShowConversionDialog(false);
    }
  };

  const handleToggleGlobalMatching = async () => {
    const newValue = !profile.allow_global_matching;

    if (newValue) {
      // For now, proceed without confirmation. In the future, we can add a proper dialog component
      // if user wants confirmation before enabling global matching
    }

    setIsTogglingMatching(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          allow_global_matching: newValue,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      toast.success(`Global matching ${newValue ? 'enabled' : 'disabled'} successfully!`);
      router.refresh();
    } catch (error) {
      console.error('Error toggling global matching:', error);
      toast.error('Failed to update', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsTogglingMatching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-3xl font-bold">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || 'Profile'}
                  width={80}
                  height={80}
                  className="w-full h-full rounded-full object-cover"
                  unoptimized
                />
              ) : (
                (profile.display_name || profile.full_name || 'U')[0].toUpperCase()
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {profile.display_name || profile.full_name || 'User'}
              </h2>
              <p className="text-muted-foreground">{user.email}</p>
              <Badge variant="secondary" className="mt-2">
                {profile.proficiency_level || 'N/A'}
              </Badge>
            </div>
          </div>
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </Card>

      {/* Profile Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Profile Information</h3>

        {!isEditing ? (
          // View Mode
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Display Name</label>
              <p className="text-foreground">{profile.display_name || 'Not set'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Age</label>
              <p className="text-foreground">{profile.age || 'Not set'} years old</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Language Level</label>
              <p className="text-foreground">{profile.proficiency_level || 'Not set'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Bio</label>
              <p className="text-foreground whitespace-pre-wrap">{profile.bio || 'No bio yet'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Interests</label>
              <div className="flex flex-wrap gap-2">
                {profile.interests && profile.interests.length > 0 ? (
                  profile.interests.map((interest) => (
                    <Badge key={interest} variant="secondary">
                      {interest}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">No interests selected</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Learning Goals</label>
              <div className="flex flex-wrap gap-2">
                {profile.learning_goals && profile.learning_goals.length > 0 ? (
                  profile.learning_goals.map((goal) => (
                    <Badge key={goal} variant="secondary">
                      {goal}
                    </Badge>
                  ))
                ) : (
                  <p className="text-muted-foreground">No learning goals selected</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Edit Mode
          <FieldGroup>
            <Field>
              <FieldLabel>Display Name</FieldLabel>
              <Input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
              />
            </Field>

            <Field>
              <FieldLabel>Age</FieldLabel>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="13"
                max="100"
              />
              <FieldDescription>You must be between 13 and 100 years old</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Bio</FieldLabel>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={6}
                maxLength={500}
              />
              <FieldDescription>{bio.length}/500 characters</FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Language Level</FieldLabel>
              <FieldDescription>Select your current English proficiency level</FieldDescription>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {LANGUAGE_LEVELS.map((level) => (
                  <SelectionButton
                    key={level.value}
                    label={level.label}
                    onClick={() => setProficiencyLevel(level.value)}
                    isSelected={proficiencyLevel === level.value}
                    description={level.description}
                  />
                ))}
              </div>
            </Field>

            <Field>
              <FieldLabel>Interests (select 3-5)</FieldLabel>
              <FieldDescription>
                Choose topics you&apos;d like to discuss with your practice partners
              </FieldDescription>
              <div className="grid grid-cols-2 gap-2">
                {TOPICS_AND_INTERESTS.map((interest) => (
                  <SelectionButton
                    key={interest}
                    label={interest}
                    onClick={() => toggleInterest(interest)}
                    disabled={!selectedInterests.includes(interest) && selectedInterests.length >= 5}
                    isSelected={selectedInterests.includes(interest)}
                  />
                ))}
              </div>
              <FieldDescription>
                Selected: {selectedInterests.length}/5
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel>Learning Goals (select 1-3)</FieldLabel>
              <FieldDescription>
                What do you want to improve? These help us personalize your experience
              </FieldDescription>
              <div className="grid grid-cols-1 gap-2">
                {LEARNING_GOALS.map((goal) => (
                  <SelectionButton
                    key={goal}
                    label={goal}
                    onClick={() => toggleLearningGoal(goal)}
                    disabled={!learningGoals.includes(goal) && learningGoals.length >= 3}
                    isSelected={learningGoals.includes(goal)}
                  />
                ))}
              </div>
              <FieldDescription>
                Selected: {learningGoals.length}/3
              </FieldDescription>
            </Field>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </FieldGroup>
        )}
      </Card>

      {/* Account Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Account Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span className="text-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Full Name:</span>
            <span className="text-foreground">
              {profile.full_name || user.user_metadata?.full_name || 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Account Type:</span>
            <span className="text-foreground capitalize">
              {profile.role === 'individual' ? 'Individual' : profile.role?.replace('_', ' ') || 'Unknown'}
              {profile.seat_type && ` (${profile.seat_type})`}
            </span>
          </div>
        </div>
      </Card>

      {/* Global Matching - Only for school students if enabled by admin */}
      {profile.school_id && profile.role === 'student' && schoolAllowsGlobal && (
        <Card className="p-6 border-primary/20">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">Global Matching</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Practice with individual learners from outside your school. You&apos;ll remain invisible in public searches
                but can be paired for practice sessions when both parties match.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Your school admin has enabled this feature. You can opt-in or out at any time.
              </p>
            </div>
            <div className="ml-4 flex items-center gap-3">
              <Badge variant={profile.allow_global_matching ? 'default' : 'outline'}>
                {profile.allow_global_matching ? 'Enabled' : 'Disabled'}
              </Badge>
              <Button
                onClick={handleToggleGlobalMatching}
                disabled={isTogglingMatching}
                variant={profile.allow_global_matching ? 'outline' : 'default'}
                size="sm"
              >
                {isTogglingMatching
                  ? 'Updating...'
                  : profile.allow_global_matching
                    ? 'Disable'
                    : 'Enable'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Convert to Individual - Only for school members */}
      {canConvertToIndividual && (
        <Card className="p-6 border-destructive/30">
          <h3 className="text-lg font-semibold text-foreground mb-2">Leave School</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Convert your account to an individual account. This will remove you from your school and free up your seat.
            You&apos;ll gain access to the global matching pool to practice with individuals worldwide.
          </p>

          {!showConversionDialog ? (
            <Button
              variant="destructive"
              onClick={() => setShowConversionDialog(true)}
            >
              Convert to Individual Account
            </Button>
          ) : (
            <div className="bg-destructive/10 p-4 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">Are you sure?</h4>
              <p className="text-sm text-muted-foreground mb-4">
                This action will:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Remove you from your school</li>
                  <li>Free up your seat immediately</li>
                  <li>Remove access to school-specific features</li>
                  <li>Give you access to the global matching pool</li>
                  <li>This cannot be undone</li>
                </ul>
              </p>
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  onClick={handleConvertToIndividual}
                  disabled={isConverting}
                >
                  {isConverting ? 'Converting...' : 'Yes, Convert My Account'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConversionDialog(false)}
                  disabled={isConverting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
