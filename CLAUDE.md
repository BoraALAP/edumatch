# AGENT.md — EduMatch AI Agent Specification

## Overview

**EduMatch** is an AI-assisted speaking-practice platform for schools and students.  
The platform connects students based on shared interests and proficiency levels, enabling **AI-moderated real-time conversations** in text or voice.  
AI agents listen, correct grammar, redirect topic drift, and provide post-session feedback aligned with school curricula.

Agents are built using the **OpenAI Agent Builder** and integrated into the Next.js + Supabase architecture via the **AI SDK** (`@openai/ai-sdk`) following the documentation at [openai.github.io/openai-agents-js](https://openai.github.io/openai-agents-js/).

---
## 0. Tech
** Instructions ** 
1. Use command to do the installs 
2. Use MCP to create or check the healt

** use ** 
- Supabase
- NextJS
- Vercel
- Stripe
- OpenAI Agents
- Shadcn
- AI SDK
- Lucide Icon
- Shadcn based UI Libraries

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

**Behaviors**
- Monitors text or transcript stream.
- Detects grammar and phrasing issues.
- Sends brief, encouraging corrections.
- Identifies off-topic messages and nudges conversation back.
- Maintains tone: friendly, peer-like, and educational.
- Observes cooldown: no more than one correction every ~30 seconds or 2 user turns.

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

**Behaviors**
- Uses OpenAI Realtime Voice (or text if voice unavailable).
- Adjusts complexity of questions and corrections to the student’s level (A1–C1).
- Keeps conversation within assigned topic.
- Provides live encouragement and post-session summary.

**Context Input**
- Student level, current focus grammar, topic keywords.
- Voice model configuration (OpenAI or ElevenLabs).

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

**Messages Table - Per-Message Analytics:**
```
messages:
  - content (text) - actual message
  - message_type (enum) - text/voice/system/correction/redirect
  - grammar_issues (jsonb) - detailed grammar analysis for reports
  - ai_correction (text) - AI's suggested correction shown to students
  - topic_relevance_score (numeric) - per-message topic adherence
  - audio_url, transcript, audio_duration - for voice messages
  - read_by (uuid[]) - message read tracking
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

- Agents exposed to the Next.js frontend through **AI SDK widgets**:
  - `<ChatWidget />` for real-time peer chat.  
  - `<PracticeWidget />` for solo voice sessions.  
  - `<FeedbackWidget />` for post-session summaries.
- Widgets communicate with agents through secure MCP channels.
- State synchronized via Supabase Realtime.

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

## 13. Rules

- Use PNPM
- don't create Icon from Scratch 
- Always use Theme Colors from Tailwind, dont use Tailwind Color classes

---

This `AGENT.md` defines the operational behavior, dependencies, and data responsibilities of all AI agents within the EduMatch platform, enabling Codex to orchestrate them efficiently using **OpenAI’s Agent Builder**, **AI SDK**, and **MCP toolchain**.
- Please don't use alert api of the browser. always use shadcn components as much as you can.