# AGENT.md — EduMatch AI Agent Specification

## Overview

**EduMatch** is an AI-assisted speaking-practice platform for schools and students.
The platform connects students based on shared interests and proficiency levels, enabling **AI-moderated real-time conversations** in text or voice.
AI agents listen, correct grammar, redirect topic drift, and provide post-session feedback aligned with school curricula.

Agents are built using the **Mastra Framework** (primary) with OpenAI as a fallback provider, integrated into the Next.js + Supabase architecture via the **AI SDK** (`@ai-sdk/react`, `@ai-sdk/openai`).

### Current Implementation Status (Latest)

**✅ Fully Implemented:**
- Solo text practice with AI coach (with initial greeting message)
- Comprehensive grammar checking (checks every message, shows ✓ for correct messages)
- Real-time message streaming with AI SDK
- Profile management with learning goals
- Peer-to-peer matching system
- Toast notifications (no browser alerts)
- Clickable avatar upload component
- Real-time chat with Supabase Realtime

**🚧 In Progress:**
- Session reports and feedback generation
- Voice practice sessions
- Database table cleanup
- Grammar component unification

**📋 Planned:**
- Finish chat button with report generation
- Teacher dashboards
- Curriculum management
- Assessment and grading

---
## 0. Tech
** Instructions ** 
1. Use command to do the installs 
2. Use MCP to create or check the healt

** use **
- Supabase (with Supabase MCP)
- NextJS 15 (App Router)
- Vercel (deployment)
- Stripe (future - payments)
- Mastra Framework (primary AI provider)
- OpenAI Agents (fallback provider)
- Shadcn UI components
- AI SDK (@ai-sdk/react, @ai-sdk/openai)
- Lucide Icons
- Sonner (toast notifications)
- PNPM (package manager)

---

## 1. System Goals

1. **Connect students for language and communication practice.**  
   Match users by interest, level, and assigned curriculum topic.
2. **Provide real-time AI moderation.**  
   AI listens to chats, corrects grammar, and redirects conversation.
3. **Deliver adaptive feedback.**  
   Generate summaries and learning insights per session.
4. **Enable school-level administration.**  
   Schools manage students, levels, topics, and curricula.
5. **Scale through modular agents and MCP tools.**  
   Future-proof the system to handle subscriptions, content management, and analytics.

---

## 2. Core Agents

### 2.1 Conversation Agent ("Listener")

**Purpose:** Observe 1-to-1 student conversations and provide real-time grammar correction, topic alignment, and vocabulary guidance.

**Current Implementation:**
- ✅ Analyzes EVERY user message for grammar errors
- ✅ Checks all error types: grammar, spelling, vocabulary, idioms, punctuation
- ✅ Marks correct messages with checkmark (✓)
- ✅ Shows corrections inline using CorrectionMessage component
- ✅ Stores detailed grammar analysis in database for reports
- ✅ Level-appropriate feedback (A1-C2)

**Behaviors**
- Monitors text or transcript stream via Supabase Realtime
- Detects ALL language errors (grammar, spelling, vocabulary, idioms)
- Sends brief, encouraging corrections via AI service
- Identifies off-topic messages and redirects conversation
- Maintains tone: friendly, peer-like, and educational
- Analyzes every message but displays corrections strategically

**Context Input**
- Student profiles (names, levels, interests, school, topic).
- Active curriculum topic and grammar focus (from Supabase MCP).
- Conversation transcript buffer.

**Triggers**
- Message creation event from Supabase Realtime.
- Manual override (teacher can summon agent).

---

### 2.2 Solo Practice Agent ("Coach")

**Purpose:** Engage individual learners in real-time voice or text conversation to practice specific topics.

**Current Implementation:**
- ✅ Text-based solo practice with streaming AI responses
- ✅ AI sends randomized greeting to start conversation
- ✅ Real-time grammar analysis with checkmarks for correct messages
- ✅ Session tracking in text_practice_sessions table
- ✅ Message history with grammar metadata
- 🚧 Voice practice (separate implementation)

