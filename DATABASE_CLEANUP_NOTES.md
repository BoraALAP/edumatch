# Database Table Cleanup Analysis

## Investigation Results

After analyzing codebase usage of all database tables, here are the findings:

### ✅ ACTIVE TABLES (Keep)

1. **messages** - Peer-to-peer chat messages
   - Used in: ChatInterface.tsx, admin page, API routes
   - References: 5+ active uses
   - Purpose: Store messages for peer-to-peer conversations

2. **text_practice_messages** + **text_practice_sessions** - Solo text practice
   - Used in: SoloPracticeChatInterface.tsx, practice pages, API routes
   - References: 15+ active uses
   - Purpose: Store solo practice sessions and messages with AI coach

3. **voice_practice_sessions** + **conversation_analytics** - Voice practice
   - Used in: VoicePracticeSession.tsx, analytics-service.ts, SessionSummaryModal.tsx
   - References: 34+ active uses
   - Purpose: Store voice practice sessions and analytics (pronunciation, fluency, accent)

4. **profiles** - User profiles
   - Core table, heavily used throughout app

5. **matches** - Peer matching
   - Used for peer-to-peer practice sessions

### ❌ UNUSED TABLES (Can be removed)

1. **feedback_logs** (or feedbacklog)
   - References: 0
   - Status: No code references found
   - Recommendation: **SAFE TO DROP**

2. **conversation_summaries**
   - References: Only in type definitions, no actual queries
   - Status: Planned but never implemented
   - Recommendation: **SAFE TO DROP** (can be re-added later if needed)

## Current Table Usage Pattern

```
Peer-to-Peer Chat:
  matches -> messages

Solo Text Practice:
  text_practice_sessions -> text_practice_messages

Solo Voice Practice:
  voice_practice_sessions -> conversation_analytics
```

## Recommendations

### 1. Remove unused tables (Optional)

If you want to clean up the database, you can drop these tables:

```sql
-- Drop unused tables
DROP TABLE IF EXISTS feedback_logs CASCADE;
DROP TABLE IF EXISTS conversation_summaries CASCADE;
```

### 2. Keep tables for future use

Alternatively, keep them if you plan to implement:
- `feedback_logs`: Teacher/student feedback system
- `conversation_summaries`: Context compression for long conversations

### 3. Standardization Opportunity

Consider consolidating message tables in the future:
- `messages` (peer chat)
- `text_practice_messages` (solo text)
- Could potentially use a single `messages` table with a `session_type` field

However, current separation is fine for development and provides good isolation.

## Migration Script (If you want to drop unused tables)

To generate a migration to drop unused tables:

```bash
npx supabase migration new drop_unused_tables
```

Then add the SQL above to the migration file.

## Conclusion

✅ **Current database structure is healthy**
- All main tables are actively used
- Only 2 tables are unused (feedback_logs, conversation_summaries)
- No urgent cleanup needed
- Database is well-organized with clear separation between peer and solo practice
