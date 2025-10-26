# Workflow Orchestration

## Basic Workflow

```typescript
import { Workflow, Step } from "@mastra/core/workflow";
import { z } from "zod";

const workflow = new Workflow({
  name: "simple-workflow",
  triggerSchema: z.object({
    input: z.string()
  })
});

const step1 = new Step({
  id: "step1",
  execute: async ({ context, trigger }) => {
    const result = await processData(trigger.input);
    return { result };
  }
});

const step2 = new Step({
  id: "step2",
  execute: async ({ context }) => {
    // Access previous step results via context
    const finalResult = await finalizeData(context.step1.result);
    return { finalResult };
  }
});

// Chain steps
workflow
  .step(step1)
  .then(step2)
  .commit();

// Execute
const result = await workflow.execute({
  trigger: { input: "test data" }
});
```

## Control Flow

### Sequential (.then)

```typescript
workflow
  .step(fetchData)
  .then(processData)
  .then(saveData)
  .commit();
```

### Branching (.branch)

```typescript
const checkCondition = new Step({
  id: "check",
  execute: async ({ trigger }) => {
    return { shouldProceed: trigger.value > 100 };
  }
});

const yesPath = new Step({
  id: "yes-path",
  execute: async () => ({ result: "High value" })
});

const noPath = new Step({
  id: "no-path",
  execute: async () => ({ result: "Low value" })
});

workflow
  .step(checkCondition)
  .branch({
    when: (ctx) => ctx.check.shouldProceed,
    then: yesPath,
    else: noPath
  })
  .commit();
```

### Parallel Execution (.parallel)

```typescript
const fetchUsers = new Step({
  id: "fetch-users",
  execute: async () => {
    const users = await db.users.findMany();
    return { users };
  }
});

const fetchProducts = new Step({
  id: "fetch-products",
  execute: async () => {
    const products = await db.products.findMany();
    return { products };
  }
});

const combineData = new Step({
  id: "combine",
  execute: async ({ context }) => {
    return {
      combined: {
        users: context.fetchUsers.users,
        products: context.fetchProducts.products
      }
    };
  }
});

workflow
  .parallel([fetchUsers, fetchProducts])
  .then(combineData)
  .commit();
```

## Workflows with Agents

### Agent Step

```typescript
const analyzeAgent = new Agent({
  name: "analyzer",
  instructions: "Analyze the provided data.",
  model: openai("gpt-4o-mini")
});

const agentStep = new Step({
  id: "analyze-with-agent",
  execute: async ({ context }) => {
    const agent = await mastra.getAgent("analyzer");
    const result = await agent.generate(context.previousStep.data);
    return { analysis: result.text };
  }
});

workflow
  .step(fetchData)
  .then(agentStep)
  .then(saveAnalysis)
  .commit();
```

### Multi-Agent Workflow

```typescript
const researchAgent = new Agent({
  name: "researcher",
  instructions: "Research the topic thoroughly.",
  model: openai("gpt-4o")
});

const writerAgent = new Agent({
  name: "writer",
  instructions: "Write content based on research.",
  model: openai("gpt-4o")
});

const editorAgent = new Agent({
  name: "editor",
  instructions: "Edit and improve the content.",
  model: openai("gpt-4o-mini")
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

const editStep = new Step({
  id: "edit",
  execute: async ({ context }) => {
    const agent = await mastra.getAgent("editor");
    const result = await agent.generate(
      `Edit this: ${context.write.draft}`
    );
    return { final: result.text };
  }
});

workflow
  .step(researchStep)
  .then(writeStep)
  .then(editStep)
  .commit();
```

## Suspend and Resume

```typescript
const approvalStep = new Step({
  id: "needs-approval",
  execute: async ({ context }) => {
    return { 
      needsApproval: true,
      data: context.previousStep.result 
    };
  }
});

// Execute
const execution = await workflow.execute({ trigger: data });

if (execution.status === "suspended") {
  // Wait for user approval
  const approved = await getUserApproval();
  
  if (approved) {
    await workflow.resume(execution.id, { approved: true });
  }
}
```

## Human-in-the-Loop

```typescript
const humanReviewStep = new Step({
  id: "human-review",
  execute: async ({ context, suspend }) => {
    const userInput = await suspend({
      message: "Please review the data",
      data: context.previousStep.data
    });
    
    return { reviewed: true, userFeedback: userInput };
  }
});

workflow
  .step(processData)
  .then(humanReviewStep)
  .then(finalizeData)
  .commit();
```

## State Management

Share data across steps:

