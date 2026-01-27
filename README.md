<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.svg"
    alt="LeanMCP Logo"
    width="500"
  />
</p>

<h1 align="center">Production-ready MCP server SDK for TypeScript</h1>

<p align="center">
  <strong>LeanMCP SDK: Efficient, modular TypeScript toolkit for production MCP servers</strong><br/>
  Built-in Auth, Multi-tenancy, Human-in-the-loop, and MCP-Apps. 
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/core">
    <img src="https://img.shields.io/npm/v/@leanmcp/core?style=flat-square&logo=npm&logoColor=white&label=Version&color=CB3837" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/cli">
    <img src="https://img.shields.io/npm/dm/@leanmcp/cli?style=flat-square&logo=npm&logoColor=white&label=Downloads&color=CB3837" alt="npm downloads" />
  </a>
  <a href="https://pypi.org/project/modelcontextprotocol/">
    <img src="https://img.shields.io/pypi/dm/modelcontextprotocol?style=flat-square&logo=python&logoColor=white&label=Python%20Downloads&color=3776ab" alt="PyPI downloads" />
  </a>
  <a href="https://github.com/LeanMCP/leanmcp-sdk/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg?style=flat-square&logo=opensourceinitiative&logoColor=white" alt="MIT License" />
  </a>
  <a href="https://www.typescriptlang.org/">
    <img src="https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript Ready" />
  </a>
  <br/>
  <a href="https://nodejs.org/">
    <img src="https://img.shields.io/badge/Node.js-18+-green?style=flat-square&logo=node.js&logoColor=white" alt="Node.js 18+" />
  </a>
  <a href="https://discord.com/invite/DsRcA3GwPy">
    <img src="https://img.shields.io/badge/Discord-406%20members-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord Community" />
  </a>
  <a href="https://leanmcp.com/">
    <img src="https://img.shields.io/badge/Website-leanmcp.com-0A66C2?style=flat-square&logo=googlechrome&logoColor=white" alt="Website" />
  </a>
  <a href="https://x.com/LeanMcp">
    <img src="https://img.shields.io/badge/Follow-@LeanMCP-1DA1F2?style=flat-square&logo=x&logoColor=white" alt="Follow on X" />
  </a>
</p>

## Quick Start

```bash
npx @leanmcp/cli create my-server
cd my-server
npm run dev
```

Your MCP server is now running with schema validation, resources, and prompt capabilities.

## Choose Your Path

<table>
<tr>
<td width="20%" align="center">

### Build a Secure MCP Server

Start with basic tools and add authentication

