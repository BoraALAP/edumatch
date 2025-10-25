


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."match_status" AS ENUM (
    'pending',
    'active',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."match_status" OWNER TO "postgres";


CREATE TYPE "public"."message_type" AS ENUM (
    'text',
    'voice',
    'system',
    'correction',
    'redirect',
    'feedback'
);


ALTER TYPE "public"."message_type" OWNER TO "postgres";


CREATE TYPE "public"."proficiency_level" AS ENUM (
    'A1',
    'A2',
    'B1',
    'B2',
    'C1',
    'C2'
);


ALTER TYPE "public"."proficiency_level" OWNER TO "postgres";


CREATE TYPE "public"."seat_type" AS ENUM (
    'regular',
    'graduate'
);


ALTER TYPE "public"."seat_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'student',
    'teacher',
    'admin',
    'school_admin',
    'individual'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_seat_availability"("p_school_id" "uuid", "p_seat_type" "public"."seat_type" DEFAULT 'regular'::"public"."seat_type") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  school_seats_total INTEGER;
  school_seats_regular INTEGER;
  school_seats_graduate INTEGER;
  result JSONB;
BEGIN
  -- Get school seat info
  SELECT 
    seats_total,
    seats_regular_used,
    seats_graduate_used
  INTO 
    school_seats_total,
    school_seats_regular,
    school_seats_graduate
  FROM schools
  WHERE id = p_school_id;
  
  -- Check if school exists
  IF school_seats_total IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'School not found'
    );
  END IF;
  
  -- Calculate total used seats
  IF (school_seats_regular + school_seats_graduate) >= school_seats_total THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'No seats available',
      'seats_total', school_seats_total,
      'seats_used', school_seats_regular + school_seats_graduate,
      'seats_remaining', 0
    );
  END IF;
  
  -- Seats are available
  RETURN jsonb_build_object(
    'available', true,
    'seats_total', school_seats_total,
    'seats_regular_used', school_seats_regular,
    'seats_graduate_used', school_seats_graduate,
    'seats_remaining', school_seats_total - (school_seats_regular + school_seats_graduate)
  );
END;
$$;


ALTER FUNCTION "public"."check_seat_availability"("p_school_id" "uuid", "p_seat_type" "public"."seat_type") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_seat_availability"("p_school_id" "uuid", "p_seat_type" "public"."seat_type") IS 'Check if school has available seats before sending invitations.';



CREATE OR REPLACE FUNCTION "public"."convert_to_graduate"("user_id" "uuid", "admin_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_school_id UUID;
  admin_school_id UUID;
  user_current_role user_role;
  result JSONB;
BEGIN
  -- Get user's school and role
  SELECT school_id, role INTO user_school_id, user_current_role
  FROM profiles
  WHERE id = user_id;
  
  -- Get admin's school
  SELECT school_id INTO admin_school_id
  FROM profiles
  WHERE id = admin_user_id AND role = 'school_admin';
  
  -- Validate admin is from same school
  IF admin_school_id IS NULL OR admin_school_id != user_school_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only school admins can mark students as graduates in their school'
    );
  END IF;
  
  -- Check if user is a student
  IF user_current_role != 'student' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only students can be marked as graduates'
    );
  END IF;
  
  -- Convert to graduate
  UPDATE profiles
  SET 
    seat_type = 'graduate',
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Seat counts will be automatically updated by trigger
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully marked student as graduate'
  );
END;
$$;


ALTER FUNCTION "public"."convert_to_graduate"("user_id" "uuid", "admin_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."convert_to_graduate"("user_id" "uuid", "admin_user_id" "uuid") IS 'Mark a student as graduate (admin only). Seat remains occupied but type changes.';



CREATE OR REPLACE FUNCTION "public"."convert_to_individual"("user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  old_school_id UUID;
  old_role user_role;
  result JSONB;
BEGIN
  -- Get current profile info
  SELECT school_id, role INTO old_school_id, old_role
  FROM profiles
  WHERE id = user_id;
  
  -- Check if user is eligible for conversion (must be school member)
  IF old_school_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User is already an individual'
    );
  END IF;
  
  -- Check if user is school_admin (cannot convert directly)
  IF old_role = 'school_admin' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'School admins cannot convert to individual. Please transfer admin role first.'
    );
  END IF;
  
  -- Perform conversion
  UPDATE profiles
  SET 
    school_id = NULL,
    seat_type = NULL,
    role = 'individual',
    allow_global_matching = false, -- Reset to default
    updated_at = NOW()
  WHERE id = user_id;
  
  -- Note: The update_school_seats_trigger will automatically update seat counts
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Successfully converted to individual user',
    'previous_school_id', old_school_id,
    'previous_role', old_role
  );
END;
$$;


