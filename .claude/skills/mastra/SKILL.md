---
description: Specialized in Mastra AI framework implementation for building TypeScript AI agents with text generation, voice capabilities (STT/TTS/speech-to-speech), tool usage, MCP integration, streaming, memory, and workflows. Use this skill when implementing agentic features, voice interfaces, real-time interactions, multi-step AI workflows with Mastra, or when the user mentions Mastra, voice agents, MCP servers, or AI agent tools.
---

# Mastra AI Implementation

Mastra is a TypeScript AI agent framework for building production-ready agentic applications with workflows, memory, streaming, voice, and observability.

## Quick Start

### Basic Agent Setup

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-agent",
  instructions: "You are a helpful assistant.",
  model: openai("gpt-4o-mini")
});

// Generate response
const result = await agent.generate("Hello!");
console.log(result.text);

// Stream response
const stream = await agent.stream("Tell me a story");
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Register Agent with Mastra

```typescript
import { Mastra } from "@mastra/core/mastra";

export const mastra = new Mastra({
  agents: { myAgent: agent }
});

// Get and use agent
const agent = mastra.getAgent("myAgent");
```

## Core Capabilities

### 1. Tools

Create tools for agents to interact with external services:

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const weatherTool = createTool({
  id: "weather-tool",
  description: "Fetches weather for a location",
  inputSchema: z.object({ 
    location: z.string() 
  }),
  outputSchema: z.object({ 
    weather: z.string() 
  }),
  execute: async ({ context }) => {
    const { location } = context;
    const response = await fetch(`https://wttr.in/${location}?format=3`);
    return { weather: await response.text() };
  }
});

// Add tool to agent
const agent = new Agent({
  name: "weather-agent",
  instructions: "Use weatherTool to fetch weather data.",
  model: openai("gpt-4o-mini"),
  tools: { weatherTool }
});
```

**More tool patterns:** See `tool-patterns.md` for advanced patterns including API integration, database queries, web scraping with Stagehand, and MCP integration.

### 2. MCP Integration

Connect to Model Context Protocol servers for external tools:

```typescript
import { MCPClient } from "@mastra/mcp";

const mcp = new MCPClient({
  servers: {
    filesystem: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/dir"]
    }
  }
});

// Use MCP tools with agent
const agent = new Agent({
  name: "mcp-agent",
  instructions: "You can access filesystem tools.",
  model: openai("gpt-4o"),
  tools: await mcp.getTools()
});
```

**MCP Server Examples:**
```typescript
// Mastra documentation server
const mcp = new MCPClient({
  servers: {
    mastra: {
      command: "npx",
      args: ["-y", "@mastra/mcp-docs-server"]
    }
  }
});

// GitHub server
const mcp = new MCPClient({
  servers: {
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"]
    }
  }
});
```

### 3. Voice Capabilities

**Text-to-Speech (TTS):**
```typescript
import { OpenAIVoice } from "@mastra/voice-openai";

const agent = new Agent({
  name: "voice-agent",
  instructions: "You are a voice assistant.",
  model: openai("gpt-4o"),
  voice: new OpenAIVoice()
});

const audioStream = await agent.voice.speak("Hello!");
```

**Speech-to-Text (STT):**
```typescript
const transcription = await agent.voice.listen(audioStream);
```

**Real-time Speech-to-Speech:**
```typescript
import { OpenAIRealtimeVoice } from "@mastra/voice-openai-realtime";
import { playAudio, getMicrophoneStream } from "@mastra/node-audio";

const realtimeAgent = new Agent({
  name: "realtime-agent",
  instructions: "You are a real-time voice assistant.",
  model: openai("gpt-4o"),
  voice: new OpenAIRealtimeVoice()
});

await realtimeAgent.voice.connect();

// Listen for audio output
realtimeAgent.voice.on("speaker", ({ audio }) => {
  playAudio(audio);
});

// Listen for transcriptions
realtimeAgent.voice.on("writing", ({ text, role }) => {
  console.log(`${role}: ${text}`);
});

// Start conversation
await realtimeAgent.voice.speak("How can I help?");