**Behaviors**
- Starts conversation with friendly AI greeting
- Uses AI SDK streaming for responsive text chat
- Analyzes user messages in background (non-blocking)
- Adjusts complexity based on student level (A1–C2)
- Keeps conversation within assigned topic
- Provides real-time corrections and encouragement

**Context Input**
- Student level, learning goals, topic selection
- Grammar focus areas (optional)
- Conversation history for context

---

### 2.3 Feedback Agent ("Reviewer")

**Purpose:** Summarize sessions and provide actionable feedback.

**Behaviors**
- Reads full conversation history from Supabase.
- Identifies frequent grammar patterns or vocabulary themes.
- Produces a short, friendly summary for the student.
- Generates a teacher-focused analytical report (topic adherence, participation, improvement).

**Context Input**
- Session transcript.
- Curriculum topic metadata.
- Previous student feedback logs.

---

### 2.4 Curriculum Agent ("Planner") - Future - For Teachers

**Purpose:** Interface between school curricula and conversation agents.

**Behaviors**
- Reads and writes curriculum topics via Supabase MCP.
- Maps topics to grammar focuses, difficulty levels, and keywords.
- Provides contextual data for Conversation and Feedback Agents.
- Notifies when topic coverage goals are met.

---

### 2.5 Admin Agent ("Orchestrator")

**Purpose:** Oversee multi-agent coordination and manage permissions.

**Behaviors**
- Authenticates requests from verified school admins.
- Spawns or assigns Conversation Agents to sessions.
- Monitors quotas and agent usage.
- Manages API keys and school-level settings in Supabase.

---

## 3. USE MCP on Development

| MCP | Purpose | Used By |
|------|----------|---------|
| **Supabase MCP** | Database access (users, messages, matches, curricula, feedback). DB
| **Shadcn MCP** | UI component rendering for chat widgets, modals, dashboards. Visual
| **Stripe MCP** (future) | Subscription, billing, and usage tiers for schools and individuals. Payment
| **Figma MCP**  | Design when it is provided
| **Github MCP**  | Use it for checking repo and making sure it is correct


---

## 4. Data Flow & Context Management

### 4.1 Core Data Flow

1. **Student Login**
   Authenticated through Supabase Auth.
   Student profile and school association retrieved via Supabase MCP.

2. **Match Creation**
   Matching logic based on interest, level, and topic (via Supabase MCP query).
   Session record created; Conversation Agent attached.

3. **Live Conversation**
   Messages streamed to OpenAI Realtime API through AI SDK.
   Conversation Agent observes stream, applies correction and redirection rules.
   AI interventions posted as `system` messages back to Supabase.

4. **Session End**
   Feedback Agent triggered via event (`match.status = ended`).
   Summaries stored in `feedback_logs` and `session_reports`.

5. **Teacher Dashboard**
   Admin Agent aggregates reports via Supabase MCP.
   Shadcn MCP renders tables, badges, and progress charts.

### 4.2 Context Compression Strategy

**Problem:** Long conversations exceed AI context windows (100+ messages).

**Solution:** Sliding Window + Rolling Summaries

**Messages Tables - Per-Message Analytics:**

**Peer Chat (matches + messages):**
```
messages:
  - content (text) - actual message
  - message_type (enum) - text/voice/system/correction/redirect
  - grammar_issues (jsonb) - detailed grammar analysis
  - ai_correction (text) - AI's suggested correction
  - topic_relevance_score (numeric) - topic adherence
  - audio_url, transcript, audio_duration - for voice
  - read_by (uuid[]) - message read tracking
```

