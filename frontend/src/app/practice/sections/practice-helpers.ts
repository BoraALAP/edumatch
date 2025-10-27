/**
 * Practice Helper Functions
 *
 * Purpose: Utility functions for solo practice
 * Features:
 * - Session creation logic
 * - AI greeting generation
 */

import type { SupabaseClient } from "@supabase/supabase-js";

type SoloPracticeProfile = {
  id: string;
  proficiency_level?: string | null;
  learning_goals?: string[] | null;
};

export async function createPracticeSession({
  supabase,
  profile,
  topic,
}: {
  supabase: SupabaseClient;
  profile: SoloPracticeProfile;
  topic: string;
}): Promise<string> {
  // Create a text_practice_sessions record
  const { data: session, error: sessionError } = await supabase
    .from("text_practice_sessions")
    .insert({
      student_id: profile.id,
      topic,
      proficiency_level: profile.proficiency_level,
      learning_goals: profile.learning_goals ?? [],
      grammar_focus: [],
      status: "active",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sessionError) {
    console.error("Error creating solo practice session:", sessionError);
    throw sessionError;
  }

  // Generate AI greeting message
  let greeting: string;
  try {
    const response = await fetch("/api/practice/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        studentLevel: profile.proficiency_level || "B1",
        learningGoals: profile.learning_goals || [],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      greeting = data.starterMessage;
    } else {
      // Fallback if API fails
      greeting = `Hi! Let's talk about ${topic}. What interests you about this topic?`;
    }
  } catch (error) {
    console.error("Error generating AI greeting:", error);
    // Fallback if API fails
    greeting = `Hi! Let's talk about ${topic}. What interests you about this topic?`;
  }

  await supabase.from("text_practice_messages").insert({
    session_id: session.id,
    role: "assistant",
    content: greeting,
    message_type: "text",
  });

  return session.id;
}