[Get Started →](#installation)

</td>
<td width="20%" align="center">

### Add Auth & Multi-tenancy

User-level API keys and permissions

[Learn More →](#authenticated-service-with-aws-cognito)

</td>
<td width="20%" align="center">

### Human-in-the-loop Tools

Collect user input during execution

[See Examples →](#core-concepts)

</td>
<td width="20%" align="center">

### MCP UI / Apps

Build ChatGPT Apps with UI components

[Build Apps →](#examples)

</td>
<td width="20%" align="center">

### Deploy to Production

HTTP transport, monitoring, observability

[Deploy Now →](#api-reference)

</td>
</tr>
</table>

## Why LeanMCP?

**Other MCP SDKs**: Just connect tools to AI agents - **LeanMCP**: Production features out of the box

| Feature | Basic MCP | LeanMCP | Time Saved |
|---------|-----------|---------|------------|
| Basic Tools | Yes | Yes | - |
| Authentication | No | Yes | 2-3 weeks |
| Payment Integration | No | Yes | 1-2 weeks |
| UI Components | No | Yes | 1-2 weeks |
| Production Deploy | No | Yes | 1 week |
| Monitoring & Logs | No | Yes | 1 week |

### Production-Ready Features
- **Authentication**: Auth0, Supabase, Cognito, Firebase out of the box
- **Multi-tenancy**: User-level API keys and permission management
- **Payment Integration**: Stripe integration, subscription checks, usage-based billing
- **Monitoring & Audit**: Logging, monitoring, production-grade observability

### Developer Experience
- **Decorator Pattern**: Type-safe decorators with auto-discovery
- **Convention over Configuration**: Sensible defaults
- **TypeScript First**: Complete type safety + schema validation
- **Hot Reload**: Automatic restart during development

### ChatGPT Apps Support
- **UI Components**: Render UI components inside ChatGPT, Claude
- **User Interaction**: Handle user input during tool execution
- **Real-time Updates**: Support for streaming responses and live data

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [CLI Commands](#cli-commands)
- [Decorators](#decorators)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Development](#development)
- [Contributing](#contributing)

## Installation

### Global CLI Installation

```bash
npm install -g @leanmcp/cli
```

### Project-Level Installation

```bash
npm install @leanmcp/core
npm install --save-dev @leanmcp/cli
```

## Quick Start

### 1. Create a new project

```bash
npx @leanmcp/cli create my-mcp-server
cd my-mcp-server
npm install
```

This generates a clean project structure:

```
my-mcp-server/
├── main.ts              # Entry point with HTTP server
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── mcp/                 # Services directory
    └── example/
        └── index.ts     # Example service
```

### 2. Define your service

The generated `mcp/example/index.ts` shows class-based schema validation:

```typescript
import { Tool, Optional, SchemaConstraint } from "@leanmcp/core";

// Define input schema as a TypeScript class
class AnalyzeSentimentInput {
  @SchemaConstraint({
    description: 'Text to analyze',
    minLength: 1
  })
  text!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Language code',
    enum: ['en', 'es', 'fr', 'de'],
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

  @SchemaConstraint({ minimum: 0, maximum: 1 })
  confidence!: number;
}

export class SentimentService {
  @Tool({ 
    description: 'Analyze sentiment of text',
    inputClass: AnalyzeSentimentInput
  })
  async analyzeSentiment(args: AnalyzeSentimentInput): Promise<AnalyzeSentimentOutput> {
    const sentiment = this.detectSentiment(args.text);
    
    return {
      sentiment: sentiment > 0 ? 'positive' : sentiment < 0 ? 'negative' : 'neutral',
      score: sentiment,
      confidence: Math.abs(sentiment)
    };
  }

  private detectSentiment(text: string): number {
    // Simple keyword-based sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate'];
    
    let score = 0;
    const words = text.toLowerCase().split(/\s+/);
    
    words.forEach(word => {
      if (positiveWords.includes(word)) score += 0.3;
      if (negativeWords.includes(word)) score -= 0.3;
    });
    
    return Math.max(-1, Math.min(1, score));
  }
}
```

### 3. Run your server

```bash
npm start
```

Your MCP server starts on `http://localhost:8080` with:
- HTTP endpoint: `http://localhost:8080/mcp`
- Health check: `http://localhost:8080/health`

## Core Concepts

### Tools

Callable functions that perform actions (like API endpoints).

```typescript
class AddInput {
  @SchemaConstraint({ description: 'First number' })
  a!: number;
  
  @SchemaConstraint({ description: 'Second number' })
  b!: number;
}

@Tool({ 
  description: 'Calculate sum of two numbers',
  inputClass: AddInput
})
async add(input: AddInput): Promise<{ result: number }> {
  return { result: input.a + input.b };
}
// Tool name: "add" (from function name)
```

### Prompts

Reusable prompt templates for LLM interactions.

```typescript
@Prompt({ description: 'Generate a greeting prompt' })
greetingPrompt(args: { name?: string }) {
  return {
    messages: [{
      role: 'user',
      content: { type: 'text', text: `Say hello to ${args.name || 'there'}!` }
    }]
  };
}
// Prompt name: "greetingPrompt" (from function name)
```

### Resources

Data endpoints that provide information (like REST GET endpoints).

```typescript
@Resource({ description: 'Service statistics' })
getStats() {
  return { 
    uptime: process.uptime(),
    requestCount: 1523
  };
}
// Resource URI: "servicename://getStats" (auto-generated)
```

## CLI Commands

The LeanMCP CLI provides an interactive experience for creating and managing MCP projects.

### `leanmcp create <project-name>`

Creates a new MCP server project with **interactive setup**:

```bash
leanmcp create my-mcp-server
```

**Interactive prompts:**
- Auto-install dependencies (optional)
- Start dev server after creation (optional)

**Generated structure:**
```
my-mcp-server/
├── main.ts              # Entry point with HTTP server
├── package.json         # Project dependencies
├── tsconfig.json        # TypeScript configuration
├── .gitignore           # Git ignore rules
├── .dockerignore        # Docker ignore rules
├── .env                 # Environment variables
├── .env.local           # Local overrides
└── mcp/                 # Services directory
    └── example/
        └── index.ts     # Example service
```

### `leanmcp add <service-name>`

Adds a new service to an existing project with auto-registration:

```bash
leanmcp add weather
```

**What it does:**
- Creates `mcp/weather/index.ts` with boilerplate (Tool, Prompt, Resource examples)
- Auto-registers the service in `main.ts`
- Ready to customize and use immediately

### More CLI Features

For complete CLI documentation including all commands, options, and advanced usage, see [@leanmcp/cli README](./packages/cli/README.md).

## Decorators

### Core Decorators

| Decorator | Purpose | Usage |
|-----------|---------|-------|
| `@Tool` | Callable function | `@Tool({ description?: string, inputClass?: Class })` |
| `@Prompt` | Prompt template | `@Prompt({ description?: string })` |
| `@Resource` | Data endpoint | `@Resource({ description?: string })` |

### Schema Decorators

| Decorator | Purpose | Usage |
|-----------|---------|-------|
| `@Optional` | Mark property as optional | Property decorator |
| `@SchemaConstraint` | Add validation rules | Property decorator with constraints |

**Available Constraints:**
- **String**: `minLength`, `maxLength`, `pattern`, `enum`, `format`, `description`, `default`
- **Number**: `minimum`, `maximum`, `description`, `default`
- **Array**: `minItems`, `maxItems`, `description`
- **Common**: `description`, `default`

**Example:**
```typescript
class UserInput {
  @SchemaConstraint({
    description: 'User email address',
    format: 'email'
  })
  email!: string;

  @Optional()
  @SchemaConstraint({
    description: 'User age',
    minimum: 18,
    maximum: 120
  })
  age?: number;

  @SchemaConstraint({
    description: 'User roles',
    enum: ['admin', 'user', 'guest'],
    default: 'user'
  })
  role!: string;
}
```

## Project Structure

### Main Entry Point (`main.ts`)

**Simplified API (Recommended):**
```typescript
import { createHTTPServer } from "@leanmcp/core";

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "my-mcp-server",
  version: "1.0.0",
  port: 8080,
  cors: true,
  logging: true
});
```

**Factory Pattern (Advanced):**
```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { ExampleService } from "./mcp/example/index.js";

const serverFactory = async () => {
  const server = new MCPServer({
    name: "my-mcp-server",
    version: "1.0.0",
    autoDiscover: false
  });
  
  server.registerService(new ExampleService());
  return server.getServer();
};

await createHTTPServer(serverFactory, {
  port: 8080,
  cors: true
});
```

### Service Structure (`mcp/service-name/index.ts`)

```typescript
import { Tool, Prompt, Resource } from "@leanmcp/core";

class ToolInput {
  @SchemaConstraint({ description: 'Input parameter' })
  param!: string;
}

export class ServiceName {
  @Tool({ 
    description: 'Tool description',
    inputClass: ToolInput
  })
  async toolMethod(args: ToolInput) {
    // Tool implementation
    return { result: 'success' };
  }

  @Prompt({ description: 'Prompt description' })
  promptMethod(args: { param?: string }) {
    // Prompt implementation
    return {
      messages: [{
        role: 'user',
        content: { type: 'text', text: 'Prompt text' }
      }]
    };
  }

  @Resource({ description: 'Resource description' })
  resourceMethod() {
    // Resource implementation
    return { data: 'value' };
  }
}
```

## API Reference

### `createHTTPServer(options | serverFactory, options?)`

Creates and starts an HTTP server with MCP support.

**Simplified API (Recommended):**
```typescript
await createHTTPServer({
  name: string;              // Server name (required)
  version: string;           // Server version (required)
  port?: number;             // Port number (default: 3001)
  cors?: boolean | object;   // Enable CORS (default: false)
  logging?: boolean;         // Enable logging (default: false)
  debug?: boolean;           // Enable debug logs (default: false)
  autoDiscover?: boolean;    // Auto-discover services (default: true)
  mcpDir?: string;           // Custom mcp directory path (optional)
  sessionTimeout?: number;   // Session timeout in ms (optional)
});
```

**Example:**
```typescript
import { createHTTPServer } from "@leanmcp/core";

// Services automatically discovered from ./mcp directory
await createHTTPServer({
  name: "my-mcp-server",
  version: "1.0.0",
  port: 3000,
  cors: true,
  logging: true
});
```

**Factory Pattern (Advanced):**
```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { MyService } from "./mcp/myservice/index.js";

const serverFactory = async () => {
  const server = new MCPServer({
    name: "my-mcp-server",
    version: "1.0.0",
    autoDiscover: false
  });
  
  server.registerService(new MyService());
  return server.getServer();
};

await createHTTPServer(serverFactory, {
  port: 3000,
  cors: true
});
```

### `MCPServer`

Main server class for manual service registration.

**Constructor Options:**
```typescript
const server = new MCPServer({
  name: string;              // Server name (required)
  version: string;           // Server version (required)
  logging?: boolean;         // Enable logging (default: false)
  debug?: boolean;           // Enable debug logs (default: false)
  autoDiscover?: boolean;    // Auto-discover services (default: true)
  mcpDir?: string;           // Custom mcp directory path (optional)
});
```

**Methods:**
- `registerService(instance)` - Manually register a service instance
- `getServer()` - Get the underlying MCP SDK server

**Example:**
```typescript
import { MCPServer } from "@leanmcp/core";

const server = new MCPServer({
  name: "my-server",
  version: "1.0.0",
  autoDiscover: false
});

server.registerService(new WeatherService());
server.registerService(new PaymentService());
```

## Examples

### Complete Weather Service

```typescript
import { Tool, Prompt, Resource, SchemaConstraint, Optional } from "@leanmcp/core";

class WeatherInput {
  @SchemaConstraint({
    description: 'City name',
    minLength: 1
  })
  city!: string;

  @Optional()
  @SchemaConstraint({
    description: 'Units',
    enum: ['metric', 'imperial'],
    default: 'metric'
  })
  units?: string;
}

class WeatherOutput {
  @SchemaConstraint({ description: 'Temperature value' })
  temperature!: number;

  @SchemaConstraint({ 
    description: 'Weather conditions',
    enum: ['sunny', 'cloudy', 'rainy', 'snowy']
  })
  conditions!: string;

  @SchemaConstraint({ 
    description: 'Humidity percentage',
    minimum: 0,
    maximum: 100
  })
  humidity!: number;
}

export class WeatherService {
  @Tool({ 
    description: 'Get current weather for a city',
    inputClass: WeatherInput
  })
  async getCurrentWeather(args: WeatherInput): Promise<WeatherOutput> {
    // Simulate API call
    return {
      temperature: 72,
      conditions: 'sunny',
      humidity: 65
    };
  }

  @Prompt({ description: 'Generate weather query prompt' })
  weatherPrompt(args: { city?: string }) {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `What's the weather forecast for ${args.city || 'the city'}?`
        }
      }]
    };
  }

  @Resource({ description: 'Supported cities list' })
  getSupportedCities() {
    return {
      cities: ['New York', 'London', 'Tokyo', 'Paris', 'Sydney'],
      count: 5
    };
  }
}
```

### Calculator Service with Validation

```typescript
import { Tool, SchemaConstraint } from "@leanmcp/core";

class CalculatorInput {
  @SchemaConstraint({
    description: 'First number',
    minimum: -1000000,
    maximum: 1000000
  })
  a!: number;

  @SchemaConstraint({
    description: 'Second number',
    minimum: -1000000,
    maximum: 1000000
  })
  b!: number;
}

class CalculatorOutput {
  @SchemaConstraint({ description: 'Calculation result' })
  result!: number;
}

export class CalculatorService {
  @Tool({ 
    description: 'Add two numbers',
    inputClass: CalculatorInput
  })
  async add(args: CalculatorInput): Promise<CalculatorOutput> {
    return { result: args.a + args.b };
  }

  @Tool({ 
    description: 'Subtract two numbers',
    inputClass: CalculatorInput
  })
  async subtract(args: CalculatorInput): Promise<CalculatorOutput> {
    return { result: args.a - args.b };
  }

  @Tool({ 
    description: 'Multiply two numbers',
    inputClass: CalculatorInput
  })
  async multiply(args: CalculatorInput): Promise<CalculatorOutput> {
    return { result: args.a * args.b };
  }

  @Tool({ 
    description: 'Divide two numbers',
    inputClass: CalculatorInput
  })
  async divide(args: CalculatorInput): Promise<CalculatorOutput> {
    if (args.b === 0) {
      throw new Error('Division by zero');
    }
    return { result: args.a / args.b };
  }
}
```

### Authenticated Service with AWS Cognito

```typescript
import { Tool, SchemaConstraint } from "@leanmcp/core";
import { AuthProvider, Authenticated } from "@leanmcp/auth";

// Initialize auth provider
const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION,
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID
});
await authProvider.init();