**Solo Practice (text_practice_sessions + text_practice_messages):**
```
text_practice_messages:
  - session_id (uuid) - FK to text_practice_sessions
  - role (text) - 'user' or 'assistant'
  - content (text) - message text
  - message_type (text) - 'text', 'correction', 'encouragement'
  - grammar_issues (jsonb) - detailed error analysis
  - ai_correction (text) - correction text
  - correction_severity (text) - 'minor', 'moderate', 'major'
  - is_correct (boolean) - ✅ NEW: true if no grammar errors
  - has_correction (boolean) - whether correction was shown
  - corrected_message_id (uuid) - links correction to original message
  - created_at (timestamp)
```

**Conversation Summaries Table - Compressed Context:**
```
conversation_summaries:
  - id (uuid)
  - match_id (uuid) - FK to matches
  - summary_window_start (timestamp) - first message in window
  - summary_window_end (timestamp) - last message in window
  - message_count (int) - how many messages compressed
  - compressed_context (text) - AI-generated summary of window
  - key_grammar_patterns (text[]) - recurring patterns found
  - topic_keywords (text[]) - main topics discussed
  - notable_corrections (jsonb[]) - only important corrections
  - participant_turns (jsonb) - {student_id: turn_count}
  - created_at (timestamp)
```

**Context Window Strategy:**

**For Conversation Agent (Real-time):**
1. **Recent Window:** Last 10-15 raw messages (full detail)
2. **Historical Summaries:** Previous compressed summaries (condensed)
3. **Session Stats:** Running totals (grammar issues, topic drift)
4. **Curriculum Context:** Active topic + grammar focus

**For Feedback Agent (Post-session):**
1. **Full Access:** All messages with complete analytics
2. **Summary Snapshots:** Pre-computed summaries for overview
3. **Aggregated Patterns:** session_reports table for high-level insights

**For Teacher/Student Reports:**
- Teachers get full message history + detailed analytics
- Students get friendly summaries + highlighted corrections
- Both get visual charts from aggregated data

**Compression Triggers:**
- Auto-create summary every 20 messages
- Manual trigger when context approaches token limit
- End-of-session final summary

---

## 5. Agent Context Model

Each agent receives a unified **context envelope**:

| Context Key | Description |
|--------------|-------------|
| `user_profiles` | Basic info, proficiency level, interests |
| `curriculum_topic` | Current school topic and grammar focus |
| `conversation_history` | Recent transcript window (last N turns) |
| `school_policy` | School or teacher-defined preferences |
| `agent_config` | Temperature, intervention frequency, tone settings |
| `permissions` | Access rules based on role (student/teacher/admin) |

Agents query and update context data using the **Supabase MCP**.  
Sensitive data (emails, API keys) never leave MCP boundaries.

---

## 6. Behavioral Policies

1. **Minimal Disruption** — AI interjects sparingly; prioritizes natural flow.  
2. **Tone & Safety** — Friendly, inclusive, positive; compliant with school safety filters.  
3. **Pedagogical Alignment** — Corrections match grammar focus defined in curriculum.  
4. **Privacy** — Agents do not store or reuse raw student conversation text beyond session scope.  
5. **Adaptability** — Language complexity dynamically adjusts per user level.
6. **Safety** - No Negative thoughts or conversations, No Conversation about SEX, SUICIDE, anything that can affect Student in bad way.

---

## 7. Widget & Frontend Integration

**Current Components:**
- ✅ `<SoloPracticeChatInterface />` - AI SDK-based solo text practice with streaming
- ✅ `<ChatInterface />` - Peer-to-peer chat with real-time updates
- ✅ `<CorrectionMessage />` - Grammar correction display component
- ✅ `<AvatarUpload />` - Clickable avatar upload with preview
- ✅ `<MatchingInterface />` - Tinder-style partner matching
- ✅ `<ProfileEditor />` - Profile management with learning goals
- 🚧 `<VoicePracticeSession />` - Voice practice (in progress)
- 📋 `<FeedbackWidget />` - Session summaries (planned)

**Integration Patterns:**
- AI SDK `useChat` hook for streaming conversations
- Supabase Realtime for live message updates
- Toast notifications (Sonner) for user feedback
- Server components fetch data, client components handle interactivity
- AI service abstraction layer (@/lib/ai) supports multiple providers

