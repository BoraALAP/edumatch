/**
 * Feedback Agent (Reviewer) - Mastra Implementation
 *
 * This agent summarizes sessions and provides actionable feedback.
 * Features:
 * - Reads full conversation history from Supabase
 * - Identifies frequent grammar patterns or vocabulary themes
 * - Produces a short, friendly summary for the student
 * - Generates a teacher-focused analytical report
 *
 * Migrated from OpenAI Agents SDK to Mastra for better analysis capabilities.
 */

import { Agent } from '@mastra/core/agent';
import { openai } from '@ai-sdk/openai';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  sender_type?: 'student' | 'coach' | 'system';
}

export interface SessionSummary {
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  grammarPatterns: Record<string, number>;
  vocabularyUsed: string[];
  topicAdherence: number; // 0-100
  participationScore: number; // 0-100
  nextSteps: string[];
}

/**
 * Create the Feedback/Review Agent
 */
export const feedbackAgent = new Agent({
  name: 'session-reviewer',
  model: openai('gpt-4o-mini'),
  instructions: 'You are a session feedback agent that analyzes conversations and provides constructive, encouraging feedback.',
});

/**
 * Generate a comprehensive session summary
 *
 * @param messages - Full conversation history
 * @param topic - Session topic
 * @param studentLevel - Optional student proficiency level
 * @returns Detailed session summary with feedback
 */
export async function generateSessionSummary(
  messages: AIMessage[],
  topic: string,
  studentLevel?: string
): Promise<SessionSummary> {
  const conversationText = messages
    .map((msg) => {
      const role = msg.sender_type || msg.role;
      return `${role}: ${msg.content}`;
    })
    .join('\n');

  const instructions = `You are a session feedback agent. Analyze this conversation and provide a detailed summary.

Topic: "${topic}"
${studentLevel ? `Student Level: ${studentLevel}` : ''}

Respond in this exact JSON format:
{
  "overallFeedback": "2-3 sentences of encouraging overall feedback",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "areasForImprovement": ["area 1", "area 2"],
  "grammarPatterns": {"pattern": count},
  "vocabularyUsed": ["word1", "word2"],
  "topicAdherence": number (0-100),
  "participationScore": number (0-100),
  "nextSteps": ["next step 1", "next step 2"]
}

Guidelines:
- Be encouraging and constructive
- Identify specific strengths (e.g., "Used past tense correctly")
- Suggest 2-3 actionable improvements
- Count recurring grammar patterns (e.g., "subject-verb agreement": 3)
- List interesting vocabulary words used
- Rate topic adherence (100 = perfectly on topic)
- Rate participation (100 = very engaged, asking questions, elaborating)
- Suggest 2-3 concrete next steps for improvement

Conversation:
${conversationText}`;

  const response = await feedbackAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: 'Generate summary' },
  ]);

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return {
      overallFeedback: 'Great conversation! Keep practicing.',
      strengths: ['Engaged in the conversation', 'Stayed on topic'],
      areasForImprovement: ['Continue practicing'],
      grammarPatterns: {},
      vocabularyUsed: [],
      topicAdherence: 80,
      participationScore: 80,
      nextSteps: ['Practice more conversations', 'Review grammar basics'],
    };
  }
}

/**
 * Generate a quick feedback snippet for real-time display
 *
 * @param messages - Recent conversation messages
 * @param topic - Session topic
 * @returns Short encouragement message
 */
export async function generateQuickFeedback(
  messages: AIMessage[],
  topic: string
): Promise<string> {
  const conversationText = messages
    .slice(-10) // Last 10 messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const instructions = `Generate a brief (1-2 sentences), encouraging feedback snippet about this conversation on "${topic}".

Be specific and positive. Focus on what the student is doing well.

Examples:
- "Great job using the past tense! Your storytelling is getting clearer."
- "Excellent vocabulary choices! You're expanding your range nicely."
- "Nice work staying on topic and asking follow-up questions!"

Conversation:
${conversationText}`;

  const response = await feedbackAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: 'Generate quick feedback' },
  ]);

  return response.text || 'Great work! Keep practicing.';
}

/**
 * Generate teacher-focused analytical report
 *
 * @param messages - Full conversation history
 * @param topic - Session topic
 * @param studentLevel - Student proficiency level
 * @param curriculumGoals - Optional curriculum goals
 * @returns Detailed report for teachers
 */
export async function generateTeacherReport(
  messages: AIMessage[],
  topic: string,
  studentLevel: string,
  curriculumGoals?: string[]
): Promise<{
  summary: string;
  grammarAnalysis: string;
  vocabularyAnalysis: string;
  engagementLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
  curriculumAlignment?: string;
}> {
  const conversationText = messages
    .map((msg) => `${msg.role}: ${msg.content}`)
    .join('\n');

  const goalsContext = curriculumGoals
    ? `\nCurriculum Goals: ${curriculumGoals.join(', ')}`
    : '';

  const instructions = `You are generating a teacher-focused analytical report.

Topic: "${topic}"
Student Level: ${studentLevel}${goalsContext}

Respond in this exact JSON format:
{
  "summary": "2-3 sentence executive summary of the session",
  "grammarAnalysis": "Detailed grammar performance analysis",
  "vocabularyAnalysis": "Vocabulary range and usage analysis",
  "engagementLevel": "low|medium|high",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "curriculumAlignment": "How well this aligns with curriculum goals"
}

Guidelines:
- Be objective and analytical
- Identify specific patterns (e.g., "Struggles with article usage")
- Assess vocabulary diversity and appropriateness for level
- Evaluate engagement through question-asking, elaboration, and topic adherence
- Provide actionable teaching recommendations
- If curriculum goals provided, assess alignment

Conversation:
${conversationText}`;

  const response = await feedbackAgent.generate([
    { role: 'system', content: instructions },
    { role: 'user', content: 'Generate teacher report' },
  ]);

  try {
    return JSON.parse(response.text || '{}');
  } catch {
    return {
      summary: 'Session completed successfully.',
      grammarAnalysis: 'Student demonstrated adequate grammar usage.',
      vocabularyAnalysis: 'Vocabulary range appropriate for level.',
      engagementLevel: 'medium',
      recommendations: ['Continue regular practice', 'Review grammar concepts'],
    };
  }
}