// Input class - no token field needed
class SendMessageInput {
  @SchemaConstraint({
    description: 'Channel to send message to',
    minLength: 1
  })
  channel!: string;

  @SchemaConstraint({
    description: 'Message text',
    minLength: 1
  })
  text!: string;
}

// Protect entire service with authentication
@Authenticated(authProvider)
export class SlackService {
  @Tool({ 
    description: 'Send message to Slack channel',
    inputClass: SendMessageInput
  })
  async sendMessage(args: SendMessageInput) {
    // Token automatically validated from _meta.authorization.token
    // Only business arguments are passed here
    return {
      success: true,
      channel: args.channel,
      timestamp: Date.now().toString()
    };
  }
}
```

**Client Usage:**
```typescript
// Call with authentication
await mcpClient.callTool({
  name: "sendMessage",
  arguments: {
    channel: "#general",
    text: "Hello world"
  },
  _meta: {
    authorization: {
      type: "bearer",
      token: "your-jwt-token"
    }
  }
});
```

See [examples/slack-with-auth](./examples/slack-with-auth) for a complete working example.

## Development

### Setting Up the Monorepo

```bash
# Clone the repository
git clone https://github.com/leanmcp/leanmcp-sdk.git
cd leanmcp-sdk

# Install dependencies
npm install

