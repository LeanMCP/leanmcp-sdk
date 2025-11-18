# @leanmcp/core

Core library for building Model Context Protocol (MCP) servers with TypeScript decorators and declarative schema definition.

## Features

- **Type-safe decorators** - `@Tool`, `@Prompt`, `@Resource` with full TypeScript support
- **Schema generation** - Define JSON Schema declaratively using `@SchemaConstraint` decorators on class properties
- **Streamable HTTP transport** - Production-ready HTTP server with session management
- **Input validation** - Built-in AJV validation for all inputs
- **Clean API** - Function names automatically become tool/prompt/resource names
- **MCP compliant** - Built on official `@modelcontextprotocol/sdk`

## Installation

```bash
npm install @leanmcp/core
```

### Peer Dependencies

For HTTP server support:
```bash
npm install express cors
```

## Quick Start

### 1. Define Your Service with Class-Based Schema

```typescript
import { Tool, SchemaConstraint, Optional } from "@leanmcp/core";

// Define input schema as a class
class AnalyzeSentimentInput {
  @SchemaConstraint({
    description: 'Text to analyze',
    minLength: 1
  })
  text!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Language code',
    enum: ['en', 'es', 'fr'],
    default: 'en'
  })
  language?: string;
}

// Define output schema
class AnalyzeSentimentOutput {
  @SchemaConstraint({ enum: ['positive', 'negative', 'neutral'] })
  sentiment!: string;

  @SchemaConstraint({ minimum: -1, maximum: 1 })
  score!: number;
}

export class SentimentService {
  @Tool({ 
    description: 'Analyze sentiment of text',
    inputClass: AnalyzeSentimentInput
  })
  async analyzeSentiment(input: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
    // Your implementation
    return {
      sentiment: 'positive',
      score: 0.8,
      confidence: 0.95
    };
  }
}
```

### 2. Create and Start Server

#### Option A: Zero-Config Auto-Discovery (Recommended)

Automatically discover and register all services from the `./mcp` directory:

```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";

// Create MCP server with auto-discovery
const serverFactory = async () => {
  const server = new MCPServer({
    name: "my-mcp-server",
    version: "1.0.0",
    logging: true
  });

  // Initialize and auto-discover services from ./mcp directory
  await server.init();

  return server.getServer();
};

// Start HTTP server
await createHTTPServer(serverFactory, {
  port: 3000,
  cors: true
});

console.log('\nMCP Server running');
console.log('HTTP endpoint: http://localhost:3000/mcp');
console.log('Health check: http://localhost:3000/health');
```

**Directory Structure:**
```
your-project/
├── main.ts
└── mcp/
    ├── sentiment/
    │   └── index.ts    # export class SentimentService
    ├── weather/
    │   └── index.ts    # export class WeatherService
    └── database/
        └── index.ts    # export class DatabaseService
```

#### Option B: Manual Registration

Manually import and register each service:

```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { SentimentService } from "./services/sentiment";

// Create MCP server
const serverFactory = () => {
  const server = new MCPServer({
    name: "my-mcp-server",
    version: "1.0.0",
    logging: true
  });

  // Register services manually
  server.registerService(new SentimentService());

  return server.getServer();
};

// Start HTTP server
await createHTTPServer(serverFactory, {
  port: 3000,
  cors: true,
  logging: true
});
```

## Decorators

### @Tool

Marks a method as an MCP tool (callable function). Use `inputClass` to specify the input schema class.

```typescript
class CalculateInput {
  @SchemaConstraint({ description: 'First number' })
  a!: number;
  
  @SchemaConstraint({ description: 'Second number' })
  b!: number;
}

@Tool({ 
  description: 'Calculate sum of two numbers',
  inputClass: CalculateInput
})
async calculate(input: CalculateInput) {
  return { result: input.a + input.b };
}
```

### @Prompt

Marks a method as an MCP prompt template. Input schema is automatically inferred from parameter type.

```typescript
class CodeReviewInput {
  @SchemaConstraint({ description: 'Code to review' })
  code!: string;
  
  @SchemaConstraint({ description: 'Programming language' })
  language!: string;
}

@Prompt({ description: 'Generate code review prompt' })
codeReview(input: CodeReviewInput) {
  return {
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Review this ${input.language} code:\n\n${input.code}`
      }
    }]
  };
}
```

### @Resource

Marks a method as an MCP resource (data source).

```typescript
@Resource({ description: 'Get system configuration', mimeType: 'application/json' })
async getConfig() {
  return {
    version: "1.0.0",
    environment: process.env.NODE_ENV
  };
}
```

### @SchemaConstraint

Add validation constraints to class properties for automatic schema generation.

```typescript
class UserInput {
  @SchemaConstraint({
    description: 'User email',
    format: 'email',
    minLength: 5,
    maxLength: 100
  })
  email!: string;

  @SchemaConstraint({
    description: 'User age',
    minimum: 18,
    maximum: 120
  })
  age!: number;

  @Optional()
  @SchemaConstraint({
    description: 'User role',
    enum: ['admin', 'user', 'guest'],
    default: 'user'
  })
  role?: string;
}
```

### @Optional

Marks a property as optional in the schema.

```typescript
class SearchInput {
  @SchemaConstraint({ description: 'Search query' })
  query!: string;

