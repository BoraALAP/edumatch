/**
 * Application Type Definitions
 *
 * Central export for all type definitions used across the application.
 */

import { Database } from './database.types';

// Database table types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type School = Database['public']['Tables']['schools']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type CurriculumTopic = Database['public']['Tables']['curriculum_topics']['Row'];
export type FeedbackLog = Database['public']['Tables']['feedback_logs']['Row'];
export type ConversationSummary = Database['public']['Tables']['conversation_summaries']['Row'];

// Enum types
export type UserRole = Database['public']['Enums']['user_role'];
export type ProficiencyLevel = Database['public']['Enums']['proficiency_level'];
export type MatchStatus = Database['public']['Enums']['match_status'];
export type MessageType = Database['public']['Enums']['message_type'];

// Agent context types
export interface AgentContext {
  user_profiles: {
    student1: Profile;
    student2?: Profile;
  };
  curriculum_topic?: CurriculumTopic;
  conversation_history: Message[];
  school_policy?: Record<string, unknown>;
  agent_config: AgentConfig;
  permissions: AgentPermissions;
}

export interface AgentConfig {
  temperature: number;
  intervention_frequency: number; // Minutes between interventions
  tone: 'friendly' | 'formal' | 'encouraging';
  correction_style: 'immediate' | 'delayed' | 'summary';
}

export interface AgentPermissions {
  can_correct: boolean;
  can_redirect: boolean;
  can_generate_feedback: boolean;
  role: UserRole;
}

// Chat widget types
export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  created_at: string;
  sender_name?: string;
}

export interface ChatSession {
  match: Match;
  partner: Profile;
  messages: ChatMessage[];
}

// Export database types
export type { Database };