ALTER FUNCTION "public"."convert_to_individual"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."convert_to_individual"("user_id" "uuid") IS 'Convert a school student/graduate to an individual user. Frees up seat immediately.';



CREATE OR REPLACE FUNCTION "public"."get_matching_pool"("user_id" "uuid") RETURNS TABLE("profile_id" "uuid", "display_name" "text", "proficiency_level" "public"."proficiency_level", "interests" "text"[], "bio" "text", "can_match" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_school_id UUID;
  user_allow_global BOOLEAN;
BEGIN
  -- Get user's school and global matching preference
  SELECT school_id, allow_global_matching 
  INTO user_school_id, user_allow_global
  FROM profiles
  WHERE id = user_id;
  
  -- If user is an individual (no school_id)
  IF user_school_id IS NULL THEN
    -- Return other individuals only
    RETURN QUERY
    SELECT 
      p.id,
      p.display_name,
      p.proficiency_level,
      p.interests,
      p.bio,
      true as can_match
    FROM profiles p
    WHERE p.school_id IS NULL 
      AND p.id != user_id
      AND p.onboarding_completed = true;
      
  -- If user is school member with global matching enabled
  ELSIF user_allow_global = true THEN
    -- Return school members + individuals
    RETURN QUERY
    SELECT 
      p.id,
      p.display_name,
      p.proficiency_level,
      p.interests,
      p.bio,
      true as can_match
    FROM profiles p
    WHERE p.onboarding_completed = true
      AND p.id != user_id
      AND (
        p.school_id = user_school_id  -- Same school
        OR p.school_id IS NULL        -- Individuals
      );
      
  -- If user is school member without global matching
  ELSE
    -- Return only school members from same school
    RETURN QUERY
    SELECT 
      p.id,
      p.display_name,
      p.proficiency_level,
      p.interests,
      p.bio,
      true as can_match
    FROM profiles p
    WHERE p.school_id = user_school_id
      AND p.id != user_id
      AND p.onboarding_completed = true;
  END IF;
END;
$$;


ALTER FUNCTION "public"."get_matching_pool"("user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_matching_pool"("user_id" "uuid") IS 'Get list of profiles a user can match with, respecting privacy boundaries.';



CREATE OR REPLACE FUNCTION "public"."get_unread_message_counts"("user_uuid" "uuid") RETURNS TABLE("match_id" "uuid", "unread_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id AS match_id,
    COUNT(msg.id) AS unread_count
  FROM matches m
  LEFT JOIN messages msg ON msg.match_id = m.id
  WHERE 
    (m.student1_id = user_uuid OR m.student2_id = user_uuid)
    AND msg.id IS NOT NULL
    AND msg.sender_id != user_uuid
    AND msg.sender_type = 'user'
    AND (msg.read_by IS NULL OR NOT (user_uuid = ANY(msg.read_by)))
  GROUP BY m.id;
END;
$$;


ALTER FUNCTION "public"."get_unread_message_counts"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role user_role;
  should_complete_onboarding boolean;
BEGIN
  -- Check if user is signing up as school admin
  IF (NEW.raw_user_meta_data->>'is_school_admin')::boolean = true THEN
    user_role := 'school_admin';
    should_complete_onboarding := false; -- Will complete via /schools/setup
  ELSE
    user_role := 'individual';
    should_complete_onboarding := false; -- Will complete via /onboarding
  END IF;

  -- Insert profile with appropriate role
  INSERT INTO public.profiles (
    id,
    full_name,
    display_name,
    avatar_url,
    role,
    onboarding_completed
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    user_role,
    should_complete_onboarding
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_session_message_count"("p_session_id" "uuid", "p_is_correction" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE solo_practice_sessions
  SET 
    message_count = message_count + 1,
    correction_count = CASE WHEN p_is_correction THEN correction_count + 1 ELSE correction_count END,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;
END;
$$;


ALTER FUNCTION "public"."increment_session_message_count"("p_session_id" "uuid", "p_is_correction" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE messages
  SET read_by = CASE 
    WHEN read_by IS NULL THEN ARRAY[p_user_id]
    WHEN NOT (p_user_id = ANY(read_by)) THEN array_append(read_by, p_user_id)
    ELSE read_by
  END
  WHERE match_id = p_match_id
    AND sender_id != p_user_id
    AND sender_type = 'user'
    AND (read_by IS NULL OR NOT (p_user_id = ANY(read_by)));
END;
$$;


ALTER FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rpc_check_school_seat_availability"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_school_id UUID;
BEGIN
  -- Get current user's school
  SELECT school_id INTO user_school_id
  FROM profiles
  WHERE id = auth.uid() AND role = 'school_admin';
  
  IF user_school_id IS NULL THEN
    RETURN jsonb_build_object(
      'available', false,
      'error', 'Only school admins can check seat availability'
    );
  END IF;
  
  RETURN check_seat_availability(user_school_id);
END;
$$;


ALTER FUNCTION "public"."rpc_check_school_seat_availability"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_check_school_seat_availability"() IS 'Frontend RPC: Check seat availability for current school admin';



CREATE OR REPLACE FUNCTION "public"."rpc_convert_to_individual"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN convert_to_individual(auth.uid());
END;
$$;


ALTER FUNCTION "public"."rpc_convert_to_individual"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_convert_to_individual"() IS 'Frontend RPC: Convert current authenticated user from school member to individual';



CREATE OR REPLACE FUNCTION "public"."rpc_get_my_matching_pool"() RETURNS TABLE("profile_id" "uuid", "display_name" "text", "proficiency_level" "public"."proficiency_level", "interests" "text"[], "bio" "text", "can_match" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY SELECT * FROM get_matching_pool(auth.uid());
END;
$$;


ALTER FUNCTION "public"."rpc_get_my_matching_pool"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_get_my_matching_pool"() IS 'Frontend RPC: Get profiles current user can match with';



CREATE OR REPLACE FUNCTION "public"."rpc_mark_student_as_graduate"("student_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN convert_to_graduate(student_id, auth.uid());
END;
$$;


ALTER FUNCTION "public"."rpc_mark_student_as_graduate"("student_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."rpc_mark_student_as_graduate"("student_id" "uuid") IS 'Frontend RPC: School admin marks a student as graduate';



CREATE OR REPLACE FUNCTION "public"."set_default_profile_role"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If no role is set and no school_id, default to individual
  IF NEW.role IS NULL AND NEW.school_id IS NULL THEN
    NEW.role := 'individual';
  END IF;
  
  -- If no role is set but has school_id, default to student
  IF NEW.role IS NULL AND NEW.school_id IS NOT NULL THEN
    NEW.role := 'student';
    NEW.seat_type := 'regular';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_default_profile_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_school_seat_counts"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Simply return without doing the count updates for now
  -- This will stop the infinite recursion
  -- We can handle seat counting separately if needed
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_school_seat_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_match_school"("student1" "uuid", "student2" "uuid", "match_school" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  school_count INTEGER;
  shared_school UUID;
BEGIN
  IF match_school IS NULL THEN
    RETURN TRUE;
  END IF;

  SELECT COUNT(DISTINCT p.school_id), MAX(p.school_id)
    INTO school_count, shared_school
  FROM public.profiles p
  WHERE p.id = student1 OR p.id = student2;

  IF school_count > 1 THEN
    RETURN FALSE;
  END IF;

  IF shared_school IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN shared_school = match_school;
END;
$$;


ALTER FUNCTION "public"."validate_match_school"("student1" "uuid", "student2" "uuid", "match_school" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."conversation_summaries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "summary_window_start" timestamp with time zone NOT NULL,
    "summary_window_end" timestamp with time zone NOT NULL,
    "message_count" integer DEFAULT 0 NOT NULL,
    "compressed_context" "text" NOT NULL,
    "key_grammar_patterns" "text"[] DEFAULT '{}'::"text"[],
    "topic_keywords" "text"[] DEFAULT '{}'::"text"[],
    "notable_corrections" "jsonb" DEFAULT '[]'::"jsonb",
    "participant_turns" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_summaries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."curriculum_topics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "difficulty_level" "text",
    "grammar_focus" "text"[],
    "keywords" "text"[],
    "learning_objectives" "text"[],
    "duration_minutes" integer DEFAULT 30,
    "is_active" boolean DEFAULT true,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "curriculum_topics_difficulty_level_check" CHECK (("difficulty_level" = ANY (ARRAY['A1'::"text", 'A2'::"text", 'B1'::"text", 'B2'::"text", 'C1'::"text", 'C2'::"text"])))
);


ALTER TABLE "public"."curriculum_topics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "student_id" "uuid" NOT NULL,
    "summary" "text",
    "strengths" "text"[],
    "areas_for_improvement" "text"[],
    "grammar_patterns" "jsonb",
    "vocabulary_used" "text"[],
    "participation_score" numeric(3,2),
    "topic_adherence_score" numeric(3,2),
    "fluency_score" numeric(3,2),
    "next_steps" "text"[],
    "recommended_topics" "uuid"[],
    "generated_by" "text" DEFAULT 'feedback_agent'::"text",
    "agent_model" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."matches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_type" "text" DEFAULT 'peer'::"text" NOT NULL,
    "student1_id" "uuid" NOT NULL,
    "student2_id" "uuid",
    "curriculum_topic_id" "uuid",
    "school_id" "uuid",
    "ai_agent_enabled" boolean DEFAULT true,
    "ai_agent_type" "text" DEFAULT 'listener'::"text",
    "ai_agent_config" "jsonb" DEFAULT '{}'::"jsonb",
    "scheduled_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "duration_seconds" integer,
    "matched_interests" "text"[],
    "matched_level" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."match_status" DEFAULT 'pending'::"public"."match_status" NOT NULL,
    CONSTRAINT "matches_ai_agent_type_check" CHECK (("ai_agent_type" = ANY (ARRAY['listener'::"text", 'coach'::"text", 'reviewer'::"text"]))),
    CONSTRAINT "matches_same_school_check" CHECK ("public"."validate_match_school"("student1_id", "student2_id", "school_id")),
    CONSTRAINT "matches_session_type_check" CHECK (("session_type" = ANY (ARRAY['peer'::"text", 'solo'::"text", 'group'::"text"])))
);


ALTER TABLE "public"."matches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "sender_id" "uuid",
    "sender_type" "text" DEFAULT 'user'::"text" NOT NULL,
    "content" "text" NOT NULL,
    "grammar_issues" "jsonb",
    "ai_correction" "text",
    "topic_relevance_score" numeric(3,2),
    "audio_url" "text",
    "audio_duration_seconds" integer,
    "transcript" "text",
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp with time zone,
    "read_by" "uuid"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "message_type" "public"."message_type" DEFAULT 'text'::"public"."message_type",
    CONSTRAINT "messages_sender_type_check" CHECK (("sender_type" = ANY (ARRAY['user'::"text", 'ai_system'::"text", 'ai_correction'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "school_id" "uuid",
    "full_name" "text",
    "display_name" "text",
    "interests" "text"[] DEFAULT '{}'::"text"[],
    "native_language" "text",
    "learning_language" "text",
    "avatar_url" "text",
    "bio" "text",
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "last_active_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "onboarding_completed" boolean DEFAULT false,
    "age" integer,
    "gender" "text",
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role" NOT NULL,
    "proficiency_level" "public"."proficiency_level",
    "seat_type" "public"."seat_type",
    "allow_global_matching" boolean DEFAULT false,
    "learning_goals" "text"[] DEFAULT ARRAY[]::"text"[],
    CONSTRAINT "profiles_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text", 'prefer_not_to_say'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."role" IS 'User role: individual (no school), student/teacher (school member), school_admin (manages school), admin (platform admin)';



COMMENT ON COLUMN "public"."profiles"."seat_type" IS 'Type of seat occupied: regular for active students/teachers, graduate for alumni, null for individuals';



COMMENT ON COLUMN "public"."profiles"."allow_global_matching" IS 'Per-user override: allow this school user to match with individuals in global pool';



COMMENT ON COLUMN "public"."profiles"."learning_goals" IS 'Array of learning goals for individual users onboarding';



CREATE TABLE IF NOT EXISTS "public"."schools" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "domain" "text",
    "country" "text",
    "timezone" "text" DEFAULT 'UTC'::"text",
    "subscription_tier" "text" DEFAULT 'free'::"text",
    "max_students" integer DEFAULT 50,
    "settings" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "invitation_settings" "jsonb" DEFAULT '{"allowed_domains": [], "require_approval": false, "auto_accept_domain": false, "default_student_settings": {}}'::"jsonb" NOT NULL,
    "admin_email" "text",
    "admin_name" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "allow_global_matching" boolean DEFAULT false,
    "plan_details" "jsonb",
    "seats_total" integer DEFAULT 0,
    "seats_regular_used" integer DEFAULT 0,
    "seats_graduate_used" integer DEFAULT 0,
    CONSTRAINT "schools_subscription_tier_check" CHECK (("subscription_tier" = ANY (ARRAY['free'::"text", 'basic'::"text", 'premium'::"text", 'enterprise'::"text"])))
);


ALTER TABLE "public"."schools" OWNER TO "postgres";


COMMENT ON COLUMN "public"."schools"."allow_global_matching" IS 'School-wide setting: allow students to partner with individuals in global pool';



COMMENT ON COLUMN "public"."schools"."plan_details" IS 'JSON containing plan_tier, seats_total, seats_regular, seats_graduate, billing info';



CREATE TABLE IF NOT EXISTS "public"."session_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "match_id" "uuid" NOT NULL,
    "school_id" "uuid",
    "curriculum_topic_id" "uuid",
    "total_messages" integer DEFAULT 0,
    "total_duration_seconds" integer,
    "participant_ids" "uuid"[] NOT NULL,
    "avg_topic_adherence" numeric(3,2),
    "avg_participation" numeric(3,2),
    "total_corrections" integer DEFAULT 0,
    "total_grammar_issues" integer DEFAULT 0,
    "objectives_met" "text"[],
    "key_vocabulary_practiced" "text"[],
    "grammar_patterns_covered" "text"[],
    "agent_observations" "text",
    "conversation_highlights" "jsonb",
    "teacher_notes" "text",
    "flagged_for_review" boolean DEFAULT false,
    "generated_by" "text" DEFAULT 'feedback_agent'::"text",
    "generated_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."solo_practice_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "has_correction" boolean DEFAULT false,
    "correction_type" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "solo_practice_messages_correction_type_check" CHECK (("correction_type" = ANY (ARRAY['grammar'::"text", 'vocabulary'::"text", 'topic_redirect'::"text"]))),
    CONSTRAINT "solo_practice_messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."solo_practice_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."solo_practice_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "proficiency_level" "text",
    "learning_goals" "text"[],
    "grammar_focus" "text"[],
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "ended_at" timestamp with time zone,
    "last_activity_at" timestamp with time zone DEFAULT "now"(),
    "ai_model" "text" DEFAULT 'gpt-4o-mini'::"text",
    "ai_temperature" numeric DEFAULT 0.8,
    "message_count" integer DEFAULT 0,
    "correction_count" integer DEFAULT 0,
    "duration_minutes" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "solo_practice_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."solo_practice_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "school_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'student'::"public"."user_role",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "token" "text" NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '7 days'::interval) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "student_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."student_invitations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."curriculum_topics"
    ADD CONSTRAINT "curriculum_topics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_logs"
    ADD CONSTRAINT "feedback_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_summaries"
    ADD CONSTRAINT "no_overlapping_summaries" UNIQUE ("match_id", "summary_window_start");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_domain_key" UNIQUE ("domain");



ALTER TABLE ONLY "public"."schools"
    ADD CONSTRAINT "schools_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_reports"
    ADD CONSTRAINT "session_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solo_practice_messages"
    ADD CONSTRAINT "solo_practice_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."solo_practice_sessions"
    ADD CONSTRAINT "solo_practice_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_invitations"
    ADD CONSTRAINT "student_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_invitations"
    ADD CONSTRAINT "student_invitations_token_key" UNIQUE ("token");



CREATE INDEX "idx_conversation_summaries_match_id" ON "public"."conversation_summaries" USING "btree" ("match_id");



CREATE INDEX "idx_conversation_summaries_window" ON "public"."conversation_summaries" USING "btree" ("match_id", "summary_window_start", "summary_window_end");



CREATE INDEX "idx_curriculum_topics_difficulty_level" ON "public"."curriculum_topics" USING "btree" ("difficulty_level");



CREATE INDEX "idx_curriculum_topics_is_active" ON "public"."curriculum_topics" USING "btree" ("is_active");



CREATE INDEX "idx_curriculum_topics_school_id" ON "public"."curriculum_topics" USING "btree" ("school_id");



CREATE INDEX "idx_feedback_logs_created_at" ON "public"."feedback_logs" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_feedback_logs_match_id" ON "public"."feedback_logs" USING "btree" ("match_id");



CREATE INDEX "idx_feedback_logs_student_id" ON "public"."feedback_logs" USING "btree" ("student_id");



CREATE INDEX "idx_matches_created_at" ON "public"."matches" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_matches_curriculum_topic_id" ON "public"."matches" USING "btree" ("curriculum_topic_id");



CREATE INDEX "idx_matches_school_id" ON "public"."matches" USING "btree" ("school_id");



CREATE INDEX "idx_matches_student1_id" ON "public"."matches" USING "btree" ("student1_id");



CREATE INDEX "idx_matches_student2_id" ON "public"."matches" USING "btree" ("student2_id");



CREATE INDEX "idx_messages_created_at" ON "public"."messages" USING "btree" ("match_id", "created_at");



CREATE INDEX "idx_messages_match_id" ON "public"."messages" USING "btree" ("match_id");



CREATE INDEX "idx_messages_sender_id" ON "public"."messages" USING "btree" ("sender_id");



CREATE INDEX "idx_messages_sender_type" ON "public"."messages" USING "btree" ("sender_type");



CREATE INDEX "idx_profiles_interests" ON "public"."profiles" USING "gin" ("interests");



CREATE INDEX "idx_profiles_onboarding_completed" ON "public"."profiles" USING "btree" ("onboarding_completed");



CREATE INDEX "idx_profiles_school_id" ON "public"."profiles" USING "btree" ("school_id");



CREATE INDEX "idx_schools_domain" ON "public"."schools" USING "btree" ("domain");



CREATE INDEX "idx_session_reports_created_at" ON "public"."session_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_session_reports_curriculum_topic_id" ON "public"."session_reports" USING "btree" ("curriculum_topic_id");



CREATE INDEX "idx_session_reports_flagged" ON "public"."session_reports" USING "btree" ("flagged_for_review");



CREATE INDEX "idx_session_reports_match_id" ON "public"."session_reports" USING "btree" ("match_id");



CREATE INDEX "idx_session_reports_school_id" ON "public"."session_reports" USING "btree" ("school_id");



CREATE INDEX "idx_solo_messages_created_at" ON "public"."solo_practice_messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_solo_messages_session_id" ON "public"."solo_practice_messages" USING "btree" ("session_id");



CREATE INDEX "idx_solo_sessions_started_at" ON "public"."solo_practice_sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_solo_sessions_status" ON "public"."solo_practice_sessions" USING "btree" ("status");



CREATE INDEX "idx_solo_sessions_student_id" ON "public"."solo_practice_sessions" USING "btree" ("student_id");



CREATE INDEX "idx_student_invitations_lower_email" ON "public"."student_invitations" USING "btree" ("lower"("email"));



CREATE INDEX "idx_student_invitations_school_status" ON "public"."student_invitations" USING "btree" ("school_id", "status");



CREATE UNIQUE INDEX "student_invitations_unique_pending_email_per_school" ON "public"."student_invitations" USING "btree" ("school_id", "lower"("email")) WHERE ("status" = 'pending'::"text");



CREATE OR REPLACE TRIGGER "set_profile_role_trigger" BEFORE INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_default_profile_role"();



CREATE OR REPLACE TRIGGER "update_conversation_summaries_updated_at" BEFORE UPDATE ON "public"."conversation_summaries" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_curriculum_topics_updated_at" BEFORE UPDATE ON "public"."curriculum_topics" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feedback_logs_updated_at" BEFORE UPDATE ON "public"."feedback_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_matches_updated_at" BEFORE UPDATE ON "public"."matches" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_messages_updated_at" BEFORE UPDATE ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_school_seats_trigger" AFTER INSERT OR DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_school_seat_counts"();



CREATE OR REPLACE TRIGGER "update_schools_updated_at" BEFORE UPDATE ON "public"."schools" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_session_reports_updated_at" BEFORE UPDATE ON "public"."session_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_solo_practice_sessions_updated_at" BEFORE UPDATE ON "public"."solo_practice_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_student_invitations_updated_at" BEFORE UPDATE ON "public"."student_invitations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."conversation_summaries"
    ADD CONSTRAINT "conversation_summaries_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."curriculum_topics"
    ADD CONSTRAINT "curriculum_topics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."curriculum_topics"
    ADD CONSTRAINT "curriculum_topics_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_logs"
    ADD CONSTRAINT "feedback_logs_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_logs"
    ADD CONSTRAINT "feedback_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_curriculum_topic_id_fkey" FOREIGN KEY ("curriculum_topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_student1_id_fkey" FOREIGN KEY ("student1_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."matches"
    ADD CONSTRAINT "matches_student2_id_fkey" FOREIGN KEY ("student2_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_reports"
    ADD CONSTRAINT "session_reports_curriculum_topic_id_fkey" FOREIGN KEY ("curriculum_topic_id") REFERENCES "public"."curriculum_topics"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."session_reports"
    ADD CONSTRAINT "session_reports_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_reports"
    ADD CONSTRAINT "session_reports_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solo_practice_messages"
    ADD CONSTRAINT "solo_practice_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."solo_practice_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."solo_practice_sessions"
    ADD CONSTRAINT "solo_practice_sessions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_invitations"
    ADD CONSTRAINT "student_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."student_invitations"
    ADD CONSTRAINT "student_invitations_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE CASCADE;



CREATE POLICY "Allow anonymous insert for test match" ON "public"."messages" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow anonymous read for test match" ON "public"."messages" FOR SELECT USING (true);



CREATE POLICY "Curriculum topics manageable by teachers/admins" ON "public"."curriculum_topics" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'teacher'::"public"."user_role") OR ("profiles"."role" = 'admin'::"public"."user_role")) AND (("curriculum_topics"."school_id" = "profiles"."school_id") OR ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Curriculum topics viewable by school members" ON "public"."curriculum_topics" FOR SELECT USING (("school_id" IN ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))));



CREATE POLICY "School admins can view their school student messages" ON "public"."solo_practice_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."solo_practice_sessions",
    "public"."profiles" "viewer",
    "public"."profiles" "student"
  WHERE (("solo_practice_messages"."session_id" = "solo_practice_sessions"."id") AND ("solo_practice_sessions"."student_id" = "student"."id") AND ("viewer"."id" = "auth"."uid"()) AND ("viewer"."role" = ANY (ARRAY['school_admin'::"public"."user_role", 'admin'::"public"."user_role"])) AND ("viewer"."school_id" IS NOT NULL) AND ("viewer"."school_id" = "student"."school_id")))));



CREATE POLICY "School admins can view their school student sessions" ON "public"."solo_practice_sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "viewer",
    "public"."profiles" "student"
  WHERE (("viewer"."id" = "auth"."uid"()) AND ("student"."id" = "solo_practice_sessions"."student_id") AND ("viewer"."role" = ANY (ARRAY['school_admin'::"public"."user_role", 'admin'::"public"."user_role"])) AND ("viewer"."school_id" IS NOT NULL) AND ("viewer"."school_id" = "student"."school_id")))));



CREATE POLICY "Schools are updatable by admins" ON "public"."schools" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR (("p"."role" = 'school_admin'::"public"."user_role") AND ("p"."school_id" = "schools"."id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND (("p"."role" = 'admin'::"public"."user_role") OR (("p"."role" = 'school_admin'::"public"."user_role") AND ("p"."school_id" = "schools"."id")))))));



CREATE POLICY "Schools are viewable by their members" ON "public"."schools" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."school_id" = "schools"."id") AND ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "Service role can manage summaries" ON "public"."conversation_summaries" USING ((("auth"."jwt"() ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Students can view own feedback" ON "public"."feedback_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'student'::"public"."user_role") AND ("feedback_logs"."student_id" = "auth"."uid"())))));



CREATE POLICY "Students can view own match summaries" ON "public"."conversation_summaries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."matches"
  WHERE (("matches"."id" = "conversation_summaries"."match_id") AND (("matches"."student1_id" = "auth"."uid"()) OR ("matches"."student2_id" = "auth"."uid"()))))));



CREATE POLICY "System can insert feedback" ON "public"."feedback_logs" FOR INSERT WITH CHECK (true);



CREATE POLICY "System can insert reports" ON "public"."session_reports" FOR INSERT WITH CHECK (true);



CREATE POLICY "Teachers can update reports" ON "public"."session_reports" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'teacher'::"public"."user_role") OR ("profiles"."role" = 'admin'::"public"."user_role")) AND (("session_reports"."school_id" = "profiles"."school_id") OR ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Teachers can view school match summaries" ON "public"."conversation_summaries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."profiles"
     JOIN "public"."matches" ON (("matches"."school_id" = "profiles"."school_id")))
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'teacher'::"public"."user_role") OR ("profiles"."role" = 'admin'::"public"."user_role")) AND ("matches"."id" = "conversation_summaries"."match_id")))));



