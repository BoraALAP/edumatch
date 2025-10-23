# Solo Practice & Peer Chat Separation

## Overview

This document describes the architectural separation of Solo Practice and Peer Chat features in EduMatch, implemented to provide better organization, maintainability, and feature-specific optimizations.

## Motivation

Originally, both solo practice sessions and peer chats used the same `matches` table, which caused several issues:

1. **Conceptual confusion**: Solo practice and peer chat are fundamentally different features
2. **Data model mismatch**: Solo sessions don't have a `student2_id`, causing null checks everywhere
3. **Different requirements**: Solo practice needs different stats tracking (corrections, AI interactions)
4. **Route confusion**: Both used `/chat/*` routes making it unclear which interface to expect
5. **RLS complexity**: Security policies became convoluted handling both cases

## Database Changes

### New Tables

#### `solo_practice_sessions`
Dedicated table for AI-assisted solo practice sessions:

```sql
- id: UUID (primary key)
- student_id: UUID (foreign key to profiles)
- topic: TEXT
- proficiency_level: TEXT
- learning_goals: TEXT[]
- grammar_focus: TEXT[]
- status: TEXT (active, completed, abandoned)
- started_at: TIMESTAMPTZ
- ended_at: TIMESTAMPTZ
- last_activity_at: TIMESTAMPTZ
- ai_model: TEXT
- ai_temperature: NUMERIC
- message_count: INTEGER
- correction_count: INTEGER
- duration_minutes: INTEGER
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

**Key Features:**
- Tracks AI-specific metrics (corrections, model used)
- Separate status values appropriate for solo sessions
- No `student2_id` - cleaner data model
- Dedicated RLS policies for solo practice

#### `solo_practice_messages`
Messages specific to solo practice sessions:

```sql
- id: UUID (primary key)
- session_id: UUID (foreign key to solo_practice_sessions)
- role: TEXT (user, assistant, system)
- content: TEXT
- has_correction: BOOLEAN
- correction_type: TEXT (grammar, vocabulary, topic_redirect)
- created_at: TIMESTAMPTZ
```

**Key Features:**
- Simplified role model (user, assistant, system) vs complex sender_type
- Explicit correction tracking
- Links to sessions, not matches

### Database Functions

#### `increment_session_message_count`
Automatically updates session statistics when messages are sent:

```sql
increment_session_message_count(
  p_session_id UUID,
  p_is_correction BOOLEAN DEFAULT FALSE
)
```

Updates:
- `message_count`
- `correction_count` (if correction)
- `last_activity_at`

### Data Migration

Existing solo practice data was migrated from `matches` to `solo_practice_sessions`:

```sql
-- Migrated fields:
- id → id (preserved for continuity)
- student1_id → student_id
- ai_agent_config->>'topic' → topic
- matched_level → proficiency_level
- status → status (mapped: active→active, completed→completed, cancelled→abandoned)
- messages → solo_practice_messages (with role mapping)
```

**Result:** 2 existing solo practice sessions successfully migrated

## Route Changes

### Before
```
/chat/[matchId]           - Both solo and peer chat
/dashboard/practice       - Solo practice topic selection
```

### After
```
/practice/[sessionId]     - Solo practice chat (NEW)
/chat/[matchId]           - Peer chat only (UNCHANGED)
/dashboard/practice       - Solo practice topic selection (UNCHANGED)
```

## Component Changes

### New Components

#### `SoloPracticeChatInterface`
Located: `/src/components/practice/SoloPracticeChatInterface.tsx`

Dedicated chat interface for solo practice with:
- AI SDK streaming integration (`useChat` hook)
- Real-time message sync with `solo_practice_messages`
- Session-specific UI (shows topic, stats, coach branding)
- Automatic saving of AI responses to database
- Grammar correction highlighting

**Key Differences from ChatInterface:**
- No peer user display (shows "AI Practice Coach")
- Session stats in header (message count)
- Different message styling (highlights corrections)
- Uses `solo_practice_sessions` and `solo_practice_messages` tables

### Modified Components

#### `ChatInterface` (Future)
Will be updated to:
- Only handle peer-to-peer chats
- Remove solo practice logic
- Add AI SDK streaming for peer chat AI moderation

#### `ChatOverview` (Future)
Will separate:
- Solo practice sessions → Link to `/practice/[sessionId]`
- Peer chats → Link to `/chat/[matchId]`

## API Route Changes

### `/api/practice/chat`
**Updated** to work with solo practice sessions:

**Before:**
```typescript
- Runtime: edge
- Used matches table implicitly
- No database persistence
```

**After:**
```typescript
- Runtime: nodejs (for Supabase server client)
- Requires sessionId in request body
- Saves AI responses to solo_practice_messages
- Updates session stats (message_count, correction_count)
- onFinish callback persists AI responses
```

**Request Format:**
```typescript
{
  messages: Message[],
  data: {
    sessionId: string,      // NEW - required
    topic: string,
    studentLevel: string,
    learningGoals: string[],
    grammarFocus: string[]
  }
}
```

## Row Level Security (RLS)

### Solo Practice Sessions

```sql
-- Users can view/create/update their own sessions
CREATE POLICY "Users can view their own solo practice sessions"
  ON solo_practice_sessions FOR SELECT
  USING (auth.uid() = student_id);

