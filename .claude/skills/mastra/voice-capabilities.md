# Voice Capabilities Reference

## Voice Provider Types

### TTS/STT Providers (Batch Processing)
- **OpenAI Voice** - `@mastra/voice-openai`
- **PlayAI** - `@mastra/voice-playai`
- **ElevenLabs** - `@mastra/voice-elevenlabs`
- **Deepgram** - `@mastra/voice-deepgram`
- **Google** - `@mastra/voice-google`
- **Azure** - `@mastra/voice-azure`
- **Murf** - `@mastra/voice-murf`
- **Sarvam** - `@mastra/voice-sarvam`
- **Speechify** - `@mastra/voice-speechify`

### Realtime Providers (Speech-to-Speech)
- **OpenAI Realtime** - `@mastra/voice-openai-realtime`
- **Google Gemini Live** - `@mastra/voice-google-gemini-live`

## Audio I/O

```bash
npm install @mastra/node-audio
```

```typescript
import { playAudio, getMicrophoneStream } from "@mastra/node-audio";
```

## Implementation Patterns

### Basic TTS

```typescript
import { Agent } from "@mastra/core/agent";
import { OpenAIVoice } from "@mastra/voice-openai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "tts-agent",
  instructions: "You are a voice assistant.",
  model: openai("gpt-4o"),
  voice: new OpenAIVoice()
});

const { text } = await agent.generate("What color is the sky?");
const audioStream = await agent.voice.speak(text, {
  speaker: "default",
  responseFormat: "wav"  // Options: wav, mp3, opus
});

// Play or save audio
import { playAudio } from "@mastra/node-audio";
playAudio(audioStream);

// Or save to file
import { createWriteStream } from "fs";
audioStream.pipe(createWriteStream("output.wav"));
```

### Basic STT

```typescript
import { createReadStream } from "fs";

const audioStream = createReadStream("input.m4a");
const transcription = await agent.voice.listen(audioStream, {
  filetype: "m4a"
});
console.log("Transcription:", transcription);
```

### OpenAI Realtime Speech-to-Speech

```typescript
import { Agent } from "@mastra/core/agent";
import { OpenAIRealtimeVoice } from "@mastra/voice-openai-realtime";
import { openai } from "@ai-sdk/openai";
import { playAudio, getMicrophoneStream } from "@mastra/node-audio";

const agent = new Agent({
  name: "realtime-agent",
  instructions: "You are a helpful real-time voice assistant.",
  model: openai("gpt-4o"),
  voice: new OpenAIRealtimeVoice({
    apiKey: process.env.OPENAI_API_KEY,
    model: "gpt-4o-mini-realtime-preview-2024-12-17",
    speaker: "alloy"  // Options: alloy, echo, fable, onyx, nova, shimmer
  })
});

// Connect to realtime service
await agent.voice.connect();

// Listen for audio output
agent.voice.on("speaker", ({ audio }) => {
  playAudio(audio);  // audio is Int16Array PCM format
});

// Listen for transcriptions
agent.voice.on("writing", ({ text, role }) => {
  console.log(`${role}: ${text}`);
});

// Start conversation
await agent.voice.speak("How can I help you today?");

// Send microphone audio
const micStream = getMicrophoneStream();
await agent.voice.send(micStream);

// Or send user audio with automatic response
await agent.voice.answer(userAudioBuffer);

// Cleanup
await agent.voice.close();
```

### Google Gemini Live

```typescript
import { GeminiLiveVoice } from "@mastra/voice-google-gemini-live";

const agent = new Agent({
  name: "gemini-agent",
  instructions: "You are a helpful voice assistant.",
  model: openai("gpt-4o"),
  voice: new GeminiLiveVoice({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "gemini-2.0-flash-exp",
    speaker: "Puck",  // Options: Puck, Charon, Kore, Fenrir, Aoede
    debug: true,
    
    // Alternative: Use Vertex AI
    // vertexAI: true,
    // project: "your-gcp-project",
    // location: "us-central1",
    // serviceAccountKeyFile: "/path/to/service-account.json"
  })
});

await agent.voice.connect();

agent.voice.on("speaker", ({ audio }) => {
  playAudio(audio);
});

agent.voice.on("writing", ({ role, text }) => {
  console.log(`${role}: ${text}`);
});

await agent.voice.speak("Hello! What can I do for you?");

const micStream = getMicrophoneStream();
await agent.voice.send(micStream);
```

### Composite Voice (Mix Providers)

```typescript
import { CompositeVoice } from "@mastra/core/voice";
import { OpenAIVoice } from "@mastra/voice-openai";
import { PlayAIVoice } from "@mastra/voice-playai";

const agent = new Agent({
  name: "composite-agent",
  instructions: "You use multiple voice providers.",
  model: openai("gpt-4o"),
  voice: new CompositeVoice({
    input: new OpenAIVoice(),   // For STT
    output: new PlayAIVoice()   // For TTS
  })
});

const transcription = await agent.voice.listen(audioStream);
const speech = await agent.voice.speak("Hello!");
```

