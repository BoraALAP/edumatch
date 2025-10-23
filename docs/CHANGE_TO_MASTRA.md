# 🧠 Integrating Mastra into an Existing Project (OpenAI → Mastra Migration)

**✅ STATUS: MIGRATION COMPLETED**

This document explains how to integrate **Mastra** into your existing project — especially if you currently use the **OpenAI Agent SDK** or the **Vercel AI SDK**.

## ✅ Completed Migration Steps

This migration was completed on October 22, 2025. The following sections were successfully implemented:

You'll learn how to:

- Add Mastra to an existing repo (no need to start from scratch)
- Use OpenAI models with Mastra agents
- Add **speech-to-speech** capabilities with **OpenAI Realtime** and **ElevenLabs**
- Integrate with **Vercel AI SDK** for streaming and UI
- Update your code from OpenAI Agent SDK to Mastra

---

## 🧩 1. What Is Mastra?

**Mastra** is a TypeScript framework for creating AI agents, workflows, and tools that unify:
- Model orchestration (OpenAI, Anthropic, Gemini, etc.)
- Memory and RAG (retrieval)
- Voice (real-time, text-to-speech, speech-to-text, and speech-to-speech)
- UI integration (via the [Vercel AI SDK](https://mastra.ai/en/docs/frameworks/agentic-uis/ai-sdk))
- Deployment (serverless, edge, etc.)

If you’re already using OpenAI’s Agent SDK, Mastra becomes a **drop-in replacement** with much richer features.

---

## ✅ 2. Install Mastra in an Existing Project (COMPLETED)

You don't need to start a new repo.

### ✅ Installed Dependencies
```bash
# Core dependencies
pnpm add @mastra/core

# Voice modules
pnpm add @mastra/voice-openai-realtime @mastra/voice-elevenlabs @mastra/node-audio

# AI SDK (already using v5)
pnpm add ai@latest @ai-sdk/openai@latest @ai-sdk/react@latest zod
```

### ⚙️ 3. Configure Environment Variables (ALREADY CONFIGURED)

Mastra automatically picks up your provider API keys from `.env.local`:

```bash
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=your-elevenlabs-key (optional)
```

Your existing `.env.local` already has the OPENAI_API_KEY configured.

---

## ✅ 4. Create Mastra Agent Structure (COMPLETED)

Created the following structure:

```
frontend/src/mastra/
├── agents/
│   ├── solo-practice-agent.ts   ✅ COMPLETED (with voice support)
│   ├── conversation-agent.ts     ✅ COMPLETED
│   └── feedback-agent.ts         ✅ COMPLETED
└── index.ts                      ✅ COMPLETED
```

### ✅ Main Mastra Configuration (`src/mastra/index.ts`)

```typescript
import { Mastra } from '@mastra/core/mastra';
import { soloPracticeAgent } from './agents/solo-practice-agent';
import { conversationAgent } from './agents/conversation-agent';
import { feedbackAgent } from './agents/feedback-agent';

export const mastra = new Mastra({
  agents: {
    soloPracticeAgent,
    conversationAgent,
    feedbackAgent,
  },
});

export function getAgent(name: 'soloPracticeAgent' | 'conversationAgent' | 'feedbackAgent') {
  return mastra.getAgent(name);
}

export { soloPracticeAgent, conversationAgent, feedbackAgent };
```

## ✅ 5. Migrating from OpenAI Agent SDK (COMPLETED)

### Before (OpenAI Agent SDK)
```typescript
import { Agent, run } from '@openai/agents';

const agent = new Agent({
  name: 'SoloPracticeCoach',
  model: 'gpt-4o-mini',
  instructions: 'You are a friendly coach...',
});

const result = await run(agent, studentMessage);
const response = result.finalOutput;
```

### ✅ After (Mastra)
```typescript
import { soloPracticeAgent } from '@/mastra/agents/solo-practice-agent';

const response = await soloPracticeAgent.generate([
  { role: 'system', content: instructions },
  { role: 'user', content: studentMessage },
]);

const message = response.text;
```

### ✅ Migrated Components:

1. **✅ Solo Practice Agent** (`src/mastra/agents/solo-practice-agent.ts`)
   - Full migration with OpenAI Realtime Voice support
   - Functions: `runSoloPracticeAgent()`, `generateStarterPrompt()`, `startVoiceSession()`

2. **✅ Conversation Agent** (`src/mastra/agents/conversation-agent.ts`)
   - Functions: `monitorConversation()`, `checkGrammar()`, `checkTopicAdherence()`

3. **✅ Feedback Agent** (`src/mastra/agents/feedback-agent.ts`)
   - Functions: `generateSessionSummary()`, `generateQuickFeedback()`, `generateTeacherReport()`

4. **✅ API Routes Updated**
   - `/api/practice/start/route.ts` ✅
   - `/api/practice/message/route.ts` ✅

5. **✅ AI Service Layer Updated**
   - Created `MastraProvider` class
   - Updated `AIService` to use Mastra as default provider
   - OpenAI Agent provider kept as fallback

### ✅ Benefits Achieved:

- ✅ Unified API for text, voice, and streaming
- ✅ Built-in observability and tracing
- ✅ OpenAI Realtime Voice support ready
- ✅ Works across OpenAI, Anthropic, Gemini, Mistral, etc.
- ✅ Better TypeScript support

🎤 6. Adding Voice Chat (Speech-to-Speech)
Mastra supports bidirectional real-time voice — you can both speak and listen continuously.

OpenAI Realtime Example
ts
Copy code
import { getMicrophoneStream, playAudio } from "@mastra/node-audio";
import { voiceAgent } from "@/mastra/agents/voice-agent";

await voiceAgent.voice.connect();

// Listen for generated speech
voiceAgent.voice.on("speaker", ({ audio }) => playAudio(audio));

// Start a voice session
await voiceAgent.voice.speak("How can I help you today?");

// Stream microphone input to the agent
const mic = getMicrophoneStream();
await voiceAgent.voice.send(mic);
ElevenLabs Voice Example
ts
Copy code
import { ElevenLabsVoice } from "@mastra/voice-elevenlabs";

voiceAgent.voice = new ElevenLabsVoice({
  apiKey: process.env.ELEVENLABS_API_KEY,
  voice: "Rachel",
});
✅ You can mix OpenAI (for reasoning) with ElevenLabs (for speech output).

Docs:

Speech-to-Speech Overview

ElevenLabs Integration

⚡ 7. Integrating with Vercel AI SDK (Streaming UI)
Mastra works natively with Vercel’s AI SDK.

Example:
ts
Copy code
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

export const streamingAgent = new Agent({
  name: "ai-sdk-agent",
  model: openai("gpt-4o-mini"),
  instructions: "You are a helpful AI that streams messages live.",
});
Streaming from your API route
ts
Copy code
export async function POST(req: Request) {
  const { prompt } = await req.json();
  const agent = mastra.getAgent("ai-sdk-agent");
  const stream = await agent.stream(prompt);

  return new Response(stream.textStream, { headers: { "Content-Type": "text/event-stream" } });
}
🗣️ 8. Combining AI SDK + Voice
You can combine Mastra’s voice capabilities with Vercel’s streaming frontend.

ts
Copy code
import { ElevenLabsVoice } from "@mastra/voice-elevenlabs";
import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

export const liveVoiceAgent = new Agent({
  name: "live-voice",
  model: openai("gpt-4o-mini"),
  instructions: "You are a voice chatbot for customer support.",
  voice: new ElevenLabsVoice({
    apiKey: process.env.ELEVENLABS_API_KEY,
    voice: "Elli",
  }),
});
Then connect this agent to your React/Next.js streaming UI with AI SDK hooks.

🚀 9. Deployment
Mastra works out of the box with:

Vercel Serverless Functions

Cloudflare Workers

Netlify Functions

Node.js servers (Express, Fastify)

Docs: Deployment Guide

🧾 10. Resources
Mastra Agents Overview

Speech-to-Speech (OpenAI & ElevenLabs)

AI SDK Integration

Mastra GitHub

Discord Community

## ✅ Migration Summary

### Completed Tasks:

| Task | Status | Notes |
|------|--------|-------|
| Install Mastra dependencies | ✅ | `@mastra/core`, voice modules, AI SDK v5 |
| Create agent structure | ✅ | `src/mastra/agents/` with 3 agents |
| Migrate Solo Practice Agent | ✅ | With OpenAI Realtime Voice support |
| Migrate Conversation Agent | ✅ | Grammar, topic adherence, monitoring |
| Migrate Feedback Agent | ✅ | Session summaries, teacher reports |
| Update API routes | ✅ | `/api/practice/*` routes updated |
| Create Mastra Provider | ✅ | Implements AIProvider interface |
| Update AI Service | ✅ | Mastra as default, OpenAI as fallback |
| TypeScript compilation | ✅ | All Mastra code compiles successfully |

### What Works Now:

- ✅ **Solo Practice**: Students can practice with AI Coach using text
- ✅ **Voice Ready**: OpenAI Realtime Voice integrated (needs frontend implementation)
- ✅ **Conversation Monitoring**: Real-time grammar and topic checking
- ✅ **Session Feedback**: Automated summaries and teacher reports
- ✅ **Provider Abstraction**: Can switch between Mastra/OpenAI seamlessly

### Next Steps (Optional Enhancements):

1. **🔄 Frontend Voice UI**: Add voice recording/playback components
2. **🔄 ElevenLabs Integration**: Alternative voice provider with more voice options
3. **🔄 Streaming Responses**: Implement real-time streaming for better UX
4. **🔄 Cleanup**: Remove old OpenAI Agent files from `src/lib/agents/`

### Testing:

To test the migration:

```bash
# Run development server
pnpm dev

# Visit solo practice page
http://localhost:3000/practice

# Try creating a solo practice session
# The agent should respond using Mastra instead of OpenAI Agent SDK
```

### Feature Support Matrix:

| Feature | Status | Implementation |
|---------|--------|----------------|
| Text Chat | ✅ | `soloPracticeAgent.generate()` |
| Voice Input (Future) | ⚠️ | OpenAIRealtimeVoice configured, needs frontend |
| Voice Output (Future) | ⚠️ | OpenAIRealtimeVoice configured, needs frontend |
| Streaming | ⚠️ | Supported by Mastra, needs implementation |
| Grammar Correction | ✅ | `conversationAgent.checkGrammar()` |
| Topic Adherence | ✅ | `conversationAgent.checkTopicAdherence()` |
| Session Summaries | ✅ | `feedbackAgent.generateSessionSummary()` |
| Teacher Reports | ✅ | `feedbackAgent.generateTeacherReport()` |
| Multi-Provider | ✅ | Via AIService abstraction |
| Supabase Integration | ✅ | Already configured |

---

## Original Documentation Below

The sections below contain the original migration guide with examples: