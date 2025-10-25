/**
 * Matching Interface Component
 *
 * Tinder-style swipe interface for finding practice partners.
 * Fetches potential matches using RPC function that respects privacy boundaries:
 * - Individuals see only other individuals (global pool)
 * - School students see only same-school students (unless global matching enabled)
 * - Sorts by match quality (proficiency level + shared interests)
 * Uses client-side state for swipe animations and match creation.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface Profile {
  id: string;
  full_name: string | null;
  display_name: string | null;
  proficiency_level: string | null;
  interests: string[] | null;
  bio: string | null;
  age: number | null;
  avatar_url: string | null;
}

interface MatchingInterfaceProps {
  userId: string;
  userProfile: Profile;
}

export default function MatchingInterface({ userId, userProfile }: MatchingInterfaceProps) {
  const router = useRouter();
  const supabase = createClient();

  const [potentialMatches, setPotentialMatches] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const [isMatching, setIsMatching] = useState(false);

  useEffect(() => {
    fetchPotentialMatches();
  }, []);

  const fetchPotentialMatches = async () => {
    setIsLoading(true);

    try {
      // Use RPC function that respects privacy boundaries
      // Returns only profiles the user can match with (individuals or same school)
      const { data, error } = await supabase
        .rpc('rpc_get_my_matching_pool');

      if (error) throw error;

      if (data) {
        // Get existing matches to exclude them
        const { data: existingMatches } = await supabase
          .from('matches')
          .select('student1_id, student2_id')
          .or(`student1_id.eq.${userId},student2_id.eq.${userId}`);

        // Create a set of user IDs to exclude (already matched)
        const excludedIds = new Set<string>();
        if (existingMatches) {
          existingMatches.forEach((match) => {
            if (match.student1_id !== userId) excludedIds.add(match.student1_id);
            if (match.student2_id !== userId && match.student2_id) excludedIds.add(match.student2_id);
          });
        }

        // Filter out already matched users and map to Profile type
        const filtered = data
          .filter((profile: any) => !excludedIds.has(profile.profile_id))
          .map((profile: any) => ({
            id: profile.profile_id,
            display_name: profile.display_name,
            full_name: profile.display_name, // Use display_name as fallback
            proficiency_level: profile.proficiency_level,
            interests: profile.interests,
            bio: profile.bio,
            age: null, // Not included in RPC response
            avatar_url: null, // Not included in RPC response
          }));

        // Sort by match quality (same level + shared interests)
        const sorted = filtered.sort((a: any, b: any) => {
          const aScore = calculateMatchScore(a);
          const bScore = calculateMatchScore(b);
          return bScore - aScore;
        });

        setPotentialMatches(sorted);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateMatchScore = (profile: Profile): number => {
    let score = 0;

    // Same proficiency level: +10 points
    if (profile.proficiency_level === userProfile.proficiency_level) {
      score += 10;
    }

    // Adjacent proficiency level: +5 points
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const userLevelIndex = levels.indexOf(userProfile.proficiency_level || 'A1');
    const profileLevelIndex = levels.indexOf(profile.proficiency_level || 'A1');
    if (Math.abs(userLevelIndex - profileLevelIndex) === 1) {
      score += 5;
    }

    // Shared interests: +2 points per interest
    const userInterests = userProfile.interests || [];
    const profileInterests = profile.interests || [];
    const sharedInterests = userInterests.filter((interest) =>
      profileInterests.includes(interest)
    );
    score += sharedInterests.length * 2;

    return score;
  };

  const handleSwipe = async (direction: 'left' | 'right') => {
    if (isMatching || currentIndex >= potentialMatches.length) return;

    setSwipeDirection(direction);

    // Wait for animation
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (direction === 'right') {
      await createMatch();
    }

    setSwipeDirection(null);
    setCurrentIndex(currentIndex + 1);
  };

  const createMatch = async () => {
    setIsMatching(true);
    const matchedProfile = potentialMatches[currentIndex];

    try {
      // Calculate shared interests
      const sharedInterests = (userProfile.interests || []).filter((interest) =>
        (matchedProfile.interests || []).includes(interest)
      );

      // Create match record
      const { error } = await supabase
        .from('matches')
        .insert({
          student1_id: userId,
          student2_id: matchedProfile.id,
          status: 'pending',
          matched_interests: sharedInterests,
          matched_level: userProfile.proficiency_level,
          session_type: 'peer',
        });

      if (error) throw error;

      // Show success message
      alert(`Match request sent to ${matchedProfile.display_name || matchedProfile.full_name}.\nThey'll need to accept before chat opens.`);
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Failed to create match. Please try again.');
    } finally {
      setIsMatching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Finding potential matches...</p>
        </div>
      </div>
    );
  }

  if (potentialMatches.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">No matches found</h2>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find any potential practice partners at the moment. Check back later!
        </p>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </Card>
    );
  }

  if (currentIndex >= potentialMatches.length) {
    return (
      <Card className="p-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-foreground mb-2">You&apos;ve seen everyone!</h2>
        <p className="text-muted-foreground mb-6">
          Check back later for more potential matches
        </p>
        <div className="space-x-4">
          <Button onClick={() => setCurrentIndex(0)}>Start Over</Button>
          <Button variant="outline" onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </Card>
    );
  }

  const currentProfile = potentialMatches[currentIndex];
  const sharedInterests = (userProfile.interests || []).filter((interest) =>
    (currentProfile.interests || []).includes(interest)
  );

  return (
    <div className="relative">
      {/* Card Stack Preview (show next card) */}
      {currentIndex + 1 < potentialMatches.length && (
        <Card className="absolute top-2 left-2 right-2 h-[580px] bg-muted opacity-50" />
      )}

      {/* Main Card */}
      <Card
        className={`relative p-6 transition-all duration-300 ${swipeDirection === 'left'
            ? 'translate-x-[-120%] rotate-[-20deg] opacity-0'
            : swipeDirection === 'right'
              ? 'translate-x-[120%] rotate-[20deg] opacity-0'
              : 'translate-x-0 rotate-0 opacity-100'
          }`}
      >
        {/* Profile Content */}
        <div className="space-y-6">
          {/* Avatar and Basic Info */}
          <div className="flex items-start gap-4">
            <div className="w-24 h-24 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-4xl font-bold">
              {currentProfile.avatar_url ? (
                <img
                  src={currentProfile.avatar_url}
                  alt={currentProfile.display_name || 'Profile'}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                (currentProfile.display_name || currentProfile.full_name || 'U')[0].toUpperCase()
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground">
                {currentProfile.display_name || currentProfile.full_name}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {currentProfile.proficiency_level || 'N/A'}
                </Badge>
                {currentProfile.age && (
                  <span className="text-muted-foreground">{currentProfile.age} years old</span>
                )}
              </div>
            </div>
          </div>

          {/* Bio */}
          {currentProfile.bio && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">About</h3>
              <p className="text-muted-foreground">{currentProfile.bio}</p>
            </div>
          )}

          {/* Interests */}
          {currentProfile.interests && currentProfile.interests.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Interests</h3>
              <div className="flex flex-wrap gap-2">
                {currentProfile.interests.map((interest) => {
                  const isShared = sharedInterests.includes(interest);
                  return (
                    <Badge
                      key={interest}
                      variant={isShared ? 'default' : 'outline'}
                      className={isShared ? 'bg-primary hover:bg-primary/90' : ''}
                    >
                      {interest}
                    </Badge>
                  );
                })}
              </div>
              {sharedInterests.length > 0 && (
                <p className="text-sm text-primary mt-2">
                  ✨ You have {sharedInterests.length} shared interest{sharedInterests.length > 1 ? 's' : ''}!
                </p>
              )}
            </div>
          )}

          {/* Match Score */}
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="font-medium text-foreground">Match Score</span>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-linear-to-r from-primary to-primary/70"
                    style={{
                      width: `${Math.min(calculateMatchScore(currentProfile) * 5, 100)}%`,
                    }}
                  />
                </div>
                <span className="font-bold text-primary">
                  {Math.min(calculateMatchScore(currentProfile) * 5, 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-8 mt-8">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleSwipe('left')}
          disabled={isMatching || swipeDirection !== null}
          className="w-20 h-20 rounded-full border-2 border-destructive text-destructive hover:bg-destructive/10"
        >
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>

        <Button
          size="lg"
          onClick={() => handleSwipe('right')}
          disabled={isMatching || swipeDirection !== null}
          className="w-20 h-20 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isMatching ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-foreground"></div>
          ) : (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </Button>
      </div>

      {/* Instructions */}
      <div className="text-center mt-6 text-sm text-muted-foreground">
        <p>
          ❌ Skip • ❤️ Match • {potentialMatches.length - currentIndex} remaining
        </p>
      </div>
    </div>
  );
}
