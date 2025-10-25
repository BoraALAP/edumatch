/**
 * Onboarding Form Component
 *
 * Multi-step form for individual user onboarding.
 * Steps: 1) Language Level, 2) Interests, 3) Learning Goals, 4) Personal Info
 * Automatically sets user role to 'individual' upon completion.
 * Uses Stepper component for step management and Supabase client for updates.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Stepper, { Step } from '../StepperCard';

const LANGUAGE_LEVELS = [
  { value: 'A1', label: 'A1', description: 'Beginner - I can understand and use basic phrases' },
  { value: 'A2', label: 'A2', description: 'Elementary - I can communicate in simple tasks' },
  { value: 'B1', label: 'B1', description: 'Intermediate - I can handle most daily situations' },
  { value: 'B2', label: 'B2', description: 'Upper Intermediate - I can express myself fluently' },
  { value: 'C1', label: 'C1', description: 'Advanced - I can use language flexibly' },
  { value: 'C2', label: 'C2', description: 'Proficient - I have mastery of the language' },
];

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

const LEARNING_GOALS = [
  'Improve conversational fluency',
  'Prepare for exams (TOEFL, IELTS, etc.)',
  'Practice for job interviews',
  'Learn business English',
  'Improve pronunciation',
  'Expand vocabulary',
  'Practice grammar',
  'Make international friends',
  'Travel preparation',
  'Academic writing',
  'Casual conversation practice',
  'Professional development',
];

interface OnboardingFormProps {
  userId: string;
}

export default function OnboardingForm({ userId }: OnboardingFormProps) {
  const supabase = createClient();

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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        e.target.value = ''; // Reset input
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
        e.target.value = ''; // Reset input
        return;
      }

      setAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Avatar uploaded successfully');
    }
  };

  // Validation for current step
  const isStepValid = () => {
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
  };

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
  }, [currentStep, proficiencyLevel, selectedInterests, learningGoals, firstName, lastName, bio, age]);

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

      // Use upsert to insert or update the profile
      toast.loading('Saving your profile...');
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          proficiency_level: proficiencyLevel,
          interests: selectedInterests,
          learning_goals: learningGoals,
          bio: bio.trim(),
          age: parseInt(age),
          avatar_url: avatarUrl,
          role: 'individual', // Set role as individual for self-signup
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      toast.dismiss();

      if (error) {
        console.error('Upsert error:', error);
        toast.error('Failed to save profile. Please try again.');
        throw error;
      }

      toast.success('Profile saved successfully!');

      // Force a redirect with window.location to bypass cache
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to EduMatch!</h1>
          <p className="text-muted-foreground">
            Let&apos;s set up your profile to find the perfect practice partners
          </p>
        </div>

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
                <button
                  key={level.value}
                  onClick={() => {
                    setProficiencyLevel(level.value);
                    setErrors({ ...errors, proficiencyLevel: undefined });
                  }}
                  className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                    proficiencyLevel === level.value
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-foreground">{level.label}</div>
                      <div className="text-sm text-muted-foreground">{level.description}</div>
                    </div>
                    {proficiencyLevel === level.value && (
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
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
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => {
                    toggleInterest(interest);
                    setErrors({ ...errors, interests: undefined });
                  }}
                  disabled={!selectedInterests.includes(interest) && selectedInterests.length >= 5}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    selectedInterests.includes(interest)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
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
                <button
                  key={goal}
                  onClick={() => {
                    toggleLearningGoal(goal);
                    setErrors({ ...errors, learningGoals: undefined });
                  }}
                  disabled={!learningGoals.includes(goal) && learningGoals.length >= 3}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    learningGoals.includes(goal)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  } ${
                    !learningGoals.includes(goal) && learningGoals.length >= 3
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  }`}
                >
                  <span className="font-medium">{goal}</span>
                </button>
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
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={avatarPreview || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                      {firstName && lastName
                        ? `${firstName[0]}${lastName[0]}`.toUpperCase()
                        : <Upload className="w-8 h-8" />
                      }
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors"
                  >
                    <Upload className="w-4 h-4" />
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Upload a profile picture (optional)<br />
                  Max 5MB • JPG, PNG, GIF, or WebP
                </p>
              </div>

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
