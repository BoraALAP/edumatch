/**
 * Profile Editor Component
 *
 * Allows users to view and edit their profile information.
 * Displays current profile data and provides form to update it.
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';

const LANGUAGE_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const INTERESTS = [
  '🎬 Movies & TV',
  '🎮 Gaming',
  '📚 Books & Reading',
  '🎵 Music',
  '⚽ Sports',
  '✈️ Travel',
  '🍳 Cooking',
  '🎨 Art',
  '💻 Technology',
  '🔬 Science',
  '📱 Social Media',
  '🏋️ Fitness',
  '🐕 Animals',
  '🌱 Nature',
  '🎭 Theater',
  '📸 Photography',
];

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  proficiency_level: string | null;
  interests: string[] | null;
  bio: string | null;
  age: number | null;
  avatar_url: string | null;
  native_language: string | null;
  learning_language: string | null;
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

  // Form state
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [proficiencyLevel, setProficiencyLevel] = useState(profile.proficiency_level || '');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.interests || []);
  const [bio, setBio] = useState(profile.bio || '');
  const [age, setAge] = useState(profile.age?.toString() || '');

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const handleSave = async () => {
    if (!bio.trim()) {
      alert('Please write a bio');
      return;
    }
    if (selectedInterests.length < 3) {
      alert('Please select at least 3 interests');
      return;
    }
    if (!age || parseInt(age) < 13 || parseInt(age) > 100) {
      alert('Please enter a valid age (13-100)');
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
          bio: bio.trim(),
          age: parseInt(age),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    setDisplayName(profile.display_name || '');
    setProficiencyLevel(profile.proficiency_level || '');
    setSelectedInterests(profile.interests || []);
    setBio(profile.bio || '');
    setAge(profile.age?.toString() || '');
    setIsEditing(false);
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-3xl font-bold">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name || 'Profile'}
                  className="w-full h-full rounded-full object-cover"
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
          </div>
        ) : (
          // Edit Mode
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your display name"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="Enter your age"
                min="13"
                max="100"
                className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">Language Level</label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGE_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setProficiencyLevel(level)}
                    className={`px-4 py-2 border-2 rounded-lg transition-all ${
                      proficiencyLevel === level
                        ? 'border-primary bg-primary/10 text-primary/90'
                        : 'border-border hover:border-border'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Bio
              </label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={6}
                maxLength={500}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground mt-1">{bio.length}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Interests (select 3-5)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INTERESTS.map((interest) => (
                  <button
                    key={interest}
                    onClick={() => toggleInterest(interest)}
                    disabled={!selectedInterests.includes(interest) && selectedInterests.length >= 5}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedInterests.includes(interest)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-border'
                    } ${
                      !selectedInterests.includes(interest) && selectedInterests.length >= 5
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <span className="font-medium">{interest}</span>
                  </button>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedInterests.length}/5
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
            </div>
          </div>
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
        </div>
      </Card>
    </div>
  );
}
