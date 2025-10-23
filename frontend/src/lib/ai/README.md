# AI Service Architecture

## Overview

The AI Service provides an abstraction layer for AI providers, allowing EduMatch to switch between different AI backends (OpenAI, Anthropic, custom models) without changing application code.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (API Routes, Components, Agents)                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  AI Service (aiService)                  │
│  - Unified API                                           │
│  - Provider management                                   │
│  - Feature routing                                       │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┬───────────┐
         ▼                       ▼           ▼
┌──────────────────┐   ┌──────────────┐   ┌──────────┐
│ OpenAI Agent     │   │  Anthropic   │   │  Custom  │
│ Provider         │   │  Provider    │   │ Provider │
│ (Current)        │   │  (Future)    │   │ (Future) │
└──────────────────┘   └──────────────┘   └──────────┘
         │
         ▼
┌──────────────────┐
│ OpenAI Agents    │
│ SDK              │
└──────────────────┘
```

## Core Components

### 1. Types (`types.ts`)

Defines all interfaces and types:
- `AIProvider` - Main provider interface
- `ConversationContext` - Input for conversation monitoring
- `ConversationFeedback` - Output from conversation monitoring
- `GrammarCorrectionResult` - Grammar checking results
- `SessionSummary` - Session feedback
- Voice/Audio types (future)

### 2. AI Service (`ai-service.ts`)

Central service that:
- Manages registered providers
- Routes requests to appropriate provider
- Provides unified API for all AI features
- Singleton instance: `aiService`

### 3. Providers (`providers/`)

#### OpenAI Agent Provider (`openai-agent-provider.ts`)
- **Current implementation**
- Uses OpenAI Agents SDK
- Implements all core features
- Model: `gpt-4o-mini` (configurable)

#### Future Providers
- Anthropic Provider (Claude)
- Custom/Local Models
- Other AI services

## Usage

### Basic Usage

```typescript
import { aiService } from '@/lib/ai';

// Monitor a conversation
const feedback = await aiService.monitorConversation({
  topic: 'Travel',
  recentMessages: ['I like traveling', 'Me too!'],
  latestMessage: 'I go to Paris yesterday',
  studentLevel: 'B1',
  grammarFocus: ['past tense', 'prepositions'],
});

if (feedback.shouldInterject) {
  console.log(`[${feedback.feedbackType}] ${feedback.message}`);
}
```

### Check Grammar

```typescript
const result = await aiService.checkGrammar(
  'I go to Paris yesterday',
  'B1'
);

if (result.hasIssues) {
  result.issues.forEach(issue => {
    console.log(`${issue.original} → ${issue.correction}`);
    console.log(`Explanation: ${issue.explanation}`);
  });
}
```

### Generate Session Summary

```typescript
const messages = [
  { role: 'user', content: 'Hello!' },
  { role: 'user', content: 'How are you?' },
  // ... more messages
];

const summary = await aiService.generateSessionSummary(
  messages,
  'Greetings and Introductions',
  'A2'
);

console.log('Strengths:', summary.strengths);
console.log('Areas for improvement:', summary.areasForImprovement);
console.log('Next steps:', summary.nextSteps);
```

### Using Specific Provider

```typescript
// Force use of specific provider
const feedback = await aiService.monitorConversation(
  context,
  'openai' // provider type
);
```

## Adding a New Provider

1. **Create provider class** implementing `AIProvider` interface:

```typescript
// providers/anthropic-provider.ts
import type { AIProvider, ConversationContext, ConversationFeedback } from '../types';

export class AnthropicProvider implements AIProvider {
  readonly type = 'anthropic';
  readonly name = 'Anthropic Claude';

  async monitorConversation(context: ConversationContext): Promise<ConversationFeedback> {
    // Implementation using Anthropic API
  }

  // ... implement other required methods
}
```

2. **Register the provider**:

```typescript
import { aiService } from '@/lib/ai';
import { AnthropicProvider } from '@/lib/ai/providers/anthropic-provider';

// Register provider
aiService.registerProvider('anthropic', new AnthropicProvider());

// Optionally set as default
aiService.setDefaultProvider('anthropic');
```

3. **Use it**:

```typescript
// Automatically uses default provider
const feedback = await aiService.monitorConversation(context);