# Build all packages
npm run build
```

### Monorepo Structure

```
leanmcp-sdk/
├── package.json              # Root workspace config
├── tsconfig.base.json        # Shared TypeScript config
├── turbo.json               # Turborepo configuration
└── packages/
    ├── cli/                 # @leanmcp/cli - CLI binary
    ├── core/                # @leanmcp/core - Core decorators & runtime
    ├── auth/                # @leanmcp/auth - Authentication with @Authenticated decorator
    └── utils/               # @leanmcp/utils - Utilities (planned)
```

### Building Individual Packages

```bash
# Build core package
cd packages/core
npm run build

# Build CLI package
cd packages/cli
npm run build
```

### Testing Your Changes

```bash
# Create a test project
npx @leanmcp/cli create test-project
cd test-project

# Link local development version
npm link ../../packages/core
npm link ../../packages/cli

# Run the test project
npm start
```

## Type Safety Benefits

- **Compile-time validation** - Catch errors before runtime
- **Autocomplete** - Full IntelliSense support in VS Code
- **Refactoring** - Safe renames and changes across your codebase
- **No duplication** - Define schemas once using TypeScript types
- **Type inference** - Automatic schema generation from decorators

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build all packages
npm run build
```

---

## We Actively Welcome Contributors

<div align="center">

