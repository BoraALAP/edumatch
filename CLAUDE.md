# AGENT.md — EduMatch AI Agent Specification

## Overview

**EduMatch** is an AI-assisted speaking-practice platform for schools and students.
The platform connects students based on shared interests and proficiency levels, enabling **AI-moderated real-time conversations** in text or voice.
AI agents listen, correct grammar, redirect topic drift, and provide post-session feedback aligned with school curricula.

Agents are built using the **Mastra Framework** (primary) with OpenAI as a fallback provider, integrated into the Next.js + Supabase architecture via the **AI SDK** (`@ai-sdk/react`, `@ai-sdk/openai`).

---

## 🏗️ Quick Architecture Guide

**Before creating ANY new file, use this decision tree:**

```
Where should my new code go?
│
├─ Is it a COMPONENT?
│  ├─ Used in 3+ features? → /components/[domain]/
│  ├─ Used in 1 feature, multiple pages? → /app/[feature]/sections/
│  └─ Used in 1 page only? → /app/[feature]/[page]/sections/
│
├─ Is it a UTILITY/SERVICE?
│  ├─ Feature-specific? → /lib/[feature]/
│  └─ Global utility? → /lib/utils.ts
│
├─ Is it a HOOK?
│  └─ Reusable state logic? → /hooks/useFeatureName.ts
│
└─ Is it a TYPE?
   ├─ Database types? → /types/database.types.ts (generated)
   ├─ Shared across app? → /types/index.ts
   └─ Feature-specific? → Collocate in /app/[feature]/ or /lib/[feature]/
```

**Core Principles:**

1. ✅ **Consistency Over Strict Colocation** - When features are fundamentally similar, prioritize shared components for consistency
2. ✅ **3+ Rule (with exceptions)** - Extract to `/components/` when used in 3+ features, OR when 2+ similar features need consistency
3. ✅ **No Browser Dialogs** - Use Sonner toast, Shadcn AlertDialog/Dialog
4. ✅ **Semantic Colors Only** - Use `text-primary`, never `text-blue-500`
5. ✅ **Server/Client Split** - Pages = server, sections = client

📖 **See Section 0.1 for detailed rules and examples**

---

### Current Implementation Status (Latest)

**✅ Fully Implemented:**

- Solo text practice with AI coach (with initial greeting message)
- Comprehensive grammar checking (checks every message, shows ✓ for correct messages)
- Real-time message streaming with AI SDK
- Profile management with learning goals
- Peer-to-peer matching system with match requests panel
- Toast notifications (Sonner - no browser alerts)
- Clickable avatar upload component
- Real-time chat with Supabase Realtime
- Grammar issue detail view with severity levels
- Session summary modal for practice sessions
- School admin dashboard with student directory
- School invitation system
- Modular page structure (sections-based architecture)

**🚧 In Progress:**

- Voice practice sessions (UI and handlers implemented, testing in progress)
- Voice audio processing with useVoiceAudio and useVoiceEvents hooks
- Session reports and feedback generation

**📋 Planned:**

- Finish chat button with report generation
- Teacher curriculum management interface
- Advanced assessment and grading features
- Enhanced analytics dashboard

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

## 0.1 Architecture Principles & Rules

### Core Principle: Colocation Over Abstraction

**RULE: Put code as close as possible to where it's used. Only generalize when reused 3+ times.**

---

### File Organization Decision Tree

**When creating a NEW component, ask:**

```
Is this component used in 3+ different features?
│
├─ YES → Put in `/components/[category]/`
│         (e.g., /components/ui/, /components/chat/, /components/profile/)
│         ✅ Examples: Button, Card, CorrectionMessage, ProfileAvatar
│
└─ NO → Is it used in multiple pages within the SAME feature?
    │
    ├─ YES → Put in `/app/[feature]/sections/`
    │         ✅ Examples: /app/practice/sections/practice-topic-selector.tsx
    │
    └─ NO → Put in `/app/[feature]/[page]/sections/` or inline in page.tsx
              ✅ Examples: /app/practice/[sessionId]/sections/solo-practice-chat.tsx
```

---

### Exception: Consistency for Similar Features

