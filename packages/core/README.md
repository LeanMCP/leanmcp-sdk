<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.png"
    alt="LeanMCP Logo"
    width="400"
  />
</p>

<p align="center">
  <strong>@leanmcp/core</strong><br/>
  Core library for building MCP servers with TypeScript decorators and declarative schema definition.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/core">
    <img src="https://img.shields.io/npm/v/@leanmcp/core" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/core">
    <img src="https://img.shields.io/npm/dm/@leanmcp/core" alt="npm downloads" />
  </a>
  <a href="https://docs.leanmcp.com/sdk/core">
    <img src="https://img.shields.io/badge/Docs-leanmcp-0A66C2?" />
  </a>
  <a href="https://discord.com/invite/DsRcA3GwPy">
    <img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://x.com/LeanMcp">
    <img src="https://img.shields.io/badge/@LeanMCP-f5f5f5?logo=x&logoColor=000000" />
  </a>
</p>

## Features

- **Type-Safe Decorators** — `@Tool`, `@Prompt`, `@Resource` with full TypeScript support
- **Auto-Discovery** — Zero-config service discovery from `./mcp` directory
- **Schema Generation** — Declarative JSON Schema with `@SchemaConstraint` decorators
- **HTTP Transport** — Production-ready HTTP server with session management
- **Input Validation** — Built-in AJV validation for all inputs
- **Structured Content** — Automatic `structuredContent` for ChatGPT Apps SDK compatibility
- **MCP Compliant** — Built on official `@modelcontextprotocol/sdk`

## Installation

```bash
npm install @leanmcp/core
```

For HTTP server support:
```bash
npm install express cors
```

## Quick Start

### Zero-Config (Recommended)

The simplest way to create an MCP server with auto-discovery:

```typescript
import { createHTTPServer } from "@leanmcp/core";

await createHTTPServer({
  name: "my-mcp-server",
  version: "1.0.0",
  port: 3001,
  cors: true,
  logging: true
});

// Services are automatically discovered from ./mcp directory
```

**Directory Structure:**
```
your-project/
├── main.ts
└── mcp/
    ├── sentiment/
    │   └── index.ts   # export class SentimentService
    ├── weather/
    │   └── index.ts   # export class WeatherService
    └── config.ts      # Optional: shared dependencies
```

### Define a Service

```typescript
// mcp/sentiment/index.ts
import { Tool, SchemaConstraint, Optional } from "@leanmcp/core";

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

export class SentimentService {
  @Tool({ 
    description: 'Analyze sentiment of text',
    inputClass: AnalyzeSentimentInput
  })
  async analyzeSentiment(input: AnalyzeSentimentInput) {
    return {
      sentiment: 'positive',
      score: 0.8
    };
  }
}
```

---

## Decorators

### @Tool

Marks a method as a callable MCP tool.

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

**Options:**

| Option | Type | Description |
|--------|------|-------------|
| `description` | `string` | Tool description for the AI |
| `inputClass` | `Class` | Class defining input schema |

### @Prompt

Marks a method as a reusable prompt template.

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
@Resource({ 
  description: 'Get system configuration', 
  mimeType: 'application/json' 
})
async getConfig() {
  return {
    version: "1.0.0",
    environment: process.env.NODE_ENV
  };
}
```

### @SchemaConstraint

Add validation constraints to class properties.

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

**Common constraints:**
- `description`, `default` — Documentation
- `minLength`, `maxLength` — String length
- `minimum`, `maximum` — Number range
- `enum` — Allowed values
- `format` — String format (`email`, `uri`, `date`, etc.)
- `pattern` — Regex pattern

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

---

## API Reference

### createHTTPServer

Create and start an HTTP server with auto-discovery.

**Simplified API (Recommended):**
```typescript
await createHTTPServer({
  name: string;              // Server name (required)
  version: string;           // Server version (required)
  port?: number;             // Port (default: 3001)
  cors?: boolean | object;   // Enable CORS (default: false)
  logging?: boolean;         // Enable logging (default: false)
  debug?: boolean;           // Verbose debug logs (default: false)
  autoDiscover?: boolean;    // Auto-discover services (default: true)
  mcpDir?: string;           // Custom mcp directory path
  sessionTimeout?: number;   // Session timeout in ms
  stateless?: boolean;       // Stateless mode for Lambda/serverless (default: true)
  dashboard?: boolean;       // Serve dashboard UI at / (default: true)
});
```

**Factory Pattern (Advanced):**
```typescript
const serverFactory = async () => {
  const server = new MCPServer({
    name: "my-server",
    version: "1.0.0",
    autoDiscover: false  // Disable for manual registration
  });
  
  server.registerService(new MyService());
  return server.getServer();
};