### Voice with Tools

Tools automatically work with realtime voice:

```typescript
const weatherTool = createTool({
  id: "weather",
  description: "Get weather for a location",
  inputSchema: z.object({ location: z.string() }),
  outputSchema: z.object({ weather: z.string() }),
  execute: async ({ context }) => {
    const res = await fetch(`https://wttr.in/${context.location}?format=3`);
    return { weather: await res.text() };
  }
});

const agent = new Agent({
  name: "weather-voice-agent",
  instructions: "Use weatherTool when users ask about weather.",
  model: openai("gpt-4o"),
  tools: { weatherTool },
  voice: new OpenAIRealtimeVoice()
});

await agent.voice.connect();
// Tools are automatically available
```

## Advanced Configuration

### OpenAI Realtime Session Config

```typescript
const voice = new OpenAIRealtimeVoice({
  apiKey: "your-key",
  model: "gpt-4o-mini-realtime-preview-2024-12-17",
  speaker: "alloy"
});

// Update session config
voice.updateSession({
  turn_detection: {
    type: "server_vad",  // Voice Activity Detection
    threshold: 0.6,
    silence_duration_ms: 1200
  },
  input_audio_format: "pcm16",
  output_audio_format: "pcm16"
});

// Get available speakers
const speakers = await voice.getSpeakers();
```

### Event Handling

```typescript
// Audio output from agent
voice.on("speaker", ({ audio }: { audio: Int16Array }) => {
  playAudio(audio);
});

// Transcribed text
voice.on("writing", ({ text, role }: { text: string; role: string }) => {
  console.log(`${role}: ${text}`);
});

// Remove listeners
voice.off("speaker", handlerFunction);
```

## Best Practices

### 1. Choose the Right Provider

- **Batch operations** - OpenAI/PlayAI/ElevenLabs for file processing
- **Real-time conversations** - OpenAI Realtime or Gemini Live
- **Cost optimization** - Mix providers with CompositeVoice
- **High quality TTS** - ElevenLabs or PlayAI
- **Fast STT** - Deepgram or OpenAI

### 2. Handle Voice Lifecycle

```typescript
try {
  await agent.voice.connect();
  
  // Set up listeners before interactions
  agent.voice.on("speaker", handleAudio);
  agent.voice.on("writing", handleText);
  
  // Use voice features
  await agent.voice.speak("Hello");
  await agent.voice.send(micStream);
  
} finally {
  // Always cleanup
  await agent.voice.close();
}
```

### 3. Error Handling

```typescript
agent.voice.on("error", (error) => {
  console.error("Voice error:", error);
  // Reconnect or handle gracefully
});
```

### 4. Performance Tips

- Use appropriate audio formats (PCM16 for low latency)
- Configure VAD properly for your use case
- Process audio in chunks
- Reuse connections when possible

## Web Application Integration

For browser-based realtime voice:

```typescript
// Server-side: Proxy WebSocket connections
import { Server } from "socket.io";

const io = new Server(server);

io.on("connection", async (socket) => {
  const agent = new Agent({
    voice: new OpenAIRealtimeVoice()
  });
  
  await agent.voice.connect();
  
  agent.voice.on("speaker", ({ audio }) => {
    socket.emit("audio", audio);
  });
  
  socket.on("userAudio", async (audio) => {
    await agent.voice.send(audio);
  });
});
```

## Voice Provider Comparison

| Provider | TTS | STT | Realtime | Quality | Latency | Cost |
|----------|-----|-----|----------|---------|---------|------|
| OpenAI Voice | ✓ | ✓ | - | High | Medium | $$ |
| OpenAI Realtime | ✓ | ✓ | ✓ | High | Low | $$$ |
| Gemini Live | ✓ | ✓ | ✓ | High | Low | $$ |
| ElevenLabs | ✓ | - | - | Very High | Medium | $$$ |
| PlayAI | ✓ | - | - | High | Medium | $$ |
| Deepgram | - | ✓ | - | High | Very Low | $ |

## Common Patterns

### File-based processing

```typescript
import { createReadStream, createWriteStream } from "fs";

const input = createReadStream("question.mp3");
const text = await agent.voice.listen(input);
const response = await agent.generate(text);
const audio = await agent.voice.speak(response.text);
audio.pipe(createWriteStream("answer.mp3"));
```

### Real-time with memory

```typescript
import { Memory } from "@mastra/memory";

const memory = new Memory();
const agent = new Agent({
  voice: new OpenAIRealtimeVoice(),
  memory,
  // ... config
});

await agent.generate("Remember this!", {
  memory: { thread: "user-123", resource: "voice-app" }
});
```
