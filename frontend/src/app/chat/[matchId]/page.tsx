/**
 * Individual Chat Page
 *
 * Real-time 2-person chat interface with AI grammar assistance.
 * Server component that fetches match details and passes to client component.
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ChatInterface from '@/components/chat/ChatInterface';
import type { Match, Profile, CurriculumTopic } from '@/types';

interface ChatPageProps {
  params: {
    matchId: string;
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get match details
  const { data: matchRow, error: matchError } = await supabase
    .from('matches')
    .select('*')
    .eq('id', params.matchId)
    .single();

  if (matchError || !matchRow) {
    redirect('/chat');
  }

  // Verify user is part of this match
  if (matchRow.student1_id !== user.id && matchRow.student2_id !== user.id) {
    redirect('/chat');
  }

  if (matchRow.status !== 'active') {
    redirect('/chat');
  }

  const participantIds = [matchRow.student1_id, matchRow.student2_id].filter(Boolean) as string[];

  const { data: participantProfiles } = participantIds.length
    ? await supabase
        .from('profiles')
        .select('*')
        .in('id', participantIds)
    : { data: [] as Profile[] };

  const profileMap = new Map<string, Profile>(
    (participantProfiles ?? []).map((profile) => [profile.id, profile])
  );

  const currentUserProfile = profileMap.get(user.id) ?? null;
  const otherUserId = matchRow.student1_id === user.id ? matchRow.student2_id : matchRow.student1_id;
  const otherUser = otherUserId ? profileMap.get(otherUserId) ?? null : null;

  if (!otherUser) {
    redirect('/chat');
  }

  let curriculumTopic: CurriculumTopic | null = null;
  if (matchRow.curriculum_topic_id) {
    const { data: topic } = await supabase
      .from('curriculum_topics')
      .select('*')
      .eq('id', matchRow.curriculum_topic_id)
      .single();
    curriculumTopic = (topic as CurriculumTopic) ?? null;
  }

  const match: Match & { curriculum_topic: CurriculumTopic | null } = {
    ...(matchRow as Match),
    curriculum_topic: curriculumTopic,
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <ChatInterface
        matchId={params.matchId}
        currentUserId={user.id}
        currentUserProfile={currentUserProfile}
        otherUser={otherUser}
        match={match}
      />
    </div>
  );
}