### If LeanMCP is useful to you, please give us a star!

<p>
  <a href="https://github.com/LeanMCP/leanmcp-sdk/stargazers">
    <img src="https://img.shields.io/github/stars/LeanMCP/leanmcp-sdk?style=social" alt="GitHub stars" />
  </a>
  <a href="https://github.com/LeanMCP/leanmcp-sdk/network/members">
    <img src="https://img.shields.io/github/forks/LeanMCP/leanmcp-sdk?style=social" alt="GitHub forks" />
  </a>
</p>

</div>

### Contributing is Easy

**New to open source?** Perfect! We have plenty of [good first issues](https://github.com/LeanMCP/leanmcp-sdk/labels/good%20first%20issue) waiting for you.

<table>
<tr>
<td align="center" width="33%">

**Fork & Contribute**

1. Fork the repo
2. Create a branch
3. Make changes
4. Submit PR

[Fork Now →](https://github.com/LeanMCP/leanmcp-sdk/fork)

</td>
<td align="center" width="33%">

**Good First Issues**

- 📖 Documentation improvements
- 🔧 Example additions
- 🔐 Auth provider integrations
- 🧪 Test coverage

[Browse Issues →](https://github.com/LeanMCP/leanmcp-sdk/labels/good%20first%20issue)

</td>
<td align="center" width="33%">

**Join Community**

Chat with maintainers and contributors

[Join Discord →](https://discord.com/invite/DsRcA3GwPy)

</td>
</tr>
</table>

### What You Can Contribute

- **Documentation**: Help make our guides clearer
- **Examples**: Add new service examples (weather, payments, etc.)
- **Auth Integrations**: Add support for new auth providers
- **Bug Fixes**: Fix reported issues
- **Tests**: Improve test coverage
- **Features**: Propose and implement new capabilities

See our [Contributing Guide](CONTRIBUTING.md) for detailed instructions.

---

## License

MIT License - see [LICENSE](LICENSE) file for details

## Links

- [MCP Specification](https://modelcontextprotocol.io/)
- [GitHub Repository](https://github.com/leanmcp/leanmcp-sdk)
- [Official Website](https://leanmcp.com/)
- [Discord Community](https://discord.com/invite/DsRcA3GwPy)

## Acknowledgments

- Built on top of [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Uses [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) for decorator support
- Inspired by the amazing MCP community
