/**
 * Onboarding Form Component
 *
 * Multi-step form for user onboarding.
 * Handles both:
 * 1. Individual signup: Sets role to 'individual'
 * 2. School invitation: Uses role from invitation, auto-accepts invitation after completion
 *
 * Steps: 1) Language Level, 2) Interests, 3) Learning Goals, 4) Personal Info
 *
 * For invited users:
 * - invitationToken is passed from URL params
 * - After profile save, automatically accepts invitation
 * - Role and school_id come from invitation metadata
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Stepper, { Step } from '@/components//StepperCard';
import { SelectionButton } from '@/components/ui/selection-button';
import { AvatarUpload } from '@/components/ui/avatar-upload';
import {
  LANGUAGE_LEVELS,
  TOPICS_AND_INTERESTS,
  LEARNING_GOALS,
} from '@/constants/onboarding';

interface OnboardingFormProps {
  userId: string;
  invitationToken?: string; // If present, user was invited by school admin
}

export default function OnboardingForm({ userId, invitationToken }: OnboardingFormProps) {
  const supabase = createClient();
  const isInvited = !!invitationToken;

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [proficiencyLevel, setProficiencyLevel] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Error states
  const [errors, setErrors] = useState<{
    proficiencyLevel?: string;
    interests?: string;
    learningGoals?: string;
    firstName?: string;
    lastName?: string;
    bio?: string;
    age?: string;
  }>({});

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

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Validation for current step
  const isStepValid = useCallback(() => {
    switch (currentStep) {
      case 1:
        return proficiencyLevel !== '';
      case 2:
        return selectedInterests.length >= 3;
      case 3:
        return learningGoals.length >= 1;
      case 4:
        return (
          firstName.trim() !== '' &&
          lastName.trim() !== '' &&
          bio.trim() !== '' &&
          age !== '' &&
          parseInt(age) >= 13 &&
          parseInt(age) <= 100
        );
      default:
        return true;
    }
  }, [
    currentStep,
    proficiencyLevel,
    selectedInterests,
    learningGoals,
    firstName,
    lastName,
    bio,
    age,
  ]);

  // Show validation errors when step is invalid and user is trying to proceed
  useEffect(() => {
    if (!isStepValid() && currentStep > 0) {
      const newErrors: typeof errors = {};

      switch (currentStep) {
        case 1:
          if (!proficiencyLevel) {
            newErrors.proficiencyLevel = 'Please select your language level';
          }
          break;
        case 2:
          if (selectedInterests.length < 3) {
            newErrors.interests = 'Please select at least 3 interests';
          }
          break;
        case 3:
          if (learningGoals.length < 1) {
            newErrors.learningGoals = 'Please select at least 1 learning goal';
          }
          break;
        case 4:
          if (!firstName.trim()) newErrors.firstName = 'Please enter your first name';
          if (!lastName.trim()) newErrors.lastName = 'Please enter your last name';
          if (!bio.trim()) newErrors.bio = 'Please write a short bio about yourself';
          if (!age || parseInt(age) < 13 || parseInt(age) > 100) {
            newErrors.age = 'Please enter a valid age (13-100)';
          }
          break;
      }

      setErrors(newErrors);
    } else {
      setErrors({});
    }
  }, [currentStep, proficiencyLevel, isStepValid, selectedInterests, learningGoals, firstName, lastName, bio, age]);

  const handleFinalSubmit = async () => {
    setIsLoading(true);

    try {
      let avatarUrl: string | null = null;

      // Upload avatar if provided
      if (avatarFile) {
        toast.loading('Uploading avatar...');
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, {
            cacheControl: '3600',
            upsert: false,
          });

        toast.dismiss();

        if (uploadError) {
          console.error('Avatar upload error:', uploadError);
          toast.error('Failed to upload avatar');
          throw new Error('Failed to upload avatar');
        }

        // Get the public URL
        const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
        avatarUrl = data.publicUrl;
      }

      // Build profile data
      // For invited users, role comes from invitation acceptance API
      // For individual signups, set role to 'individual'
      const profileData: {
        id: string;
        first_name: string;
        last_name: string;
        proficiency_level: string;
        interests: string[];
        learning_goals: string[];
        bio: string;
        age: number;
        avatar_url: string | null;
        role?: 'individual';
        onboarding_completed: boolean;
        updated_at: string;
      } = {
        id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        proficiency_level: proficiencyLevel,
        interests: selectedInterests,
        learning_goals: learningGoals,
        bio: bio.trim(),
        age: parseInt(age),
        avatar_url: avatarUrl,
        onboarding_completed: true,
        updated_at: new Date().toISOString(),
      };

      // Only set role for non-invited users
      // Invited users get their role from invitation acceptance
      if (!isInvited) {
        profileData.role = 'individual';
      }

      // Save profile to database
      toast.loading('Saving your profile...');
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'id'
        });

      toast.dismiss();

      if (error) {
        console.error('Upsert error:', error);
        toast.error('Failed to save profile. Please try again.');
        throw error;
      }

      toast.success('Profile saved successfully!');

      // If user was invited, accept the invitation
      if (isInvited && invitationToken) {
        toast.loading('Accepting invitation...');

        const acceptResponse = await fetch(`/api/invite/${invitationToken}/accept`, {
          method: 'POST',
        });

        toast.dismiss();

        if (!acceptResponse.ok) {
          console.error('Failed to accept invitation:', acceptResponse.status);
          toast.error('Profile saved but failed to accept invitation. Please contact your school admin.');
          // Still redirect to dashboard even if invitation acceptance fails
        } else {
          toast.success('Invitation accepted!');
        }
      }

      // Redirect to appropriate dashboard
      // For invited users, we need to check their role after invitation acceptance
      setTimeout(async () => {
        if (isInvited) {
          // Fetch updated profile to get role
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .maybeSingle();

          if (profile?.role === 'school_admin') {
            window.location.href = '/admin';
          } else if (profile?.role === 'teacher') {
            window.location.href = '/dashboard'; // Teachers use same dashboard for now
          } else {
            window.location.href = '/dashboard';
          }
        } else {
          // Individual users always go to dashboard
          window.location.href = '/dashboard';
        }
      }, 500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className=" flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        {/* Stepper */}
        <Stepper
          initialStep={1}
          onStepChange={(step) => {
            setCurrentStep(step);
          }}
          onFinalStepCompleted={handleFinalSubmit}
          backButtonText="Back"
          nextButtonText="Next"
          nextButtonProps={{
            disabled: !isStepValid() || isLoading,
          }}
          stepCircleContainerClassName="bg-card"
          contentClassName="min-h-[400px]"
        >
          {/* Step 1: Language Level */}
          <Step>
            <h2 className="text-2xl font-bold text-foreground mb-2">What&apos;s your English level?</h2>
            <p className="text-muted-foreground mb-6">This helps us match you with students at a similar level</p>

            <div className="space-y-3">
              {LANGUAGE_LEVELS.map((level) => (
                <SelectionButton
                  key={level.value}
                  label={level.label}
                  description={level.description}
                  onClick={() => {
                    setProficiencyLevel(level.value);
                    setErrors({ ...errors, proficiencyLevel: undefined });
                  }}
                  isSelected={proficiencyLevel === level.value}
                  className="w-full"
                />
              ))}
            </div>

            {errors.proficiencyLevel && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{errors.proficiencyLevel}</p>
              </div>
            )}
          </Step>

          {/* Step 2: Interests */}
          <Step>
            <h2 className="text-2xl font-bold text-foreground mb-2">What are your interests?</h2>
            <p className="text-muted-foreground mb-6">
              Select 3-5 topics you&apos;d like to talk about (selected: {selectedInterests.length}/5)
            </p>

            <div className="grid grid-cols-2 gap-3">
              {TOPICS_AND_INTERESTS.map((interest) => (
                <SelectionButton
                  key={interest}
                  label={interest}
                  onClick={() => {
                    toggleInterest(interest);
                    setErrors({ ...errors, interests: undefined });
                  }}
                  disabled={!selectedInterests.includes(interest) && selectedInterests.length >= 5}
                  isSelected={selectedInterests.includes(interest)}
                />
              ))}
            </div>

            {errors.interests && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{errors.interests}</p>
              </div>
            )}
          </Step>

          {/* Step 3: Learning Goals */}
          <Step>
            <h2 className="text-2xl font-bold text-foreground mb-2">What are your learning goals?</h2>
            <p className="text-muted-foreground mb-6">
              Select 1-3 goals to help us personalize your experience (selected: {learningGoals.length}/3)
            </p>

            <div className="grid grid-cols-1 gap-3">
              {LEARNING_GOALS.map((goal) => (
                <SelectionButton
                  key={goal}
                  label={goal}
                  onClick={() => {
                    toggleLearningGoal(goal);
                    setErrors({ ...errors, learningGoals: undefined });
                  }}
                  disabled={!learningGoals.includes(goal) && learningGoals.length >= 3}
                  isSelected={learningGoals.includes(goal)}
                />
              ))}
            </div>

            {errors.learningGoals && (
              <div className="flex items-center gap-2 mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive" />
                <p className="text-sm text-destructive">{errors.learningGoals}</p>
              </div>
            )}
          </Step>

          {/* Step 4: Personal Info */}
          <Step>
            <h2 className="text-2xl font-bold text-foreground mb-2">Tell us about yourself</h2>
            <p className="text-muted-foreground mb-6">Help others get to know you better</p>

            <div className="space-y-6">
              {/* Avatar Upload */}
              <AvatarUpload
                previewUrl={avatarPreview}
                initials={firstName && lastName ? `${firstName[0]}${lastName[0]}`.toUpperCase() : undefined}
                onFileSelect={handleAvatarSelect}
                size="lg"
              />

              {/* First Name and Last Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    First Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={firstName}
                    onChange={(e) => {
                      setFirstName(e.target.value);
                      if (errors.firstName) setErrors({ ...errors, firstName: undefined });
                    }}
                    placeholder="Enter your first name"
                    maxLength={50}
                    required
                    className={errors.firstName ? 'border-destructive' : ''}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Last Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      if (errors.lastName) setErrors({ ...errors, lastName: undefined });
                    }}
                    placeholder="Enter your last name"
                    maxLength={50}
                    required
                    className={errors.lastName ? 'border-destructive' : ''}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.lastName}
                    </p>
                  )}
                </div>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Age <span className="text-destructive">*</span>
                </label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value);
                    if (errors.age) setErrors({ ...errors, age: undefined });
                  }}
                  placeholder="Enter your age"
                  min="13"
                  max="100"
                  required
                  className={errors.age ? 'border-destructive' : ''}
                />
                {errors.age && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.age}
                  </p>
                )}
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Bio <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={bio}
                  onChange={(e) => {
                    setBio(e.target.value);
                    if (errors.bio) setErrors({ ...errors, bio: undefined });
                  }}
                  placeholder="Tell us a bit about yourself, your hobbies, what you want to learn..."
                  rows={6}
                  maxLength={500}
                  className={errors.bio ? 'border-destructive' : ''}
                  required
                />
                {errors.bio && (
                  <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.bio}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">{bio.length}/500 characters</p>
              </div>

              {/* Profile Summary */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">Your Profile Summary</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Language Level:</span> {proficiencyLevel}
                  </div>
                  <div>
                    <span className="font-medium">Interests:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedInterests.map((interest) => (
                        <Badge key={interest} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Learning Goals:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {learningGoals.map((goal) => (
                        <Badge key={goal} variant="secondary">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Step>
        </Stepper>
      </div>
    </div>
  );
}