```typescript
const step1 = new Step({
  id: "step1",
  execute: async ({ context, setState }) => {
    await setState({ globalCounter: 0 });
    return { localData: "something" };
  }
});

const step2 = new Step({
  id: "step2",
  execute: async ({ context, getState }) => {
    const state = await getState();
    const counter = state.globalCounter + 1;
    await setState({ globalCounter: counter });
    return { updated: true };
  }
});
```

## Workflow Streaming

```typescript
const stream = await workflow.stream({ trigger: data });

for await (const event of stream) {
  if (event.type === "step-start") {
    console.log(`Starting: ${event.stepId}`);
  }
  if (event.type === "step-complete") {
    console.log(`Completed: ${event.stepId}`, event.result);
  }
  if (event.type === "workflow-complete") {
    console.log("Done", event.result);
  }
}
```

## Advanced Patterns

### Map-Reduce

```typescript
const processItems = new Step({
  id: "process-items",
  execute: async ({ trigger }) => {
    const results = await Promise.all(
      trigger.items.map(item => processItem(item))
    );
    return { results };
  }
});

const aggregateResults = new Step({
  id: "aggregate",
  execute: async ({ context }) => {
    const total = context.processItems.results.reduce(
      (sum, r) => sum + r.value, 
      0
    );
    return { total };
  }
});

workflow
  .step(processItems)
  .then(aggregateResults)
  .commit();
```

### Conditional Retry

```typescript
const retryableStep = new Step({
  id: "with-retry",
  execute: async ({ context, getState, setState }) => {
    const state = await getState();
    const attempts = state.attempts || 0;
    
    try {
      const result = await unreliableOperation();
      return { success: true, result };
    } catch (error) {
      if (attempts < 3) {
        await setState({ attempts: attempts + 1 });
        throw error; // Retry
      }
      return { success: false, error: error.message };
    }
  }
});
```

### Agent Network

```typescript
const plannerAgent = new Agent({
  name: "planner",
  instructions: "Create a plan"
});

const executorAgents = [
  new Agent({ name: "executor1", instructions: "Execute part 1" }),
  new Agent({ name: "executor2", instructions: "Execute part 2" })
];

const reviewerAgent = new Agent({
  name: "reviewer",
  instructions: "Review and synthesize"
});

const planStep = new Step({
  id: "plan",
  execute: async ({ trigger }) => {
    const agent = await mastra.getAgent("planner");
    const result = await agent.generate(trigger.task);
    return { plan: result.text };
  }
});

const executeStep1 = new Step({
  id: "execute1",
  execute: async ({ context }) => {
    const agent = await mastra.getAgent("executor1");
    const result = await agent.generate(context.plan.plan);
    return { result: result.text };
  }
});

const executeStep2 = new Step({
  id: "execute2",
  execute: async ({ context }) => {
    const agent = await mastra.getAgent("executor2");
    const result = await agent.generate(context.plan.plan);
    return { result: result.text };
  }
});

const reviewStep = new Step({
  id: "review",
  execute: async ({ context }) => {
    const agent = await mastra.getAgent("reviewer");
    const combined = `
      Result 1: ${context.execute1.result}
      Result 2: ${context.execute2.result}
    `;
    const result = await agent.generate(`Review: ${combined}`);
    return { final: result.text };
  }
});

workflow
  .step(planStep)
  .parallel([executeStep1, executeStep2])
  .then(reviewStep)
  .commit();
```

## Best Practices

### Clear Step Naming

```typescript
// Bad
const step1 = new Step({ id: "s1", ... });

// Good
const fetchUserData = new Step({ id: "fetch-user-data", ... });
```

### Handle Context Properly

```typescript
execute: async ({ context, trigger, getState, setState }) => {
  // Previous step results
  const previousResult = context.previousStepId.data;
  
  // Workflow trigger
  const userId = trigger.userId;
  
  // Workflow state
  const state = await getState();
  await setState({ newValue: 123 });
}
```

### Monitor Progress

```typescript
const result = await workflow.execute({
  trigger: data,
  onStepComplete: (stepId, result) => {
    console.log(`Step ${stepId} done:`, result);
  },
  onError: (stepId, error) => {
    console.error(`Step ${stepId} failed:`, error);
  }
});
```

## Workflow Registration

```typescript
import { Mastra } from "@mastra/core/mastra";

const mastra = new Mastra({
  agents: { /* agents */ },
  workflows: {
    contentCreation: contentWorkflow,
    dataProcessing: dataWorkflow
  }
});

// Execute
const result = await mastra.executeWorkflow("contentCreation", {
  trigger: { topic: "AI" }
});
```