CREATE POLICY "Teachers/admins can view school reports" ON "public"."session_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role" = 'teacher'::"public"."user_role") OR ("profiles"."role" = 'admin'::"public"."user_role")) AND (("session_reports"."school_id" = "profiles"."school_id") OR ("profiles"."role" = 'admin'::"public"."user_role"))))));



CREATE POLICY "Users can create messages in their own sessions" ON "public"."solo_practice_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."solo_practice_sessions"
  WHERE (("solo_practice_sessions"."id" = "solo_practice_messages"."session_id") AND ("solo_practice_sessions"."student_id" = "auth"."uid"())))));



CREATE POLICY "Users can create own solo sessions" ON "public"."solo_practice_sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Users can insert messages to own sessions" ON "public"."solo_practice_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."solo_practice_sessions"
  WHERE (("solo_practice_sessions"."id" = "solo_practice_messages"."session_id") AND ("solo_practice_sessions"."student_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert own matches" ON "public"."matches" FOR INSERT WITH CHECK (("auth"."uid"() = "student1_id"));



CREATE POLICY "Users can update own matches" ON "public"."matches" FOR UPDATE USING ((("auth"."uid"() = "student1_id") OR ("auth"."uid"() = "student2_id"))) WITH CHECK ((("auth"."uid"() = "student1_id") OR ("auth"."uid"() = "student2_id")));



CREATE POLICY "Users can update own solo sessions" ON "public"."solo_practice_sessions" FOR UPDATE USING (("auth"."uid"() = "student_id")) WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Users can view messages from own sessions" ON "public"."solo_practice_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."solo_practice_sessions"
  WHERE (("solo_practice_sessions"."id" = "solo_practice_messages"."session_id") AND ("solo_practice_sessions"."student_id" = "auth"."uid"())))));



CREATE POLICY "Users can view own matches" ON "public"."matches" FOR SELECT USING ((("auth"."uid"() = "student1_id") OR ("auth"."uid"() = "student2_id")));



CREATE POLICY "Users can view own solo sessions" ON "public"."solo_practice_sessions" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Users insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users read matched partners" ON "public"."profiles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."matches"
  WHERE (("matches"."status" = 'active'::"public"."match_status") AND ((("matches"."student1_id" = "auth"."uid"()) AND ("matches"."student2_id" = "profiles"."id")) OR (("matches"."student2_id" = "auth"."uid"()) AND ("matches"."student1_id" = "profiles"."id")))))));



CREATE POLICY "Users read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."conversation_summaries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."curriculum_topics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."matches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "school_admins_manage_invitations" ON "public"."student_invitations" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ((("p"."role" = 'school_admin'::"public"."user_role") AND ("p"."school_id" = "student_invitations"."school_id")) OR ("p"."role" = 'admin'::"public"."user_role")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ((("p"."role" = 'school_admin'::"public"."user_role") AND ("p"."school_id" = "student_invitations"."school_id")) OR ("p"."role" = 'admin'::"public"."user_role"))))));



ALTER TABLE "public"."schools" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "schools_select_policy" ON "public"."schools" FOR SELECT USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'school_admin'::"public"."user_role") AND ("id" = ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



CREATE POLICY "schools_update_policy" ON "public"."schools" FOR UPDATE USING (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'school_admin'::"public"."user_role") AND ("id" = ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"()))))) WITH CHECK (((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = 'school_admin'::"public"."user_role") AND ("id" = ( SELECT "profiles"."school_id"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())))));



ALTER TABLE "public"."session_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solo_practice_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."solo_practice_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_invitations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "students_view_own_invitations" ON "public"."student_invitations" FOR SELECT TO "authenticated" USING ((("status" = 'pending'::"text") AND ("lower"("email") = "lower"((COALESCE(( SELECT "users"."email"
   FROM "auth"."users"
  WHERE ("users"."id" = "auth"."uid"())), ''::character varying))::"text"))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."solo_practice_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."solo_practice_sessions";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."check_seat_availability"("p_school_id" "uuid", "p_seat_type" "public"."seat_type") TO "anon";
GRANT ALL ON FUNCTION "public"."check_seat_availability"("p_school_id" "uuid", "p_seat_type" "public"."seat_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_seat_availability"("p_school_id" "uuid", "p_seat_type" "public"."seat_type") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_to_graduate"("user_id" "uuid", "admin_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_to_graduate"("user_id" "uuid", "admin_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_to_graduate"("user_id" "uuid", "admin_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."convert_to_individual"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."convert_to_individual"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."convert_to_individual"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_matching_pool"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_matching_pool"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_matching_pool"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_message_counts"("user_uuid" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_message_counts"("user_uuid" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_message_counts"("user_uuid" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_session_message_count"("p_session_id" "uuid", "p_is_correction" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_session_message_count"("p_session_id" "uuid", "p_is_correction" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_session_message_count"("p_session_id" "uuid", "p_is_correction" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_messages_as_read"("p_match_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_check_school_seat_availability"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_check_school_seat_availability"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_check_school_seat_availability"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_convert_to_individual"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_convert_to_individual"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_convert_to_individual"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_get_my_matching_pool"() TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_get_my_matching_pool"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_get_my_matching_pool"() TO "service_role";



GRANT ALL ON FUNCTION "public"."rpc_mark_student_as_graduate"("student_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."rpc_mark_student_as_graduate"("student_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."rpc_mark_student_as_graduate"("student_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_default_profile_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_default_profile_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_default_profile_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_school_seat_counts"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_school_seat_counts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_school_seat_counts"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_match_school"("student1" "uuid", "student2" "uuid", "match_school" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."validate_match_school"("student1" "uuid", "student2" "uuid", "match_school" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_match_school"("student1" "uuid", "student2" "uuid", "match_school" "uuid") TO "service_role";


















GRANT ALL ON TABLE "public"."conversation_summaries" TO "anon";
GRANT ALL ON TABLE "public"."conversation_summaries" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_summaries" TO "service_role";



GRANT ALL ON TABLE "public"."curriculum_topics" TO "anon";
GRANT ALL ON TABLE "public"."curriculum_topics" TO "authenticated";
GRANT ALL ON TABLE "public"."curriculum_topics" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_logs" TO "anon";
GRANT ALL ON TABLE "public"."feedback_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_logs" TO "service_role";



GRANT ALL ON TABLE "public"."matches" TO "anon";
GRANT ALL ON TABLE "public"."matches" TO "authenticated";
GRANT ALL ON TABLE "public"."matches" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schools" TO "anon";
GRANT ALL ON TABLE "public"."schools" TO "authenticated";
GRANT ALL ON TABLE "public"."schools" TO "service_role";



GRANT ALL ON TABLE "public"."session_reports" TO "anon";
GRANT ALL ON TABLE "public"."session_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."session_reports" TO "service_role";



GRANT ALL ON TABLE "public"."solo_practice_messages" TO "anon";
GRANT ALL ON TABLE "public"."solo_practice_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."solo_practice_messages" TO "service_role";



GRANT ALL ON TABLE "public"."solo_practice_sessions" TO "anon";
GRANT ALL ON TABLE "public"."solo_practice_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."solo_practice_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."student_invitations" TO "anon";
GRANT ALL ON TABLE "public"."student_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."student_invitations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































RESET ALL;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