// Send microphone input
const micStream = getMicrophoneStream();
await realtimeAgent.voice.send(micStream);
```

**Composite Voice (Mix Providers):**
```typescript
import { CompositeVoice } from "@mastra/core/voice";
import { OpenAIVoice } from "@mastra/voice-openai";
import { PlayAIVoice } from "@mastra/voice-playai";

const agent = new Agent({
  voice: new CompositeVoice({
    input: new OpenAIVoice(),   // For STT
    output: new PlayAIVoice()   // For TTS
  })
});
```

**Voice Providers:**
- OpenAI Voice (`@mastra/voice-openai`) - TTS + STT
- OpenAI Realtime (`@mastra/voice-openai-realtime`) - Speech-to-Speech
- Google Gemini Live (`@mastra/voice-google-gemini-live`) - Speech-to-Speech
- ElevenLabs (`@mastra/voice-elevenlabs`) - TTS
- PlayAI, Deepgram, Azure, Murf, Sarvam, Speechify

**For comprehensive voice implementation:** See `voice-capabilities.md`

### 4. Streaming

```typescript
const stream = await agent.stream("Help me organize my day", {
  maxSteps: 5,
  onStepFinish: ({ text, toolCalls, finishReason }) => {
    console.log({ text, toolCalls, finishReason });
  },
  onFinish: ({ text, usage }) => {
    console.log("Final:", text, "Tokens:", usage);
  }
});

for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### 5. Memory

```typescript
import { Memory } from "@mastra/memory";

const memory = new Memory();
const agent = new Agent({
  name: "memory-agent",
  instructions: "You remember past conversations.",
  model: openai("gpt-4o"),
  memory
});

// Use with thread and resource
await agent.generate("Remember this!", {
  memory: {
    thread: "user-123",
    resource: "app-name"
  }
});
```

## Workflows

Workflows provide explicit control over multi-step processes:

```typescript
import { Workflow, Step } from "@mastra/core/workflow";

const workflow = new Workflow({
  name: "content-workflow",
  triggerSchema: z.object({ topic: z.string() })
});

const researchStep = new Step({
  id: "research",
  execute: async ({ trigger }) => {
    const agent = await mastra.getAgent("researcher");
    const result = await agent.generate(`Research: ${trigger.topic}`);
    return { research: result.text };
  }
});

const writeStep = new Step({
  id: "write",
  execute: async ({ context }) => {
    const agent = await mastra.getAgent("writer");
    const result = await agent.generate(
      `Write based on: ${context.research.research}`
    );
    return { draft: result.text };
  }
});

// Sequential execution
workflow.step(researchStep).then(writeStep).commit();

// Execute
const result = await workflow.execute({ trigger: { topic: "AI" } });
```

**Workflow Control Flow:**
- `.then()` - Sequential execution
- `.branch()` - Conditional branching
- `.parallel()` - Parallel execution
- Suspend/resume - Human-in-the-loop
- State management - Share data across steps

**For complete workflow patterns:** See `workflows.md`

## Advanced Patterns

### Multi-Step Operations

```typescript
const result = await agent.generate("Complex task", {
  maxSteps: 10,
  onStepFinish: (step) => console.log(step)
});
```

### Structured Output

```typescript
const result = await agent.generate("Get user info", {
  output: {
    schema: z.object({
      name: z.string(),
      age: z.number()
    })
  }
});
```

### Web Automation with Stagehand

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import { createTool } from "@mastra/core/tools";

const stagehandActTool = createTool({
  id: "web-act",
  description: "Perform action on webpage",
  inputSchema: z.object({
    url: z.string().optional(),
    action: z.string()
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string()
  }),
  execute: async ({ context }) => {
    const stagehand = new Stagehand({
      env: "BROWSERBASE",
      apiKey: process.env.BROWSERBASE_API_KEY
    });
    await stagehand.init();
    
    const page = stagehand.page;
    if (context.url) await page.goto(context.url);
    await page.act(context.action);
    
    return { success: true, message: `Performed: ${context.action}` };
  }
});

