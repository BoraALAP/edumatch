# Tool Patterns and MCP Integration

## Basic Tool Structure

```typescript
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

const toolName = createTool({
  id: "unique-tool-id",
  description: "Clear description of what the tool does",
  inputSchema: z.object({
    param1: z.string().describe("Parameter description"),
    param2: z.number().optional()
  }),
  outputSchema: z.object({
    result: z.string()
  }),
  execute: async ({ context }) => {
    const { param1, param2 } = context;
    // Tool logic here
    return { result: "output" };
  }
});
```

## Common Tool Patterns

### API Integration Tool

```typescript
const githubRepoTool = createTool({
  id: "github-repo-tool",
  description: "Fetches GitHub repository information",
  inputSchema: z.object({
    owner: z.string().describe("Repository owner"),
    repo: z.string().describe("Repository name")
  }),
  outputSchema: z.object({
    stars: z.number(),
    forks: z.number(),
    description: z.string()
  }),
  execute: async ({ context }) => {
    const { owner, repo } = context;
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`
    );
    const data = await response.json();
    
    return {
      stars: data.stargazers_count,
      forks: data.forks_count,
      description: data.description
    };
  }
});
```

### Database Query Tool (Supabase)

```typescript
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

const queryUsersTool = createTool({
  id: "query-users",
  description: "Query users from Supabase database",
  inputSchema: z.object({
    email: z.string().email().optional(),
    limit: z.number().default(10)
  }),
  outputSchema: z.object({
    users: z.array(z.object({
      id: z.string(),
      email: z.string(),
      name: z.string()
    }))
  }),
  execute: async ({ context }) => {
    let query = supabase.from("users").select("*");
    
    if (context.email) {
      query = query.eq("email", context.email);
    }
    
    const { data, error } = await query.limit(context.limit);
    
    if (error) throw error;
    return { users: data };
  }
});
```

### File System Tool

```typescript
import { readFile, writeFile } from "fs/promises";
import path from "path";

const readFileTool = createTool({
  id: "read-file",
  description: "Read contents of a file",
  inputSchema: z.object({
    filename: z.string()
  }),
  outputSchema: z.object({
    content: z.string()
  }),
  execute: async ({ context }) => {
    const filePath = path.join(process.cwd(), context.filename);
    const content = await readFile(filePath, "utf-8");
    return { content };
  }
});
```

### Web Scraping Tool (Stagehand)

```typescript
import { Stagehand } from "@browserbasehq/stagehand";

class StagehandSessionManager {
  private stagehand: Stagehand | null = null;
  
  async ensureStagehand() {
    if (!this.stagehand) {
      this.stagehand = new Stagehand({
        env: "BROWSERBASE",
        apiKey: process.env.BROWSERBASE_API_KEY
      });
      await this.stagehand.init();
    }
    return this.stagehand;
  }
  
  async close() {
    if (this.stagehand) {
      await this.stagehand.close();
      this.stagehand = null;
    }
  }
}

const sessionManager = new StagehandSessionManager();

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
    const stagehand = await sessionManager.ensureStagehand();
    const page = stagehand.page;
    
    if (context.url) {
      await page.goto(context.url);
    }
    
    await page.act(context.action);
    
    return {
      success: true,
      message: `Performed: ${context.action}`
    };
  }
});

const stagehandExtractTool = createTool({
  id: "web-extract",
  description: "Extract data from webpage",
  inputSchema: z.object({
    url: z.string(),
    instruction: z.string().describe("What to extract")
  }),
  outputSchema: z.object({
    data: z.any()
  }),
  execute: async ({ context }) => {
    const stagehand = await sessionManager.ensureStagehand();
    const page = stagehand.page;
    
    await page.goto(context.url);
    const data = await page.extract(context.instruction);
    
    return { data };
  }
});
```

## MCP Integration

### Basic MCP Client

```typescript
import { MCPClient } from "@mastra/mcp";

const mcp = new MCPClient({
  servers: {
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Documents"
      ]
    },
    github: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"]
    }
  }
});

// Get all tools
const tools = await mcp.getTools();