**When features are fundamentally similar, share components even if used in only 2 places.**

**Example: Chat Interfaces**

Peer chat and solo practice are both chat interfaces with:

- Messages (user + AI)
- Grammar corrections
- Real-time updates
- Similar UI patterns

**Differences:**

- Peer chat: 2 humans + AI moderator
- Solo practice: 1 human + AI coach

**Shared Components (in `/components/chat/`):**

- ✅ `ChatHeader.tsx` - Unified header for all chat types
- ✅ `ChatMessage.tsx` - Message rendering (user/AI)
- ✅ `CorrectionMessage.tsx` - Grammar correction display

**Shared Utilities (in `/lib/chat/`):**

- ✅ `utils.ts` - Timestamp formatting, message key generation
- ✅ `types.ts` - Common chat types

**Why?** Consistency in UX is more valuable than strict colocation. Users expect chat to work the same way whether it's peer or solo practice.

---

### Directory Rules

#### 1. `/components/` - ONLY Reusable, General-Purpose Components

**ALLOWED:**

- ✅ UI primitives from Shadcn (`/components/ui/`)
- ✅ Components used in 3+ different features
- ✅ Cross-cutting concerns (auth, layout, navigation)
- ✅ Domain components used across features (e.g., `CorrectionMessage` used in practice AND chat)

**NOT ALLOWED:**

- ❌ Page-specific components (put in `/app/[feature]/sections/`)
- ❌ Feature-specific components used in one place
- ❌ Components that import page-specific business logic

**Examples:**

```
✅ /components/chat/CorrectionMessage.tsx - Used in practice AND peer chat
✅ /components/profile/ProfileAvatar.tsx - Used in profile, nav, chat
✅ /components/ui/button.tsx - Shadcn primitive
❌ /components/practice/SoloPracticeChat.tsx - Only used in practice → Move to /app/practice/
```

---

#### 2. `/app/[feature]/` - Feature-Owned Code

**Structure:**

```
/app/[feature]/
├── page.tsx                      # Feature root (server component)
├── [dynamicId]/
│   ├── page.tsx                 # Dynamic route (server component)
│   ├── sections/                # Page-specific UI (client components)
│   ├── types.ts                 # Page-specific types
│   └── helpers.ts               # Page-specific logic
└── sections/                     # Feature-level shared sections
```

**RULES:**

- ✅ Server components for pages (data fetching, auth checks)
- ✅ Client components in `/sections/` subdirectories
- ✅ Collocate types, helpers, and handlers with the page
- ✅ Name files descriptively: `voice-session-ui.tsx`, not `index.tsx`

**Examples:**

```
✅ /app/practice/[sessionId]/sections/solo-practice-chat.tsx
✅ /app/voice-practice/[sessionId]/voice-session-ui.tsx
✅ /app/admin/directory/components/StudentRosterClient.tsx
```

---

#### 3. `/lib/` - Utilities, Services, and Business Logic

**Structure:**

```
/lib/
├── [feature]/              # Feature-specific utilities
│   ├── service.ts         # API/service layer
│   ├── utils.ts           # Helper functions
│   └── types.ts           # Shared types
├── supabase/              # Database clients
└── utils.ts               # Global utilities
```

**RULES:**

- ✅ Pure functions and utilities
- ✅ Service abstractions (AI, database, external APIs)
- ✅ No React components or hooks (those go in `/hooks/`)
- ✅ Testable, framework-agnostic code

**Examples:**

```
✅ /lib/voice/audio-utils.ts - Audio processing functions
✅ /lib/ai/ai-service.ts - AI provider abstraction
✅ /lib/supabase/server.ts - Supabase server client
❌ /lib/voice/VoicePlayer.tsx - Component → Move to /components/ or /app/
```

---

#### 4. `/hooks/` - Custom React Hooks

**RULES:**

- ✅ Stateful logic that needs React hooks
- ✅ Reusable across components
- ✅ Named with `use` prefix
- ✅ Keep hooks focused (single responsibility)

**Examples:**

```
✅ /hooks/useVoiceAudio.ts - Voice audio state management
✅ /hooks/useAudioCapture.ts - Recording logic
✅ /hooks/use-mobile.ts - Responsive utilities
❌ /hooks/usePracticePageLogic.ts - Too specific → Keep in page sections/
```

