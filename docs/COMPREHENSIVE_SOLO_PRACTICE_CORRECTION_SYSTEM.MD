# Comprehensive Solo Practice Correction System

## Overview

Redesign solo practice to separate corrections from conversation (like peer chat), track detailed correction data, and enable robust teacher reporting on student progress and error patterns.

## Architecture Approach: Hybrid Storage Model

**Why Hybrid?** Store corrections as separate messages (good UX) + detailed metadata on user messages (comprehensive analytics)

---

## Phase 1: Database Schema Enhancements

### 1.1 Migrate `solo_practice_messages` table

Add comprehensive tracking fields:

- `corrected_message_id` (uuid, nullable) - For correction messages, links back to the user message with the error
- `grammar_issues` (jsonb) - Structured error details: `[{original, corrected, explanation, category, severity}]`
- `ai_correction` (text) - The friendly correction message shown to student
- `topic_relevance_score` (numeric) - Track if student stays on topic
- `message_type` (enum: 'text' | 'correction' | 'encouragement' | 'topic_redirect') - Categorize AI messages
- `correction_metadata` (jsonb) - Additional context: error position, surrounding text, suggested practice
- Update `correction_type` to be more specific (grammar_tense, grammar_article, grammar_verb, vocabulary, etc.)

### 1.2 Create `student_error_patterns` materialized view

Pre-aggregated analytics for fast dashboard queries:

- Student ID + grammar category → count, avg severity, first/last occurrence
- Enables instant "student struggles" reporting
- Refresh on correction inserts via trigger

### 1.3 Add database functions

- `analyze_and_insert_correction()` - Atomic function to store correction with metadata
- `get_student_error_summary()` - RPC for dashboard queries

---

## Phase 2: AI Analysis & Detection

### 2.1 Create `/api/practice/analyze-message` endpoint

Separate grammar analysis API (similar to ai-moderate):

- Analyzes user message immediately after submission
- Uses `aiService.checkGrammar()` for structured error detection
- Returns: `{hasIssues, issues: [{original, corrected, explanation, category, severity}], shouldInterject}`
- Only creates correction message if issues found and important enough

### 2.2 Update solo practice agent instructions

Remove inline correction from conversation:

- Agent focuses purely on conversation flow
- Keeps topic engaging and relevant
- Provides encouragement separately from corrections

### 2.3 Add grammar categorization AI prompt

Enhance grammar analysis to categorize errors:

- Tense errors (present/past/future)
- Subject-verb agreement
- Articles (a/an/the)
- Prepositions
- Word order
- Vocabulary choice
- Pronunciation (for future voice)

---

## Phase 3: Reusable UI Components

### 3.1 Create `<CorrectionMessage>` component

Extract correction display logic from peer chat:

- Props: `content`, `isCorrection`, `grammarIssues`, `severity`
- Amber styling for corrections
- "Grammar Tip" badge
- Expandable to show detailed breakdown
- Works in both peer chat and solo practice

### 3.2 Create `<GrammarIssueDetail>` component

Shows individual error with before/after:

```
Original: "I go to Paris yesterday"
Corrected: "I went to Paris yesterday"
Explanation: Use past tense "went" when talking about past events
Category: Tense (Past Simple)
```

### 3.3 Update both chat interfaces

- `ChatInterface.tsx` - Use new `<CorrectionMessage>` component
- `SoloPracticeChatInterface.tsx` - Use new `<CorrectionMessage>` component
- Consistent correction experience across app

---

## Phase 4: Message Flow & Integration

### 4.1 Update solo practice message submission

When user sends message:

1. Save user message to database (role: 'user')
2. Call `/api/practice/analyze-message` with message content + context
3. If corrections needed → create correction message (role: 'assistant', message_type: 'correction')
4. Call main chat API for conversational response (role: 'assistant', message_type: 'text')
5. Both messages appear in UI separately

### 4.2 Handle correction message creation

- Link correction to original user message via `corrected_message_id`
- Store `grammar_issues` jsonb with full detail
- Set appropriate `message_type` and `correction_type`
- Update session correction_count

### 4.3 Prevent over-correction

- Implement cooldown (max 1 correction per 2-3 user messages)
- Priority system (only correct moderate/major errors, let minor ones slide initially)
- Track correction fatigue (if student gets 3+ corrections in a row, pause)

---

## Phase 5: Reporting & Analytics

### 5.1 Teacher Dashboard - Student Error Overview

Query `student_error_patterns` view:

- "Top 5 struggles" - Most frequent error categories
- "Error trend" - Chart showing corrections over time
- "Severity distribution" - How many minor vs major errors
- "Recent corrections" - Last 10 with full context

### 5.2 Student Progress Report

Individual session view:

- Total messages sent
- Corrections received (with severity breakdown)
- Most improved areas (error categories that decreased)
- Areas needing focus (persistent error patterns)
- Sample corrections with original context

### 5.3 Aggregate School Reporting

School-wide analytics:

- Common struggles across all students at each level (A1, A2, etc.)
- Curriculum effectiveness (are students improving on grammar_focus topics?)
- AI correction accuracy (teacher feedback loop)

---

## Phase 6: Future Enhancements (Not in initial scope)

- Correction acceptance/rejection by teachers (quality feedback loop)
- Personalized correction style (strict vs gentle based on student preference)
- Gamification (badges for error-free sessions, improvement streaks)
- Practice exercises generated from error patterns
- Voice transcription error tracking

---

## Implementation Order

1. **Database migration** - Schema updates
2. **Analysis API** - `/api/practice/analyze-message` endpoint
3. **UI components** - `<CorrectionMessage>` and `<GrammarIssueDetail>`
4. **Integration** - Update solo practice flow
5. **Update peer chat** - Use new components
6. **Reporting views** - Teacher dashboard queries
7. **Testing** - End-to-end correction flow

---

## Benefits of This Approach

✅ **Comprehensive tracking** - Every error captured with context  
✅ **Scalable reporting** - Materialized views for fast queries  
✅ **Separation of concerns** - Conversation vs correction logic  
✅ **Reusable components** - DRY principle, consistent UX  
✅ **Future-proof** - Easy to add new error categories, reporting features  
✅ **Teacher-focused** - Designed around "what does teacher need to see?" use case