// Or specify explicitly
const feedback = await aiService.monitorConversation(context, 'anthropic');
```

## Features

### Current Features (OpenAI Agent Provider)

- ✅ **Conversation Monitoring** - Real-time grammar and topic checking
- ✅ **Grammar Checking** - Detailed grammar analysis
- ✅ **Topic Adherence** - Check if conversation stays on-topic
- ✅ **Session Summaries** - Generate feedback reports
- ✅ **Safety Checking** - Detect inappropriate content

### Future Features

- ⏳ **Voice Transcription** - Convert speech to text
- ⏳ **Text-to-Speech** - Generate audio responses
- ⏳ **Streaming Responses** - Real-time AI responses
- ⏳ **Multi-language Support** - Support for other languages
- ⏳ **Custom Fine-tuned Models** - School-specific models

## Configuration

### Environment Variables

```bash
# OpenAI (required for current provider)
OPENAI_API_KEY=sk-...

# Future providers
ANTHROPIC_API_KEY=sk-...
```

### Provider Configuration

```typescript
import { OpenAIAgentProvider } from '@/lib/ai';

// Custom configuration
const provider = new OpenAIAgentProvider({
  model: 'gpt-4',
  temperature: 0.5,
});

aiService.registerProvider('openai', provider);
```

## Integration with Existing Code

### Conversation Agent (Already Updated)

```typescript
import { aiService } from '@/lib/ai';

const feedback = await aiService.monitorConversation(context);

if (feedback.shouldInterject) {
  // use feedback.message, feedbackType, severity, etc.
}
```

### API Route (Already Compatible)

```typescript
import { aiService } from '@/lib/ai';

const feedback = await aiService.monitorConversation({
  topic,
  recentMessages,
  latestMessage: message,
});

if (feedback.shouldInterject) {
  // stream or persist `feedback.message`
}
```

## Benefits

### 1. **Provider Flexibility**
Switch AI providers without changing application code:
```typescript
// Switch from OpenAI to Anthropic
aiService.setDefaultProvider('anthropic');
```

### 2. **Feature Consistency**
All providers implement the same interface, ensuring consistent behavior.

### 3. **Easy Testing**
Mock the AI service for tests:
```typescript
const mockProvider: AIProvider = {
  monitorConversation: async () => ({
    shouldInterject: true,
    feedbackType: 'grammar',
    message: 'Test correction',
    severity: 'low',
  }),
  // ... other methods
};

aiService.registerProvider('mock', mockProvider);
aiService.setDefaultProvider('mock');
```

### 4. **Future-Proof**
Ready for:
- Voice chat (transcription + TTS)
- Streaming responses
- Custom models
- Multi-provider fallback

## Voice Chat Integration (Future)

### Architecture for Voice

```
┌─────────────────────────────────────────────┐
│          Voice Chat Interface                │
├─────────────────────────────────────────────┤
│                                              │
│  WebRTC (P2P Audio)    AI Transcription     │
│  (Supabase/Native)     (AI Service)         │
│         │                    │               │
│         ├────────────────────┘               │
│         │                                    │
│    Live Stream ──► Transcription ──► DB     │
│                                              │
└─────────────────────────────────────────────┘
```

### Example Usage (When Implemented)

```typescript
// Transcribe voice message
const audio = await recordAudio();
const result = await aiService.transcribeAudio(audio);

// Store transcription
await supabase.from('messages').insert({
  match_id: matchId,
  content: result.text,
  message_type: 'voice',
  audio_url: uploadedUrl,
});

// Generate TTS response
const responseAudio = await aiService.generateSpeech(
  'Great job!',
  { voice: 'friendly', speed: 1.0 }
);
```

## Best Practices

1. **Always use `aiService`** - Don't instantiate providers directly
2. **Handle errors gracefully** - AI calls can fail
3. **Log provider usage** - Track which provider is being used
4. **Test with mock providers** - Don't rely on live AI for tests
5. **Monitor costs** - Different providers have different pricing

## Migration Path

If you want to switch from OpenAI to another provider:

1. **Implement new provider** following the `AIProvider` interface
2. **Register it** with `aiService.registerProvider()`
3. **Test it** in parallel with existing provider
4. **Switch default** with `aiService.setDefaultProvider()`
5. **Monitor** performance and accuracy
6. **Rollback** if needed by switching back to OpenAI

No application code changes required! 🎉

## Questions?

See `CLAUDE.md` in the project root for the full agent specification and architecture overview.
