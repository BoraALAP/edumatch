# Supabase Test Environment Changes

This document tracks all temporary changes made to the Supabase database for testing purposes. These changes should be reverted before moving to production.

## Changes Made (in chronological order)

### 1. Simplified RLS Policies for Testing
**File**: Migration `fix_recursive_policies_and_simplify_for_testing`
**Date**: 2025-10-19

**Changes**:
- Dropped recursive RLS policy on `profiles` table
- Created simplified policies that allow all reads for testing
- Simplified message policies to allow anonymous access

**Original Policies Affected**:
```sql
-- profiles table
DROP POLICY IF EXISTS "Profiles are viewable by school members" ON public.profiles;

-- messages table
DROP POLICY IF EXISTS "Participants can view match messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
```

**New Test Policies**:
```sql
-- Allow all reads on profiles (TEST ONLY)
CREATE POLICY "Profiles are viewable by authenticated users"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow anonymous read/write for test match (TEST ONLY)
CREATE POLICY "Allow anonymous read for test match"
  ON public.messages FOR SELECT
  USING (true);

CREATE POLICY "Allow anonymous insert for test match"
  ON public.messages FOR INSERT
  WITH CHECK (true);
```

**To Revert**:
```sql
-- Drop test policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow anonymous read for test match" ON public.messages;
DROP POLICY IF EXISTS "Allow anonymous insert for test match" ON public.messages;

-- Restore original profiles policy
CREATE POLICY "Profiles are viewable by school members"
  ON public.profiles FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM public.profiles
      WHERE id = auth.uid()
    )
    OR id = auth.uid()
  );

-- Restore original message policies
CREATE POLICY "Participants can view match messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.student1_id = auth.uid() OR matches.student2_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.student1_id = auth.uid() OR matches.student2_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());
```

### 2. Removed Foreign Key Constraint on messages.match_id
**File**: Migration `allow_messages_without_match_for_testing`
**Date**: 2025-10-19

**Changes**:
- Dropped foreign key constraint `messages_match_id_fkey` to allow inserting messages without a valid match record

**Original Constraint**:
```sql
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_match_id_fkey;
```

**To Revert**:
```sql
-- Restore foreign key constraint
ALTER TABLE public.messages
  ADD CONSTRAINT messages_match_id_fkey
  FOREIGN KEY (match_id)
  REFERENCES public.matches(id)
  ON DELETE CASCADE;
```

### 3. Test Data Inserted
**Date**: 2025-10-19

**Data**:
```sql
-- Test school
INSERT INTO public.schools (id, name, domain, subscription_tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'Test School', 'test.edu', 'free');

-- Test curriculum topic
INSERT INTO public.curriculum_topics (id, school_id, title, description, difficulty_level, grammar_focus, keywords, duration_minutes)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  'Travel and Vacation',
  'Practice talking about travel experiences and vacation plans',
  'B1',
  ARRAY['past_simple', 'present_perfect', 'future_plans'],
  ARRAY['travel', 'vacation', 'hotel', 'flight', 'sightseeing'],
  30
);
```

**To Cleanup**:
```sql
-- Delete test messages
DELETE FROM public.messages WHERE match_id = '00000000-0000-0000-0000-000000000100';

-- Delete test data
DELETE FROM public.curriculum_topics WHERE id = '00000000-0000-0000-0000-000000000010';
DELETE FROM public.schools WHERE id = '00000000-0000-0000-0000-000000000001';
```

## Complete Revert Script

Run this script to completely revert all test changes:

```sql
-- 1. Clean up test data
DELETE FROM public.messages WHERE match_id = '00000000-0000-0000-0000-000000000100';
DELETE FROM public.curriculum_topics WHERE id = '00000000-0000-0000-0000-000000000010';
DELETE FROM public.schools WHERE id = '00000000-0000-0000-0000-000000000001';

-- 2. Drop test policies
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Allow anonymous read for test match" ON public.messages;
DROP POLICY IF EXISTS "Allow anonymous insert for test match" ON public.messages;
DROP POLICY IF EXISTS "Allow anonymous read test matches" ON public.matches;

-- 3. Restore original RLS policies
CREATE POLICY "Profiles are viewable by school members"
  ON public.profiles FOR SELECT
  USING (
    school_id IN (
      SELECT p2.school_id FROM public.profiles p2
      WHERE p2.id = auth.uid()
    )
    OR id = auth.uid()
  );

CREATE POLICY "Participants can view match messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.student1_id = auth.uid() OR matches.student2_id = auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
      AND (matches.student1_id = auth.uid() OR matches.student2_id = auth.uid())
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (sender_id = auth.uid());

-- 4. Restore foreign key constraint
ALTER TABLE public.messages
  ADD CONSTRAINT messages_match_id_fkey
  FOREIGN KEY (match_id)
  REFERENCES public.matches(id)
  ON DELETE CASCADE;
```

## Notes
- All changes were made for **testing purposes only**
- The test environment bypasses normal authentication requirements
- Production deployment should NOT include these changes
- Run the complete revert script before production deployment
