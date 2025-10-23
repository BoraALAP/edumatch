/**
 * Onboarding Form Component
 *
 * Multi-step form for individual user onboarding.
 * Steps: 1) Language Level, 2) Interests, 3) Learning Goals, 4) Bio & Age
 * Automatically sets user role to 'individual' upon completion.
 * Uses client-side state management and Supabase client for updates.
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

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
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form data
  const [proficiencyLevel, setProficiencyLevel] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [age, setAge] = useState('');

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

  const handleNext = () => {
    if (step === 1 && !proficiencyLevel) {
      alert('Please select your language level');
      return;
    }
    if (step === 2 && selectedInterests.length < 3) {
      alert('Please select at least 3 interests');
      return;
    }
    if (step === 3 && learningGoals.length < 1) {
      alert('Please select at least 1 learning goal');
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!bio.trim()) {
      alert('Please write a short bio about yourself');
      return;
    }
    if (!age || parseInt(age) < 13 || parseInt(age) > 100) {
      alert('Please enter a valid age (13-100)');
      return;
    }

    setIsLoading(true);

    try {
      // Use upsert to insert or update the profile
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          proficiency_level: proficiencyLevel,
          interests: selectedInterests,
          learning_goals: learningGoals,
          bio: bio.trim(),
          age: parseInt(age),
          role: 'individual', // Set role as individual for self-signup
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Upsert error:', error);
        throw error;
      }

      // Force a redirect with window.location to bypass cache
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <div className="w-12 h-1 bg-muted">
            <div className={`h-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
          <div className="w-12 h-1 bg-muted">
            <div className={`h-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            3
          </div>
          <div className="w-12 h-1 bg-muted">
            <div className={`h-full ${step >= 4 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 4 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
            4
          </div>
        </div>
        <span className="text-sm text-muted-foreground">Step {step} of 4</span>
      </div>

      {/* Step 1: Language Level */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">What&apos;s your English level?</h2>
          <p className="text-muted-foreground mb-6">This helps us match you with students at a similar level</p>

          <div className="space-y-3">
            {LANGUAGE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setProficiencyLevel(level.value)}
                className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                  proficiencyLevel === level.value
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-border'
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

          <div className="flex justify-end mt-8">
            <Button onClick={handleNext} disabled={!proficiencyLevel}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Interests */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">What are your interests?</h2>
          <p className="text-muted-foreground mb-6">
            Select 3-5 topics you&apos;d like to talk about (selected: {selectedInterests.length}/5)
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            {INTERESTS.map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                disabled={!selectedInterests.includes(interest) && selectedInterests.length >= 5}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
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

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={selectedInterests.length < 3}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Learning Goals */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">What are your learning goals?</h2>
          <p className="text-muted-foreground mb-6">
            Select 1-3 goals to help us personalize your experience (selected: {learningGoals.length}/3)
          </p>

          <div className="grid grid-cols-1 gap-3 mb-8">
            {LEARNING_GOALS.map((goal) => (
              <button
                key={goal}
                onClick={() => toggleLearningGoal(goal)}
                disabled={!learningGoals.includes(goal) && learningGoals.length >= 3}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  learningGoals.includes(goal)
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-border'
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

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={learningGoals.length < 1}>
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Bio & Age */}
      {step === 4 && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tell us about yourself</h2>
          <p className="text-muted-foreground mb-6">Help others get to know you better</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Bio
              </label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself, your hobbies, what you want to learn..."
                rows={6}
                maxLength={500}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground mt-1">{bio.length}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Age
              </label>
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

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Complete Setup'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