// Use with agent
const agent = new Agent({
  name: "mcp-agent",
  instructions: "You can access filesystem and GitHub tools.",
  model: openai("gpt-4o"),
  tools
});
```

### Dynamic Tool Loading

```typescript
// Load tools dynamically per request
const response = await agent.stream("Read my notes", {
  toolsets: await mcp.getToolsets()
});
```

### Common MCP Servers

```typescript
// Mastra documentation
const mcp = new MCPClient({
  servers: {
    mastra: {
      command: "npx",
      args: ["-y", "@mastra/mcp-docs-server"]
    }
  }
});

// PostgreSQL
const mcp = new MCPClient({
  servers: {
    postgres: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-postgres", DATABASE_URL]
    }
  }
});

// Brave Search
const mcp = new MCPClient({
  servers: {
    brave: {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-brave-search"]
    }
  }
});
```

### Custom MCP Server

```typescript
import { MCPServer } from "@mastra/mcp";

const server = new MCPServer({
  name: "My Custom Server",
  version: "1.0.0",
  tools: {
    weatherTool,
    searchTool
  },
  agents: {
    helperAgent  // Agents exposed as tools (needs description)
  }
});
```

## Advanced Tool Patterns

### Tool with Error Handling

```typescript
const robustTool = createTool({
  id: "robust-api-call",
  description: "API call with retry logic",
  inputSchema: z.object({ endpoint: z.string() }),
  outputSchema: z.object({ 
    success: z.boolean(),
    data: z.any().optional(),
    error: z.string().optional()
  }),
  execute: async ({ context }) => {
    const maxRetries = 3;
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(context.endpoint);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return { success: true, data };
      } catch (error) {
        lastError = error;
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      }
    }
    
    return { 
      success: false, 
      error: `Failed after ${maxRetries} retries: ${lastError}` 
    };
  }
});
```

### Tool with Caching

```typescript
const cache = new Map();

const cachedTool = createTool({
  id: "cached-lookup",
  description: "Look up data with caching",
  inputSchema: z.object({ key: z.string() }),
  outputSchema: z.object({ value: z.string() }),
  execute: async ({ context }) => {
    const cacheKey = context.key;
    
    if (cache.has(cacheKey)) {
      return { value: cache.get(cacheKey) };
    }
    
    const value = await expensiveOperation(context.key);
    cache.set(cacheKey, value);
    
    return { value };
  }
});
```

## Tool Usage Patterns

### Multiple Tools in Agent

```typescript
const agent = new Agent({
  name: "multi-tool-agent",
  instructions: `You are a helpful assistant with access to:
- weatherTool: Check weather
- searchTool: Search the web
- dbQueryTool: Query database
Use tools when needed to answer questions.`,
  model: openai("gpt-4o-mini"),
  tools: {
    weatherTool,
    searchTool,
    dbQueryTool
  }
});
```

### Tool Chaining

Agent automatically chains tools:

```typescript
// Agent might:
// 1. searchTool to find info
// 2. weatherTool to get conditions
// 3. Combine results

const result = await agent.generate(
  "What should I wear in London today?",
  { maxSteps: 5 }
);
```

## Best Practices

### 1. Clear Descriptions

```typescript
// Bad
description: "Does stuff"

// Good
description: "Fetches current weather data for a given location using wttr.in API"
```

### 2. Descriptive Schema Fields

```typescript
inputSchema: z.object({
  location: z.string().describe("City name or coordinates (e.g., 'London' or '51.5074,-0.1278')"),
  units: z.enum(["metric", "imperial"]).optional().describe("Temperature units")
})
```

### 3. Handle Errors Gracefully

```typescript
execute: async ({ context }) => {
  try {
    const result = await operation(context);
    return { success: true, result };
  } catch (error) {
    return { 
      success: false, 
      error: error.message
    };
  }
}
```

### 4. Validate Inputs

```typescript
inputSchema: z.object({
  email: z.string().email("Must be valid email"),
  age: z.number().min(0).max(150),
  url: z.string().url()
})
```

## Testing Tools

```typescript
// Test tool independently
const testTool = async () => {
  const result = await weatherTool.execute({
    context: { location: "London" }
  });
  console.log(result);
};

// Test with agent
const testAgent = async () => {
  const agent = new Agent({
    name: "test",
    instructions: "Test the tool",
    model: openai("gpt-4o-mini"),
    tools: { weatherTool }
  });
  
  const result = await agent.generate("What's the weather in London?");
  console.log(result.text);
};
```