  @Optional()
  @SchemaConstraint({ description: 'Max results', default: 10 })
  limit?: number;
}
```

## API Reference

### MCPServer

Main server class for registering services.

```typescript
const server = new MCPServer({
  name: string;        // Server name
  version: string;     // Server version
  logging?: boolean;   // Enable logging (default: false)
});

// Manual registration
server.registerService(instance: any): void;

// Initialize and auto-discover services
await server.init(): Promise<void>;

// Get underlying MCP SDK server
server.getServer(): Server;
```

#### Zero-Config Auto-Discovery

The `init()` method automatically discovers and registers all services from the `./mcp` directory:

**Basic Usage:**
```typescript
const serverFactory = async () => {
  const server = new MCPServer({
    name: "my-server",
    version: "1.0.0",
    logging: true
  });

  // Initialize and auto-discover services from ./mcp directory
  await server.init();

  return server.getServer();
};
```

**With Shared Dependencies:**

For services that need shared dependencies, create a `config.ts` file in your `mcp` directory:

```typescript
// mcp/config.ts
import { AuthProvider } from "@leanmcp/auth";

if (!process.env.COGNITO_USER_POOL_ID || !process.env.COGNITO_CLIENT_ID) {
  throw new Error('Missing required Cognito configuration');
}

export const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION || 'us-east-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID,
  clientSecret: process.env.COGNITO_CLIENT_SECRET
});

await authProvider.init();
```

Then import in your services:

```typescript
// mcp/slack/index.ts
import { Tool } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";
import { authProvider } from "../config.js";

@Authenticated(authProvider)
export class SlackService {
  constructor() {
    // No parameters needed - use environment or imported config
  }

  @Tool({ description: 'Send a message' })
  async sendMessage(args: any) {
    // Implementation
  }
}
```

Your main file stays clean:

```typescript
const serverFactory = async () => {
  const server = new MCPServer({
    name: "my-server",
    version: "1.0.0",
    logging: true
  });

  await server.init();

  return server.getServer();
};
```

**How It Works:**
- Automatically detects the caller's directory and looks for a `./mcp` subdirectory
- Recursively scans for `index.ts` or `index.js` files
- Dynamically imports each file and looks for exported classes
- Instantiates services with no-args constructors
- Automatically registers all discovered services with their decorated methods

**Directory Structure:**
```
your-project/
├── main.ts
└── mcp/
    ├── config.ts      # Optional: shared dependencies
    ├── slack/
    │   └── index.ts   # export class SlackService
    ├── database/
    │   └── index.ts   # export class DatabaseService
    └── auth/
        └── index.ts   # export class AuthService
```

### createHTTPServer

Create and start an HTTP server with streamable transport.

```typescript
await createHTTPServer(
  serverFactory: () => Server,
  options: {
    port?: number;      // Port number (default: 3000)
    cors?: boolean;     // Enable CORS (default: false)
    logging?: boolean;  // Enable logging (default: true)
  }
);
```

### Schema Generation

Generate JSON Schema from TypeScript classes:

```typescript
import { classToJsonSchemaWithConstraints } from "@leanmcp/core";

const schema = classToJsonSchemaWithConstraints(MyInputClass);
```

## HTTP Endpoints

When using `createHTTPServer`, the following endpoints are available:

- `POST /mcp` - MCP protocol endpoint (accepts JSON-RPC 2.0 messages)
- `GET /health` - Health check endpoint
- `GET /` - Welcome message

## Environment Variables

```bash
PORT=3000              # Server port (optional)
NODE_ENV=production    # Environment (optional)
```

## Error Handling

All tools automatically handle errors and return them in MCP format:

```typescript
class DivideInput {
  @SchemaConstraint({ description: 'Numerator' })
  a!: number;
  
  @SchemaConstraint({ description: 'Denominator' })
  b!: number;
}

@Tool({ 
  description: 'Divide numbers',
  inputClass: DivideInput
})
async divide(input: DivideInput) {
  if (input.b === 0) {
    throw new Error("Division by zero");
  }
  return { result: input.a / input.b };
}
```

Errors are returned as:
```json
{
  "content": [{"type": "text", "text": "Error: Division by zero"}],
  "isError": true
}
```

## TypeScript Support

Full TypeScript support with type inference:

```typescript
class MyInput {
  @SchemaConstraint({ description: 'Input field' })
  field!: string;
}

class MyOutput {
  result!: string;
}

// Input schema defined via inputClass, output type inferred from return type
@Tool({ 
  description: 'My tool',
  inputClass: MyInput
})
async myTool(input: MyInput): Promise<MyOutput> {
  // TypeScript knows the exact types
  const result: MyOutput = {
    result: input.field.toUpperCase()
    // Full autocomplete and type checking
  };
  return result;
}
```

**Key Points:**
- Input schema is defined using `inputClass` in the `@Tool` decorator
- Output schema is inferred from the return type
- For tools with no input parameters, omit the `inputClass` option
- Use `@SchemaConstraint` decorators to add validation and documentation to your input classes

## License

MIT

## Related Packages

- [@leanmcp/cli](../cli) - CLI tool for creating new projects
- [@leanmcp/auth](../auth) - Authentication decorators and providers
- [@leanmcp/utils](../utils) - Utility functions

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)