const webAgent = new Agent({
  name: "web-agent",
  instructions: "Navigate websites and extract info.",
  model: openai("gpt-4o"),
  tools: { stagehandActTool }
});
```

## Installation

```bash
# Core packages
npm install @mastra/core @ai-sdk/openai zod

# Voice packages
npm install @mastra/voice-openai @mastra/voice-openai-realtime
npm install @mastra/node-audio  # For audio I/O

# MCP integration
npm install @mastra/mcp

# Memory
npm install @mastra/memory

# Other AI providers
npm install @ai-sdk/anthropic @ai-sdk/google

# Web automation
npm install @browserbasehq/stagehand
```

## Environment Setup

```bash
# Required API keys
OPENAI_API_KEY=your-key-here

# Optional providers
ANTHROPIC_API_KEY=your-key-here
GOOGLE_API_KEY=your-key-here
BROWSERBASE_API_KEY=your-key-here

# Database (for memory/storage)
DATABASE_URL=postgresql://...
```

## Production Best Practices

### Server Setup

```typescript
import { Mastra } from "@mastra/core/mastra";
import { createLogger } from "@mastra/core/logger";

const mastra = new Mastra({
  agents: { /* agents */ },
  workflows: { /* workflows */ },
  
  logger: createLogger({
    name: "Mastra",
    level: process.env.NODE_ENV === "production" ? "info" : "debug"
  }),
  
  storage: {
    provider: "postgres",
    connectionString: process.env.DATABASE_URL
  }
});

await mastra.serve({
  port: process.env.PORT || 4111,
  host: "0.0.0.0"
});
```

### Observability

```typescript
import { OpenTelemetryTracer } from "@mastra/core/observability";

const mastra = new Mastra({
  telemetry: {
    enabled: true,
    serviceName: "my-mastra-app",
    tracer: new OpenTelemetryTracer({
      exporter: {
        type: "otlp",
        endpoint: process.env.OTEL_ENDPOINT
      }
    })
  }
});
```

Supported platforms: Langfuse, Arize Phoenix, Braintrust, LangSmith, New Relic, Datadog

**For complete production guide:** See `best-practices.md`

## Key Principles

1. **Use `mastra.getAgent()` over direct imports** - Provides access to Mastra instance configuration
2. **Stream for user-facing responses** - Use `.stream()` for real-time feedback
3. **Generate for internal operations** - Use `.generate()` for non-interactive tasks
4. **Control iterations with maxSteps** - Prevent infinite loops and control costs
5. **Use appropriate voice providers** - Match provider to use case (realtime vs batch)

## Supporting Files

- `tool-patterns.md` - Advanced tool creation, API integration, MCP servers, database queries, web scraping
- `voice-capabilities.md` - Complete voice implementation guide for all providers (TTS, STT, Speech-to-Speech)
- `workflows.md` - Workflow orchestration, control flow, multi-agent patterns, suspend/resume
- `best-practices.md` - Production deployment, error handling, observability, performance, security, testing

## Common Use Cases

**Voice Assistant:**
```typescript
const agent = new Agent({
  name: "assistant",
  instructions: "You are a helpful voice assistant.",
  model: openai("gpt-4o"),
  voice: new OpenAIRealtimeVoice(),
  tools: { weatherTool, searchTool }
});
```

**Multi-Tool Agent:**
```typescript
const agent = new Agent({
  name: "multi-tool",
  instructions: "Use tools as needed to answer questions.",
  model: openai("gpt-4o-mini"),
  tools: { 
    searchTool, 
    weatherTool, 
    databaseTool,
    calculatorTool
  }
});
```

**Multi-Agent Workflow:**
```typescript
// Research → Write → Edit pipeline
const workflow = new Workflow({ name: "content-creation" });
workflow
  .step(researchAgentStep)
  .then(writerAgentStep)
  .then(editorAgentStep)
  .commit();
```

## Documentation

- Official Docs: https://mastra.ai/docs
- GitHub: https://github.com/mastra-ai/mastra
- MCP Docs Server: `npx -y @mastra/mcp-docs-server`