---

## 8. Future AGENT Extensions

1. **Assessment Agent** — Auto-grade conversation transcripts based on fluency, grammar, and topic adherence.  
2. **Gamification Agent** — Badges, streaks, points, and leaderboard data management.  
3. **Teacher Assignment Agent** — Create and manage custom prompts or guided sessions.  
4. **Notification Agent** — Send reminders via email or chat to prompt new sessions.  
5. **LMS Bridge Agent** — Integration with systems like Moodle or Canvas for student progress sync.

---

## 9. Success Metrics

- AI correction accuracy above 80% (aligned with grammar focus).  
- Less than 1 intervention per 5 user messages (non-intrusive).  
- Session completion rate above 70%.  
- Positive student feedback (>85% satisfaction).  
- School admin adoption with at least 10 pilot institutions.

---

## 10. Security & Compliance

- All data operations handled through MCPs (no direct DB credentials in agents).  
- PII encrypted at rest via Supabase.  
- Compliant with GDPR and FERPA principles for student data.  
- Logging restricted to metadata (timestamps, correction counts).

---

## 11. Roadmap (AI & MCP Focus)

| Phase | Objective | Key Agent or MCP |
|--------|------------|------------------|
| **Phase 1** | Two-person chat with Conversation Agent | Supabase MCP + Shadcn MCP |
| **Phase 2** | Solo Practice voice sessions | Voice MCP |
| **Phase 3** | Feedback summaries & reports | Feedback Agent |
| **Phase 4** | School admin dashboards | Admin Agent |
| **Phase 5** | Curriculum integration | Curriculum Agent |
| **Phase 6** | Subscription & billing layer | Stripe MCP |
| **Phase 7** | Translation & gamification modules | Translation MCP + Gamification MCP |

---

## 12. Output Expectations

- Each agent returns structured responses compatible with the AI SDK (e.g., `role`, `content`, `metadata`).  
- Codex can use MCPs for:
  - Reading/writing Supabase data.  
  - Rendering UI via Shadcn MCP.  
  - Managing subscription tiers via Stripe MCP.  
- Future agents may chain reasoning or call each other’s MCP methods for orchestration.

---

## 13. Development Rules & Best Practices

**Package Management:**
- ✅ Always use PNPM (not npm or yarn)
- ✅ Install latest tags unless alpha is specifically requested

**Code Style:**
- ✅ Don't create icons from scratch - use Lucide icons
- ✅ Always use Theme Colors from Tailwind config
- ✅ DON'T use hardcoded Tailwind color classes (e.g., `text-blue-500`)
- ✅ Use semantic color names: `text-primary`, `bg-secondary`, `text-destructive`

**UI/UX:**
- ✅ NEVER use browser `alert()` - always use toast notifications (Sonner)
- ✅ NEVER use browser `confirm()` - use Shadcn AlertDialog
- ✅ NEVER use browser `prompt()` - use Shadcn Dialog with Input
- ✅ Always use Shadcn components when available
- ✅ Document component purpose at top of file

**Supabase Integration:**
- ✅ Server components: `import { createClient } from '@/lib/supabase/server'`
- ✅ Client components: `import { createClient } from '@/lib/supabase/client'`
- ✅ Mark client components with `'use client'` directive
- ✅ Never expose sensitive data in client components

**File Structure:**
- `/app` - Next.js pages and API routes
- `/components` - Reusable UI components
- `/lib` - Utilities, services, helpers
- `/mastra` - Mastra agent implementations
- `/types` - TypeScript type definitions
- `/constants` - App-wide constants

**API Routes:**
- Use `/app/api` directory for API endpoints
- Always validate input and handle errors
- Return structured JSON responses
- Use Supabase server client for auth

---

This `CLAUDE.md` defines the operational behavior, dependencies, and data responsibilities of all AI agents within the EduMatch platform, enabling development with **Mastra Framework**, **AI SDK**, **Supabase MCP**, and **Shadcn UI**.