-- School admins can view student sessions
CREATE POLICY "School admins can view student sessions"
  ON solo_practice_sessions FOR SELECT
  USING (
    get_user_role() IN ('school_admin', 'admin')
    AND student belongs to same school
  );
```

### Solo Practice Messages

```sql
-- Users can view messages from their own sessions
CREATE POLICY "Users can view messages from their own sessions"
  ON solo_practice_messages FOR SELECT
  USING (session belongs to user);

-- School admins can view student messages
CREATE POLICY "School admins can view student messages"
  ON solo_practice_messages FOR SELECT
  USING (session's student belongs to same school);
```

## AI SDK Integration

### Streaming Architecture

```
User Input → SoloPracticeChatInterface (Client)
    ↓
    sendMessage({ text: message })
    ↓
POST /api/practice/chat
    ↓
streamText({ model, messages, onFinish })
    ↓
Stream to client (real-time rendering)
    ↓
onFinish → Save to solo_practice_messages
    ↓
Real-time update via Supabase channel
    ↓
UI shows persisted message
```

### Benefits

1. **Real-time responses**: Users see AI typing in real-time
2. **Persistent storage**: All messages saved to database
3. **Session continuity**: Refresh page, conversation persists
4. **Real-time sync**: Multiple tabs stay in sync via Supabase Realtime
5. **Analytics ready**: All data available for reporting

## Benefits of Separation

### 1. **Clearer Data Model**
- No more null `student2_id` checks
- Each table optimized for its use case
- Simpler queries and relationships

### 2. **Better Type Safety**
```typescript
// Before (ambiguous)
interface Match {
  student1_id: string;
  student2_id: string | null;  // Null for solo!
  session_type: 'solo' | 'peer';
}

// After (clear)
interface SoloPracticeSession {
  student_id: string;  // Always set
  topic: string;
  correction_count: number;
}

interface Match {
  student1_id: string;
  student2_id: string;  // Always set for peer chat
}
```

### 3. **Feature-Specific Optimizations**
- Solo practice can track AI metrics (corrections, model used)
- Peer chat can focus on match quality and conversation flow
- Different caching strategies per feature

### 4. **Simplified RLS**
- Each table has clear, single-purpose policies
- No complex "if solo then X else Y" logic
- Easier to audit and maintain

### 5. **Route Clarity**
```
/practice/* → Solo practice (AI coach)
/chat/*     → Peer conversations
```
Users and developers immediately know which feature they're using

### 6. **Independent Scaling**
- Solo practice and peer chat can scale independently
- Different performance characteristics
- Separate monitoring and optimization

## Migration Status

✅ **Completed:**
1. Created `solo_practice_sessions` table
2. Created `solo_practice_messages` table
3. Migrated existing solo sessions (2 sessions, multiple messages)
4. Created `/practice/[sessionId]` route
5. Created `SoloPracticeChatInterface` component
6. Updated `/api/practice/chat` to persist AI responses
7. Added session statistics tracking
8. Fixed RLS policies for matched users

⏳ **Pending:**
1. Update dashboard to link to `/practice/[sessionId]`
2. Update `ChatOverview` to separate solo/peer
3. Add AI SDK streaming to peer chat
4. Update `ChatInterface` for peer-only usage
5. Update TypeScript types
6. Add session end functionality
7. Add feedback/reporting for solo sessions

## Testing

### Manual Testing Checklist

- [ ] Create new solo practice session
- [ ] Send messages in solo practice
- [ ] Verify AI responses are saved to database
- [ ] Refresh page, verify conversation persists
- [ ] Check session stats (message_count, correction_count)
- [ ] Open chat in multiple tabs, verify real-time sync
- [ ] Test RLS: Can't access other users' sessions
- [ ] Test RLS: School admin can view student sessions

### Database Verification

```sql
-- Check sessions
SELECT * FROM solo_practice_sessions;

-- Check messages
SELECT * FROM solo_practice_messages ORDER BY created_at;

-- Check stats are updating
SELECT id, message_count, correction_count FROM solo_practice_sessions;
```

## Future Enhancements

1. **Session Analytics Dashboard**
   - Track progress over time
   - Grammar improvement metrics
   - Topic coverage heatmap

2. **Voice Integration**
   - OpenAI Realtime voice chat
   - Speech-to-text for practice
   - Pronunciation feedback

3. **Curriculum Alignment**
   - Link sessions to curriculum topics
   - Track topic mastery
   - Suggest next topics

4. **Gamification**
   - Streak tracking
   - Achievement badges
   - Leaderboards (within school)

5. **Export & Sharing**
   - Export conversation transcripts
   - Share progress with teachers
   - Parent reports

## Conclusion

The separation of solo practice and peer chat provides a solid foundation for feature-specific development, better data modeling, and improved user experience. Each feature can now evolve independently while maintaining clean architecture and clear responsibilities.

---

**Last Updated:** 2025-01-22
**Status:** In Progress (Core infrastructure complete)
