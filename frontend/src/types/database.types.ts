export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      conversation_summaries: {
        Row: {
          compressed_context: string
          created_at: string | null
          id: string
          key_grammar_patterns: string[] | null
          match_id: string
          message_count: number
          notable_corrections: Json | null
          participant_turns: Json | null
          summary_window_end: string
          summary_window_start: string
          topic_keywords: string[] | null
          updated_at: string | null
        }
        Insert: {
          compressed_context: string
          created_at?: string | null
          id?: string
          key_grammar_patterns?: string[] | null
          match_id: string
          message_count?: number
          notable_corrections?: Json | null
          participant_turns?: Json | null
          summary_window_end: string
          summary_window_start: string
          topic_keywords?: string[] | null
          updated_at?: string | null
        }
        Update: {
          compressed_context?: string
          created_at?: string | null
          id?: string
          key_grammar_patterns?: string[] | null
          match_id?: string
          message_count?: number
          notable_corrections?: Json | null
          participant_turns?: Json | null
          summary_window_end?: string
          summary_window_start?: string
          topic_keywords?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_summaries_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      curriculum_topics: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          difficulty_level: string | null
          duration_minutes: number | null
          grammar_focus: string[] | null
          id: string
          is_active: boolean | null
          keywords: string[] | null
          learning_objectives: string[] | null
          school_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          grammar_focus?: string[] | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          learning_objectives?: string[] | null
          school_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          difficulty_level?: string | null
          duration_minutes?: number | null
          grammar_focus?: string[] | null
          id?: string
          is_active?: boolean | null
          keywords?: string[] | null
          learning_objectives?: string[] | null
          school_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curriculum_topics_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_logs: {
        Row: {
          agent_model: string | null
          areas_for_improvement: string[] | null
          created_at: string | null
          fluency_score: number | null
          generated_by: string | null
          grammar_patterns: Json | null
          id: string
          match_id: string
          next_steps: string[] | null
          participation_score: number | null
          recommended_topics: string[] | null
          strengths: string[] | null
          student_id: string
          summary: string | null
          topic_adherence_score: number | null
          updated_at: string | null
          vocabulary_used: string[] | null
        }
        Insert: {
          agent_model?: string | null
          areas_for_improvement?: string[] | null
          created_at?: string | null
          fluency_score?: number | null
          generated_by?: string | null
          grammar_patterns?: Json | null
          id?: string
          match_id: string
          next_steps?: string[] | null
          participation_score?: number | null
          recommended_topics?: string[] | null
          strengths?: string[] | null
          student_id: string
          summary?: string | null
          topic_adherence_score?: number | null
          updated_at?: string | null
          vocabulary_used?: string[] | null
        }
        Update: {
          agent_model?: string | null
          areas_for_improvement?: string[] | null
          created_at?: string | null
          fluency_score?: number | null
          generated_by?: string | null
          grammar_patterns?: Json | null
          id?: string
          match_id?: string
          next_steps?: string[] | null
          participation_score?: number | null
          recommended_topics?: string[] | null
          strengths?: string[] | null
          student_id?: string
          summary?: string | null
          topic_adherence_score?: number | null
          updated_at?: string | null
          vocabulary_used?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_logs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_agent_config: Json | null
          ai_agent_enabled: boolean | null
          ai_agent_type: string | null
          created_at: string | null
          curriculum_topic_id: string | null
          duration_seconds: number | null
          ended_at: string | null
          id: string
          matched_interests: string[] | null
          matched_level: string | null
          scheduled_at: string | null
          school_id: string | null
          session_type: string
          started_at: string | null
          status: Database["public"]["Enums"]["match_status"]
          student1_id: string
          student2_id: string | null
          updated_at: string | null
        }
        Insert: {
          ai_agent_config?: Json | null
          ai_agent_enabled?: boolean | null
          ai_agent_type?: string | null
          created_at?: string | null
          curriculum_topic_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          matched_interests?: string[] | null
          matched_level?: string | null
          scheduled_at?: string | null
          school_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          student1_id: string
          student2_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_agent_config?: Json | null
          ai_agent_enabled?: boolean | null
          ai_agent_type?: string | null
          created_at?: string | null
          curriculum_topic_id?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          id?: string
          matched_interests?: string[] | null
          matched_level?: string | null
          scheduled_at?: string | null
          school_id?: string | null
          session_type?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          student1_id?: string
          student2_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_curriculum_topic_id_fkey"
            columns: ["curriculum_topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          ai_correction: string | null
          audio_duration_seconds: number | null
          audio_url: string | null
          content: string
          created_at: string | null
          edited_at: string | null
          grammar_issues: Json | null
          id: string
          is_edited: boolean | null
          match_id: string
          message_type: Database["public"]["Enums"]["message_type"] | null
          read_by: string[] | null
          sender_id: string | null
          sender_type: string
          topic_relevance_score: number | null
          transcript: string | null
          updated_at: string | null
        }
        Insert: {
          ai_correction?: string | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          content: string
          created_at?: string | null
          edited_at?: string | null
          grammar_issues?: Json | null
          id?: string
          is_edited?: boolean | null
          match_id: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          read_by?: string[] | null
          sender_id?: string | null
          sender_type?: string
          topic_relevance_score?: number | null
          transcript?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_correction?: string | null
          audio_duration_seconds?: number | null
          audio_url?: string | null
          content?: string
          created_at?: string | null
          edited_at?: string | null
          grammar_issues?: Json | null
          id?: string
          is_edited?: boolean | null
          match_id?: string
          message_type?: Database["public"]["Enums"]["message_type"] | null
          read_by?: string[] | null
          sender_id?: string | null
          sender_type?: string
          topic_relevance_score?: number | null
          transcript?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          full_name: string | null
          gender: string | null
          id: string
          interests: string[] | null
          last_active_at: string | null
          learning_language: string | null
          native_language: string | null
          onboarding_completed: boolean | null
          proficiency_level:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          role: Database["public"]["Enums"]["user_role"]
          school_id: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          interests?: string[] | null
          last_active_at?: string | null
          learning_language?: string | null
          native_language?: string | null
          onboarding_completed?: boolean | null
          proficiency_level?:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          last_active_at?: string | null
          learning_language?: string | null
          native_language?: string | null
          onboarding_completed?: boolean | null
          proficiency_level?:
            | Database["public"]["Enums"]["proficiency_level"]
            | null
          role?: Database["public"]["Enums"]["user_role"]
          school_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          country: string | null
          created_at: string | null
          domain: string | null
          id: string
          max_students: number | null
          name: string
          settings: Json | null
          subscription_tier: string | null
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          max_students?: number | null
          name: string
          settings?: Json | null
          subscription_tier?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          domain?: string | null
          id?: string
          max_students?: number | null
          name?: string
          settings?: Json | null
          subscription_tier?: string | null
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      session_reports: {
        Row: {
          agent_observations: string | null
          avg_participation: number | null
          avg_topic_adherence: number | null
          conversation_highlights: Json | null
          created_at: string | null
          curriculum_topic_id: string | null
          flagged_for_review: boolean | null
          generated_at: string | null
          generated_by: string | null
          grammar_patterns_covered: string[] | null
          id: string
          key_vocabulary_practiced: string[] | null
          match_id: string
          objectives_met: string[] | null
          participant_ids: string[]
          school_id: string | null
          teacher_notes: string | null
          total_corrections: number | null
          total_duration_seconds: number | null
          total_grammar_issues: number | null
          total_messages: number | null
          updated_at: string | null
        }
        Insert: {
          agent_observations?: string | null
          avg_participation?: number | null
          avg_topic_adherence?: number | null
          conversation_highlights?: Json | null
          created_at?: string | null
          curriculum_topic_id?: string | null
          flagged_for_review?: boolean | null
          generated_at?: string | null
          generated_by?: string | null
          grammar_patterns_covered?: string[] | null
          id?: string
          key_vocabulary_practiced?: string[] | null
          match_id: string
          objectives_met?: string[] | null
          participant_ids: string[]
          school_id?: string | null
          teacher_notes?: string | null
          total_corrections?: number | null
          total_duration_seconds?: number | null
          total_grammar_issues?: number | null
          total_messages?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_observations?: string | null
          avg_participation?: number | null
          avg_topic_adherence?: number | null
          conversation_highlights?: Json | null
          created_at?: string | null
          curriculum_topic_id?: string | null
          flagged_for_review?: boolean | null
          generated_at?: string | null
          generated_by?: string | null
          grammar_patterns_covered?: string[] | null
          id?: string
          key_vocabulary_practiced?: string[] | null
          match_id?: string
          objectives_met?: string[] | null
          participant_ids?: string[]
          school_id?: string | null
          teacher_notes?: string | null
          total_corrections?: number | null
          total_duration_seconds?: number | null
          total_grammar_issues?: number | null
          total_messages?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "session_reports_curriculum_topic_id_fkey"
            columns: ["curriculum_topic_id"]
            isOneToOne: false
            referencedRelation: "curriculum_topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_unread_message_counts: {
        Args: { user_uuid: string }
        Returns: {
          match_id: string
          unread_count: number
        }[]
      }
      mark_messages_as_read: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      match_status: "pending" | "active" | "completed" | "cancelled"
      message_type: "text" | "voice" | "system" | "correction" | "redirect"
      proficiency_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
      user_role: "student" | "teacher" | "admin" | "school_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      match_status: ["pending", "active", "completed", "cancelled"],
      message_type: ["text", "voice", "system", "correction", "redirect"],
      proficiency_level: ["A1", "A2", "B1", "B2", "C1", "C2"],
      user_role: ["student", "teacher", "admin", "school_admin"],
    },
  },
} as const