---

### Component Separation: When to Split

**Split a component when:**

1. It exceeds 300 lines
2. It handles multiple concerns (UI + data + logic)
3. You want to test logic separately from UI
4. It's used in multiple places with variations

**Pattern: Sections + Handlers + Types**

```tsx
// Good: Separated concerns
/app/voice-practice/[sessionId]/
├── page.tsx                    // Server: fetch data, auth
├── voice-session-ui.tsx       // Client: UI rendering
├── session-handlers.ts        // Logic: event handlers, state
└── types.ts                   // Types: interfaces, enums
```

---

### Migration Rules

**When refactoring existing code:**

1. **Identify dependencies**: What imports this component?
2. **Check usage count**: Used in 1, 2, or 3+ places?
3. **Move to appropriate location** using decision tree above
4. **Update imports** throughout codebase
5. **Delete old file** (don't leave unused code)

**Example Migration:**

```bash
# Before (wrong)
/components/practice/SoloPracticeChat.tsx  # Only used in practice

# After (correct)
/app/practice/[sessionId]/sections/solo-practice-chat.tsx
```

---

### Quick Reference

| Type                           | Location                          | Examples                         |
| ------------------------------ | --------------------------------- | -------------------------------- |
| **UI Primitives**              | `/components/ui/`                 | Button, Card, Dialog             |
| **Reusable Domain Components** | `/components/[domain]/`           | CorrectionMessage, ProfileAvatar |
| **Feature Sections**           | `/app/[feature]/sections/`        | practice-topic-selector          |
| **Page-Specific**              | `/app/[feature]/[page]/sections/` | solo-practice-chat               |
| **Services**                   | `/lib/[feature]/`                 | ai-service, audio-utils          |
| **Hooks**                      | `/hooks/`                         | useVoiceAudio, useAudioCapture   |
| **Types**                      | Collocated or `/types/`           | database.types.ts                |

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

| MCP                     | Purpose                                                                     | Used By |
| ----------------------- | --------------------------------------------------------------------------- | ------- |
| **Supabase MCP**        | Database access (users, messages, matches, curricula, feedback). DB         |
| **Shadcn MCP**          | UI component rendering for chat widgets, modals, dashboards. Visual         |
| **Stripe MCP** (future) | Subscription, billing, and usage tiers for schools and individuals. Payment |
| **Figma MCP**           | Design when it is provided                                                  |
| **Github MCP**          | Use it for checking repo and making sure it is correct                      |

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
text_practice_sessions:
  - id (uuid) - Primary key
  - student_id (uuid) - FK to profiles
  - topic (text) - Practice topic
  - status (text) - 'active', 'completed'
  - level (text) - A1-C2 proficiency level
  - started_at (timestamp)
  - ended_at (timestamp)
  - created_at (timestamp)

text_practice_messages:
  - id (uuid) - Primary key
  - session_id (uuid) - FK to text_practice_sessions
  - role (text) - 'user' or 'assistant'
  - content (text) - message text
  - message_type (text) - 'text', 'correction', 'encouragement'
  - grammar_issues (jsonb) - detailed error analysis
  - ai_correction (text) - correction text
  - correction_severity (text) - 'minor', 'moderate', 'major'
  - is_correct (boolean) - true if no grammar errors
  - has_correction (boolean) - whether correction was shown
  - corrected_message_id (uuid) - links correction to original message
  - created_at (timestamp)
```

**Voice Practice (voice_practice_sessions + voice_messages):**

```
voice_practice_sessions:
  - id (uuid) - Primary key
  - student_id (uuid) - FK to profiles
  - topic (text) - Practice topic
  - speaker (text) - AI voice speaker selection
  - status (text) - 'active', 'completed', 'ended'
  - level (text) - A1-C2 proficiency level
  - started_at (timestamp)
  - ended_at (timestamp)
  - created_at (timestamp)

voice_messages:
  - id (uuid) - Primary key
  - session_id (uuid) - FK to voice_practice_sessions
  - role (text) - 'user' or 'assistant'
  - content (text) - transcript text
  - audio_url (text) - S3/storage URL for audio
  - audio_duration (numeric) - duration in seconds
  - grammar_issues (jsonb) - grammar analysis
  - pronunciation_issues (jsonb) - pronunciation feedback
  - fluency_score (numeric) - 0-100 fluency rating
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

### 4.3 Complete Database Schema

**Core Tables:**

- `profiles` - User profiles with level, interests, goals
- `schools` - School organizations and settings
- `school_invitations` - Invitation tokens for student onboarding
- `matches` - Peer-to-peer conversation sessions
- `match_requests` - Match proposals between students
- `messages` - Peer chat messages with grammar analysis
- `text_practice_sessions` - Solo text practice sessions
- `text_practice_messages` - Solo practice chat history
- `voice_practice_sessions` - Voice practice sessions
- `voice_messages` - Voice transcripts and audio
- `curriculum_topics` - School-defined learning topics
- `conversation_summaries` - Compressed context windows
- `feedback_logs` - Post-session AI-generated feedback
- `session_reports` - Aggregated session analytics

**Supporting Tables:**

- `interests` - Predefined interest categories
- `topics` - Practice topics catalog
- `profile_interests` - Many-to-many: profiles ↔ interests

**Key Relationships:**

- Schools → Profiles (one-to-many)
- Profiles → Matches (many-to-many through matches table)
- Matches → Messages (one-to-many)
- Profiles → TextPracticeSessions (one-to-many)
- TextPracticeSessions → TextPracticeMessages (one-to-many)
- Profiles → VoicePracticeSessions (one-to-many)
- VoicePracticeSessions → VoiceMessages (one-to-many)
- Schools → CurriculumTopics (one-to-many)

**Row Level Security (RLS):**

- All tables use RLS policies for data isolation
- Students can only access their own data
- School admins can access their school's data
- Teachers can access assigned student data

---

## 5. Agent Context Model

Each agent receives a unified **context envelope**:

| Context Key            | Description                                        |
| ---------------------- | -------------------------------------------------- |
| `user_profiles`        | Basic info, proficiency level, interests           |
| `curriculum_topic`     | Current school topic and grammar focus             |
| `conversation_history` | Recent transcript window (last N turns)            |
| `school_policy`        | School or teacher-defined preferences              |
| `agent_config`         | Temperature, intervention frequency, tone settings |
| `permissions`          | Access rules based on role (student/teacher/admin) |

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

## 7. Frontend Integration Patterns

### Component Architecture Patterns

**1. Server + Client Component Pattern**

```tsx
// app/practice/[sessionId]/page.tsx (Server Component)
export default async function PracticeSessionPage({ params }) {
  const supabase = await createClient();
  const session = await fetchSession(params.sessionId);

  return <SoloPracticeChat session={session} />; // Client component
}

// app/practice/[sessionId]/sections/solo-practice-chat.tsx (Client)
("use client");
export default function SoloPracticeChat({ session }) {
  // UI and interactivity
}
```

**2. Sections Pattern for Complex Pages**

```tsx
// Feature with multiple UI sections
/app/voice-practice/[sessionId]/
├── page.tsx                    // Server: auth + data
├── voice-session-ui.tsx       // Client: main UI
├── session-handlers.ts        // Logic: handlers
└── types.ts                   // Types

// voice-session-ui.tsx imports sections from shared:
import { VoiceTopicSelector } from '../sections/voice-topic-selector';
import { VoiceSpeakerSelector } from '../sections/voice-speaker-selector';
```

**3. Reusable Component Pattern**

```tsx
// Used across practice AND chat → goes in /components/
// components/chat/CorrectionMessage.tsx
export function CorrectionMessage({ correction, severity }) {
  // Shared UI for grammar corrections
}

// Used in:
// - /app/practice/[sessionId]/sections/solo-practice-chat.tsx
// - /components/chat/ChatInterface.tsx
```

---

### Integration Layers

**AI Integration:**

```tsx
// lib/ai/ai-service.ts - Provider abstraction
export const aiService = {
  createChatStream, // Mastra or OpenAI
  analyzeGrammar,
  generateFeedback,
};

// Usage in components:
import { aiService } from "@/lib/ai";
const stream = await aiService.createChatStream(messages);
```

**Database Integration:**

```tsx
// Server components: @/lib/supabase/server
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client components: @/lib/supabase/client
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
```

**Realtime Integration:**

```tsx
// Custom hooks for realtime subscriptions
export function useRealtimeMessages(matchId: string) {
  useEffect(() => {
    const channel = supabase
      .channel(`match:${matchId}`)
      .on('postgres_changes', { ... }, handler)
      .subscribe();

    return () => channel.unsubscribe();
  }, [matchId]);
}
```

**AI SDK Streaming:**

```tsx
// app/practice/[sessionId]/sections/solo-practice-chat.tsx
import { useChat } from "@ai-sdk/react";

export function SoloPracticeChat() {
  const { messages, input, handleSubmit } = useChat({
    api: "/api/practice/chat",
    onFinish: (message) => analyzeGrammar(message),
  });
}
```

---

### UI/UX Standards

**Toast Notifications (NEVER use browser alerts):**

```tsx
import { toast } from "sonner";

// ✅ Correct
toast.success("Session saved!");
toast.error("Failed to connect");

// ❌ Wrong
alert("Session saved!");
```

**Confirmation Dialogs:**

```tsx
import { AlertDialog } from '@/components/ui/alert-dialog';

// ✅ Correct - Use Shadcn AlertDialog
<AlertDialog>
  <AlertDialogTrigger>Delete</AlertDialogTrigger>
  <AlertDialogContent>Are you sure?</AlertDialogContent>
</AlertDialog>

// ❌ Wrong
if (confirm('Are you sure?')) { ... }
```

**Theme Colors (NEVER hardcode Tailwind colors):**

```tsx
// ✅ Correct - Use semantic tokens
<div className="bg-primary text-primary-foreground">
<div className="bg-secondary text-muted-foreground">
<div className="bg-destructive">

// ❌ Wrong - Hardcoded colors
<div className="bg-blue-500 text-white">
<div className="bg-gray-100 text-gray-600">
```

---

### Custom Hooks Pattern

**When to create a custom hook:**

- Complex stateful logic used in 2+ components
- Side effects that need cleanup
- Subscription management (Realtime, WebSockets)
- Audio/media processing

**Example:**

```tsx
// hooks/useVoiceAudio.ts
export function useVoiceAudio(sessionId: string) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const play = useCallback(() => { ... }, []);
  const pause = useCallback(() => { ... }, []);

  return { isPlaying, play, pause };
}

// Usage:
const { isPlaying, play, pause } = useVoiceAudio(sessionId);
```

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

| Phase       | Objective                               | Key Agent or MCP                   |
| ----------- | --------------------------------------- | ---------------------------------- |
| **Phase 1** | Two-person chat with Conversation Agent | Supabase MCP + Shadcn MCP          |
| **Phase 2** | Solo Practice voice sessions            | Voice MCP                          |
| **Phase 3** | Feedback summaries & reports            | Feedback Agent                     |
| **Phase 4** | School admin dashboards                 | Admin Agent                        |
| **Phase 5** | Curriculum integration                  | Curriculum Agent                   |
| **Phase 6** | Subscription & billing layer            | Stripe MCP                         |
| **Phase 7** | Translation & gamification modules      | Translation MCP + Gamification MCP |

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

### Golden Rules (Read These First!)

1. **Colocation Over Abstraction** - Keep code near where it's used. Only extract to `/components/` when used in 3+ features.
2. **Use the Decision Tree** - Before creating any file, follow the decision tree in Section 0.1.
3. **No Browser Dialogs** - Use Sonner toast, Shadcn AlertDialog/Dialog. Never `alert()`, `confirm()`, or `prompt()`.
4. **Semantic Colors Only** - Use `text-primary`, `bg-secondary`. Never `text-blue-500`.
5. **Document Components** - Add a comment at the top explaining purpose and usage.
6. **Server/Client Split** - Pages are server components (data), sections are client components (UI).

---

### Package Management

**RULE: Always use PNPM**

```bash
# ✅ Correct
pnpm add package-name
pnpm install

# ❌ Wrong
npm install package-name
yarn add package-name
```

**Installing Packages:**

- Use latest tag by default: `pnpm add @mastra/core@latest`
- Only use `@alpha` if explicitly requested
- Check CLAUDE.md for required versions before installing

---

### Code Style Rules

**Icons:**

```tsx
// ✅ Correct - Use Lucide icons
import { MessageSquare, User, Settings } from 'lucide-react';
<MessageSquare className="h-4 w-4" />

// ❌ Wrong - Custom SVG
<svg>...</svg>
```

**Colors:**

```tsx
// ✅ Correct - Semantic theme colors
className = "bg-primary text-primary-foreground";
className = "bg-secondary text-muted-foreground";
className = "text-destructive";

// ❌ Wrong - Hardcoded Tailwind colors
className = "bg-blue-500 text-white";
className = "bg-gray-100";
```

**Component Documentation:**

```tsx
// ✅ Correct - Always document at top of file
/**
 * Solo Practice Chat Interface
 *
 * Purpose: AI-powered text practice with grammar checking
 * Features:
 * - Real-time streaming AI responses
 * - Grammar analysis on every message
 * - Session history persistence
 *
 * Usage: /app/practice/[sessionId]/page.tsx
 */
'use client';
export default function SoloPracticeChat() { ... }
```

---

### UI/UX Rules

**User Notifications:**

```tsx
import { toast } from "sonner";

// ✅ Correct
toast.success("Session saved!");
toast.error("Failed to save", { description: "Try again" });
toast.loading("Saving...");

// ❌ Wrong
alert("Session saved!");
window.alert("Error");
```

**Confirmations:**

```tsx
import { AlertDialog, AlertDialogAction } from "@/components/ui/alert-dialog";

// ✅ Correct
<AlertDialog>
  <AlertDialogTrigger>Delete Session</AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
    <AlertDialogDescription>
      This action cannot be undone.
    </AlertDialogDescription>
    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
  </AlertDialogContent>
</AlertDialog>;

// ❌ Wrong
if (window.confirm("Are you sure?")) {
  handleDelete();
}
```

**User Input:**

```tsx
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// ✅ Correct
<Dialog>
  <DialogTrigger>Edit Topic</DialogTrigger>
  <DialogContent>
    <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
  </DialogContent>
</Dialog>;

// ❌ Wrong
const topic = window.prompt("Enter topic:");
```

---

### Supabase Integration Rules

**Server Components:**

```tsx
// app/practice/[sessionId]/page.tsx
import { createClient } from "@/lib/supabase/server";

export default async function PracticePage() {
  const supabase = await createClient(); // ✅ Await required
  const { data } = await supabase.from("sessions").select();
}
```

**Client Components:**

```tsx
// app/practice/[sessionId]/sections/practice-chat.tsx
"use client";
import { createClient } from "@/lib/supabase/client";

export function PracticeChat() {
  const supabase = createClient(); // ✅ No await

  useEffect(() => {
    supabase.from("messages").select();
  }, []);
}
```

**Security:**

- ✅ Never expose API keys in client components
- ✅ Use RLS (Row Level Security) for data access
- ✅ Validate all user input in API routes
- ✅ Server components for sensitive operations

**File Organization Rules:**

**Rule 1: Feature-First Structure**

```
/app/[feature]/
├── page.tsx                     # Server component (data + auth)
├── [dynamicId]/                # Dynamic routes
│   ├── page.tsx               # Server component
│   └── sections/              # Page-specific client components
└── sections/                   # Feature-level shared sections
```

**Rule 2: Components Organized by Reusability**

```
/components/
├── ui/                         # Shadcn primitives (universal)
└── [domain]/                   # Domain components (used 3+ places)
    └── ComponentName.tsx      # e.g., CorrectionMessage, ProfileAvatar
```

**Rule 3: Services and Utilities by Feature**

```
/lib/
├── [feature]/                  # Feature-specific utilities
│   ├── service.ts            # API/business logic
│   ├── utils.ts              # Helper functions
│   └── types.ts              # Feature types
├── supabase/                  # Database clients (server, client)
└── utils.ts                   # Global utilities
```

**Rule 4: Hooks for Reusable State Logic**

```
/hooks/
└── useFeatureName.ts          # Reusable stateful logic (2+ components)
```

**Rule 5: Types Strategy**

- **Generated types** → `/types/database.types.ts` (Supabase)
- **Shared types** → `/types/index.ts`
- **Feature types** → Collocate in `/app/[feature]/` or `/lib/[feature]/`
- **Page types** → Collocate in same directory as page

**Rule 6: API Routes Mirror Features**

```
/app/api/
├── [feature]/                  # Match feature name
│   └── [action]/
│       └── route.ts           # POST/GET/PUT/DELETE handlers
└── ...
```

**Naming Conventions:**

- ✅ **Descriptive names**: `voice-session-ui.tsx`, `practice-topic-selector.tsx`
- ❌ **Generic names**: `index.tsx`, `component.tsx`, `utils.tsx` (in feature dirs)
- ✅ **kebab-case** for files: `session-handlers.ts`
- ✅ **PascalCase** for components: `VoiceSessionUI`

**API Routes:**

- Use `/app/api` directory for API endpoints
- Always validate input and handle errors
- Return structured JSON responses
- Use Supabase server client for auth

---

## 14. Current State Summary (Updated October 2024)

**What's Working:**

- ✅ Solo text practice with streaming AI responses and grammar checking
- ✅ Peer-to-peer matching and real-time chat
- ✅ School admin dashboard with student directory
- ✅ Profile management with interests and learning goals
- ✅ Invitation system for student onboarding
- ✅ Toast notifications throughout app (no browser alerts)
- ✅ Responsive design with mobile support
- ✅ Grammar correction display with severity levels
- ✅ Session summary modals

**In Active Development:**

- 🚧 Voice practice sessions (UI complete, testing audio processing)
- 🚧 Voice event handling and audio management hooks
- 🚧 Session feedback generation for completed practices

**Known Technical Debt:**

- Some deleted files may still have references (cleanup in progress)
- Voice practice needs full end-to-end testing
- Database table cleanup pending (legacy tables to remove)
- Need to standardize grammar correction components across features

**Recent Git Status (October 27):**

```
Modified:
- frontend/src/app/practice/[sessionId]/page.tsx
- frontend/src/app/practice/page.tsx
- frontend/src/app/voice-practice/[sessionId]/page.tsx
- frontend/src/app/voice-practice/page.tsx

Deleted (migrated):
- frontend/src/components/practice/SoloPracticeChatInterface.tsx
- frontend/src/components/practice/SoloPracticeInterface.tsx
- frontend/src/components/practice/VoicePracticeInterface.tsx
- frontend/src/components/practice/VoicePracticeSession.tsx
- frontend/src/lib/audio/audio-utils.ts
- frontend/src/lib/audio/index.ts

New (sections-based):
- frontend/src/app/practice/[sessionId]/sections/
- frontend/src/app/practice/sections/
- frontend/src/app/voice-practice/[sessionId]/session-handlers.ts
- frontend/src/app/voice-practice/[sessionId]/types.ts
- frontend/src/app/voice-practice/[sessionId]/voice-session-ui.tsx
- frontend/src/app/voice-practice/sections/
- frontend/src/hooks/useVoiceAudio.ts
- frontend/src/hooks/useVoiceEvents.ts
- frontend/src/lib/voice/audio-utils.ts
```

**Next Priorities:**

1. Complete voice practice testing and deployment
2. Generate comprehensive session reports with AI feedback
3. Implement teacher curriculum management interface
4. Add analytics dashboard with charts and insights
5. Build assessment and grading features

**For New Developers:**

- Start by reading section 0.1 (Recent Architectural Changes)
- Follow the sections-based pattern for new features
- Always use Shadcn UI components and Tailwind semantic colors
- Test with Supabase local development environment
- Use PNPM for package management
- Document component purposes at top of files

---

This `CLAUDE.md` defines the operational behavior, dependencies, and data responsibilities of all AI agents within the EduMatch platform, enabling development with **Mastra Framework**, **AI SDK**, **Supabase MCP**, and **Shadcn UI**.

**Last Updated:** October 27, 2024
**Version:** 2.0 (Post-Sections Refactoring)
