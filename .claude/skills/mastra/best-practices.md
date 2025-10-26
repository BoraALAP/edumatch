# Production Best Practices

## Server Setup

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

// Run server
await mastra.serve({
  port: process.env.PORT || 4111,
  host: "0.0.0.0"
});
```

## Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...

# Database (for memory/storage)
DATABASE_URL=postgresql://...

# Optional providers
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=...
BROWSERBASE_API_KEY=...

# Observability
TELEMETRY_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=https://...

# Server
PORT=4111
NODE_ENV=production
```

## Error Handling

### Agent Errors

```typescript
try {
  const result = await agent.generate(message, {
    maxSteps: 5,
    onStepFinish: ({ finishReason, error }) => {
      if (error) {
        console.error("Step error:", error);
      }
    }
  });
} catch (error) {
  if (error.code === "RATE_LIMIT") {
    await delay(60000);
    return retry();
  }
  
  if (error.code === "CONTEXT_LENGTH_EXCEEDED") {
    return "Response too long";
  }
  
  console.error("Agent error:", error);
  throw new Error("Failed to generate");
}
```

### Tool Errors

```typescript
const robustTool = createTool({
  id: "robust-tool",
  description: "Tool with error handling",
  inputSchema: z.object({ input: z.string() }),
  outputSchema: z.object({ 
    success: z.boolean(),
    result: z.string().optional(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    try {
      const result = await operation(context.input);
      return { success: true, result };
    } catch (error) {
      console.error("Tool error:", error);
      return { 
        success: false, 
        error: error.message
      };
    }
  }
});
```

### Voice Errors

```typescript
const agent = new Agent({
  voice: new OpenAIRealtimeVoice()
});

await agent.voice.connect();

agent.voice.on("error", (error) => {
  console.error("Voice error:", error);
  
  // Reconnect
  setTimeout(async () => {
    try {
      await agent.voice.connect();
    } catch (e) {
      console.error("Reconnection failed:", e);
    }
  }, 5000);
});
```

## Observability

### AI Tracing

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

### Logging

```typescript
import { createLogger } from "@mastra/core/logger";

const logger = createLogger({
  name: "Mastra",
  level: "info",
  prettyPrint: process.env.NODE_ENV !== "production"
});

const mastra = new Mastra({ logger });

// Custom logging
execute: async ({ context }) => {
  logger.info("Processing", { userId: context.userId });
  
  try {
    const result = await operation();
    logger.info("Success", { result });
    return result;
  } catch (error) {
    logger.error("Failed", { error });
    throw error;
  }
}
```

### Third-Party Platforms

```typescript
import { LangfuseExporter } from "@mastra/observability";

const mastra = new Mastra({
  telemetry: {
    enabled: true,
    exporters: [
      new LangfuseExporter({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY
      })
    ]
  }
});
```

Supported: Langfuse, Arize Phoenix, Braintrust, LangSmith, New Relic, Datadog

## Performance

### Streaming

```typescript
// Instead of waiting
const result = await agent.generate(message);

// Stream for immediate feedback
const stream = await agent.stream(message);
for await (const chunk of stream.textStream) {
  process.stdout.write(chunk);
}
```

### Limit maxSteps

```typescript
const result = await agent.generate(message, {
  maxSteps: 5  // Prevent infinite loops
});
```

### Model Selection

```typescript
// Fast, cheap for simple tasks
const quickAgent = new Agent({
  model: openai("gpt-4o-mini")
});

// Capable for complex tasks
const powerAgent = new Agent({
  model: openai("gpt-4o")
});
```

### Connection Pooling

```typescript
// Reuse database connections
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient(url, key);

// Share across tools
const tool = createTool({
  execute: async () => {
    const { data } = await supabaseClient.from("table").select();
    return data;
  }
});
```

### Caching

```typescript
import { LRUCache } from "lru-cache";

const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5  // 5 minutes
});

const cachedTool = createTool({
  execute: async ({ context }) => {
    const key = JSON.stringify(context);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = await expensiveOperation(context);
    cache.set(key, result);
    return result;
  }
});
```

## Security

### API Key Management

```typescript
// ❌ Bad - hardcoded
const agent = new Agent({
  model: openai("gpt-4o", {
    apiKey: "sk-proj-abc123..."
  })
});

// ✅ Good - environment variables
const agent = new Agent({
  model: openai("gpt-4o")
});
```

### Input Validation

```typescript
const tool = createTool({
  inputSchema: z.object({
    email: z.string().email(),
    age: z.number().min(0).max(150),
    url: z.string().url()
  }),
  execute: async ({ context }) => {
    // Schema validates before execution
  }
});
```

### Rate Limiting

```typescript
import { RateLimiter } from "limiter";

const limiter = new RateLimiter({
  tokensPerInterval: 10,
  interval: "minute"
});

execute: async ({ context }) => {
  await limiter.removeTokens(1);
  return await operation(context);
}
```

### Content Filtering

```typescript
const agent = new Agent({
  instructions: `You are a helpful assistant.
  
Never provide:
- Personal information
- Harmful content
- Copyrighted material

Politely decline inappropriate requests.`,
  model: openai("gpt-4o")
});
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";

describe("Weather Agent", () => {
  it("should fetch weather", async () => {
    const result = await agent.generate(
      "What's the weather in London?"
    );
    
    expect(result.text).toContain("London");
  });
  
  it("should use tool", async () => {
    const result = await agent.generate(
      "Check weather in Paris",
      {
        onStepFinish: ({ toolCalls }) => {
          expect(toolCalls).toHaveLength(1);
          expect(toolCalls[0].name).toBe("weatherTool");
        }
      }
    );
  });
});
```

### Integration Tests

```typescript
describe("Multi-Agent Workflow", () => {
  it("should complete workflow", async () => {
    const result = await workflow.execute({
      trigger: { topic: "AI" }
    });
    
    expect(result.status).toBe("completed");
    expect(result.output.final).toBeDefined();
  });
});
```

## Common Patterns

### Retry Logic

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

const result = await withRetry(() => 
  agent.generate("Complex query")
);
```

### Graceful Degradation

```typescript
async function getResponse(message: string) {
  try {
    return await primaryAgent.generate(message);
  } catch (error) {
    console.warn("Primary failed, using fallback");
    
    try {
      return await fallbackAgent.generate(message);
    } catch (fallbackError) {
      return { 
        text: "Technical difficulties. Try again later." 
      };
    }
  }
}
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database/storage connected
- [ ] Logging enabled
- [ ] Telemetry configured
- [ ] Error handling implemented
- [ ] Rate limiting in place
- [ ] Security measures applied
- [ ] Tests passing
- [ ] Monitoring dashboards set up
- [ ] Health check endpoint working
