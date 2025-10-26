/**
 * School Admin Onboarding Form Component
 *
 * Multi-step onboarding form for school administrators.
 * Steps: 1) Personal Info, 2) Language Level, 3) School Information
 * Creates both the admin profile and school record upon completion.
 */

'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Stepper, { Step } from '@/components/StepperCard';
import { SelectionButton } from '@/components/ui/selection-button';
import { LANGUAGE_LEVELS, TOPICS_AND_INTERESTS } from '@/constants/onboarding';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card } from '@/components/ui/card';

interface SchoolAdminOnboardingFormProps {
  userId: string;
  userEmail: string;
}

export default function SchoolAdminOnboardingForm({ userId, userEmail }: SchoolAdminOnboardingFormProps) {
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  // Personal Info (Step 1)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Language Level (Step 2)
  const [proficiencyLevel, setProficiencyLevel] = useState('');

  // Interests (Step 3)
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // School Info (Step 4)
  const [schoolName, setSchoolName] = useState('');
  const [maxStudents, setMaxStudents] = useState('50');

  // Error states
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    age?: string;
    bio?: string;
    proficiencyLevel?: string;
    interests?: string;
    schoolName?: string;
    maxStudents?: string;
  }>({});

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogOpen(true);
  };

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      if (selectedInterests.length < 5) {
        setSelectedInterests([...selectedInterests, interest]);
      }
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        e.target.value = '';
        return;
      }

      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, GIF, or WebP)');
        e.target.value = '';
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
        return (
          firstName.trim() !== '' &&
          lastName.trim() !== '' &&
          bio.trim() !== '' &&
          age !== '' &&
          parseInt(age) >= 18 &&
          parseInt(age) <= 100
        );
      case 2:
        return proficiencyLevel !== '';
      case 3:
        return selectedInterests.length >= 3;
      case 4:
        const seats = parseInt(maxStudents);
        return (
          schoolName.trim() !== '' &&
          !isNaN(seats) &&
          seats >= 1
        );
      default:
        return true;
    }
  };

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

      // Call API to create school and update profile
      toast.loading('Setting up your school...');
      const response = await fetch('/api/schools/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Personal info
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age: parseInt(age),
          bio: bio.trim(),
          proficiencyLevel,
          interests: selectedInterests,
          avatarUrl,
          // School info
          schoolName: schoolName.trim(),
          adminEmail: userEmail,
          maxStudents: parseInt(maxStudents),
        }),
      });

      toast.dismiss();

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.details
          ? `${data.error}: ${data.details}`
          : data.error || 'Failed to register school';
        console.error('API Error Response:', data);
        throw new Error(errorMessage);
      }

      toast.success('School setup complete!');

      // Redirect to admin dashboard
      setTimeout(() => {
        window.location.href = '/admin';
      }, 500);
    } catch (error) {
      console.error('School registration error:', error);
      showDialog(
        'Registration Failed',
        error instanceof Error ? error.message : 'Failed to register school. Please try again.'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
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
        {/* Step 1: Personal Information */}
        <Step>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tell us about yourself</h2>
          <p className="text-muted-foreground mb-6">
            Let&apos;s start by setting up your personal profile
          </p>

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
                min="18"
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
              <p className="text-xs text-muted-foreground mt-1">
                Minimum age requirement: 18 years
              </p>
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
                placeholder="Tell us about yourself, your role in education, and your goals..."
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

            {/* Email Display */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Admin Email
              </label>
              <Input
                type="email"
                value={userEmail}
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Using your authenticated email
              </p>
            </div>
          </div>
        </Step>

        {/* Step 2: Language Level */}
        <Step>
          <h2 className="text-2xl font-bold text-foreground mb-2">What&apos;s your English level?</h2>
          <p className="text-muted-foreground mb-6">
            This helps us understand your proficiency level
          </p>

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

        {/* Step 3: Interests */}
        <Step>
          <h2 className="text-2xl font-bold text-foreground mb-2">What are your interests?</h2>
          <p className="text-muted-foreground mb-6">
            Select 3-5 topics you&apos;re interested in (selected: {selectedInterests.length}/5)
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

        {/* Step 4: School Information */}
        <Step>
          <h2 className="text-2xl font-bold text-foreground mb-2">School Information</h2>
          <p className="text-muted-foreground mb-6">
            Now let&apos;s set up your school
          </p>

          <div className="space-y-6">
            <div>
              <label htmlFor="schoolName" className="block text-sm font-medium text-foreground mb-2">
                School Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="schoolName"
                type="text"
                value={schoolName}
                onChange={(e) => {
                  setSchoolName(e.target.value);
                  if (errors.schoolName) setErrors({ ...errors, schoolName: undefined });
                }}
                placeholder="e.g., Lincoln High School"
                required
                className={errors.schoolName ? 'border-destructive' : ''}
              />
              {errors.schoolName && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.schoolName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="maxStudents" className="block text-sm font-medium text-foreground mb-2">
                Number of Student Seats <span className="text-destructive">*</span>
              </label>
              <Input
                id="maxStudents"
                type="number"
                value={maxStudents}
                onChange={(e) => {
                  setMaxStudents(e.target.value);
                  if (errors.maxStudents) setErrors({ ...errors, maxStudents: undefined });
                }}
                placeholder="50"
                min="1"
                max="10000"
                required
                className={errors.maxStudents ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground mt-1">
                How many students will use EduMatch at your school?
              </p>
              {errors.maxStudents && (
                <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.maxStudents}
                </p>
              )}
            </div>

            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-start gap-3">
                <div className="text-2xl">💡</div>
                <div className="flex-1 text-sm">
                  <p className="font-medium text-foreground mb-1">Free During Beta</p>
                  <p className="text-muted-foreground">
                    All schools get full access during our beta period. No credit card required.
                  </p>
                </div>
              </div>
            </Card>

            {/* Profile Summary */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold text-foreground mb-2">Your Profile Summary</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Name:</span> {firstName} {lastName}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {userEmail}
                </div>
                <div>
                  <span className="font-medium">Language Level:</span> {proficiencyLevel}
                </div>
                <div>
                  <span className="font-medium">Interests:</span> {selectedInterests.length > 0 ? selectedInterests.join(', ') : 'Not set'}
                </div>
                <div>
                  <span className="font-medium">School:</span> {schoolName || 'Not set'}
                </div>
              </div>
            </div>
          </div>
        </Step>
      </Stepper>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">
              {dialogMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