await createHTTPServer(serverFactory, {
  port: 3001,
  cors: true
});
```

### MCPServer

Main server class for registering services.

```typescript
const server = new MCPServer({
  name: string;           // Server name
  version: string;        // Server version
  logging?: boolean;      // Enable logging (default: false)
  debug?: boolean;        // Verbose debug logs (default: false)
  autoDiscover?: boolean; // Auto-discover from ./mcp (default: true)
  mcpDir?: string;        // Custom mcp directory path
});

server.registerService(instance);  // Manual registration
server.getServer();                // Get underlying MCP SDK server
```

---

## Auto-Discovery

Services are automatically discovered from the `./mcp` directory:

1. Recursively scans for `index.ts` or `index.js` files
2. Dynamically imports each file
3. Looks for exported classes
4. Instantiates with no-args constructors
5. Registers all decorated methods

### Shared Dependencies

For services needing shared configuration (auth, database, etc.), create a `config.ts`:

```typescript
// mcp/config.ts
import { AuthProvider } from "@leanmcp/auth";

export const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION,
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID
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
  @Tool({ description: 'Send a message' })
  async sendMessage(args: { channel: string; message: string }) {
    // Implementation
  }
}
```

---

## Structured Content

Tool return values are automatically exposed as `structuredContent` in the MCP response, enabling ChatGPT Apps SDK compatibility.

**Automatic Handling:**

```typescript
@Tool({ description: 'List channels' })
async listChannels() {
  // Return a plain object - it becomes structuredContent automatically
  return { channels: [...] };
}
```

The response includes both `content` (text) and `structuredContent` (object):

```json
{
  "content": [{ "type": "text", "text": "{\"channels\": [...]}" }],
  "structuredContent": { "channels": [...] }
}
```

**Manual MCP Response:**

If your tool returns a manual MCP response (with `content` array), the SDK extracts data from `content[0].text`:

```typescript
return {
  content: [{ type: 'text', text: JSON.stringify({ channels }) }]
};
// structuredContent will be { channels: [...] }
```

---

## HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/mcp` | POST | MCP protocol endpoint (JSON-RPC 2.0) |
| `/health` | GET | Health check |
| `/` | GET | Welcome message |

## Error Handling

Errors are automatically caught and returned in MCP format:

```typescript
@Tool({ description: 'Divide numbers', inputClass: DivideInput })
async divide(input: DivideInput) {
  if (input.b === 0) {
    throw new Error("Division by zero");
  }
  return { result: input.a / input.b };
}
```

Returns:
```json
{
  "content": [{"type": "text", "text": "Error: Division by zero"}],
  "isError": true
}
```

## Environment Variables

```bash
PORT=3001              # Server port
NODE_ENV=production    # Environment
```

## TypeScript Support

**Key Points:**
- Input schema is defined via `inputClass` in the decorator
- Output type is inferred from the return type
- For tools with no input, omit `inputClass`
- Use `@SchemaConstraint` for validation and documentation

```typescript
class MyInput {
  @SchemaConstraint({ description: 'Input field' })
  field!: string;
}

@Tool({ description: 'My tool', inputClass: MyInput })
async myTool(input: MyInput): Promise<{ result: string }> {
  return { result: input.field.toUpperCase() };
}
```

## Documentation

- [Full Documentation](https://docs.leanmcp.com/sdk/core)

## Related Packages

- [@leanmcp/cli](https://www.npmjs.com/package/@leanmcp/cli) — CLI tool for project creation
- [@leanmcp/auth](https://www.npmjs.com/package/@leanmcp/auth) — Authentication decorators
- [@leanmcp/ui](https://www.npmjs.com/package/@leanmcp/ui) — MCP App UI components
- [@leanmcp/elicitation](https://www.npmjs.com/package/@leanmcp/elicitation) — Structured user input

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [NPM Package](https://www.npmjs.com/package/@leanmcp/core)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

## License

MIT
