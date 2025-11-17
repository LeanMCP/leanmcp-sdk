# LeanMCP SDK

A TypeScript SDK for building **Model Context Protocol (MCP)** servers with type-safe decorators and streamable HTTP support.

## Features

- **Type-safe decorators** - Full TypeScript support with compile-time validation
- **Declarative schema definition** - Define JSON Schema using `@SchemaConstraint` decorators on class properties
- **Clean API** - Function names become tool/prompt/resource names automatically
- **MCP compliant** - Built on official @modelcontextprotocol/sdk
- **Streamable HTTP** - Production-ready HTTP server with session management
- **Authentication** - Built-in `@Authenticated` decorator with multi-provider support (AWS Cognito, more coming)
- **Quick start** - CLI tool for instant project scaffolding
- **Built-in validation** - Automatic input validation using defined schemas

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

### `leanmcp create <project-name>`

Creates a new MCP server project with standard structure.

```bash
leanmcp create my-mcp-server
```

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

Adds a new service to an existing project and automatically registers it in `main.ts`.

```bash
leanmcp add weather
```

**Creates:**
- `mcp/weather/index.ts` with boilerplate service code
- Auto-registers the service in `main.ts`

**Example generated service:**
```typescript
import { Tool, Resource, Prompt } from "@leanmcp/core";

export class WeatherService {
  @Tool({ description: 'Get weather information' })
  async getWeather(args: { city: string }) {
    return { city: args.city, temp: 72, conditions: 'sunny' };
  }

  @Prompt({ description: 'Weather query prompt' })
  weatherPrompt(args: { city?: string }) {
    return {
      messages: [{
        role: 'user',
        content: { type: 'text', text: `What's the weather in ${args.city || 'the city'}?` }
      }]
    };
  }

  @Resource({ description: 'Weather service status' })
  getStatus() {
    return { service: 'weather', status: 'active' };
  }
}
```

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

```typescript
import { createHTTPServer } from "@leanmcp/core";
import { ExampleService } from "./mcp/example/index.js";

const serverFactory = (server: any) => {
  server.registerService(new ExampleService());
};

createHTTPServer(serverFactory, {
  port: 8080,
  enableCors: true
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

### `createHTTPServer(serverFactory, options)`

Creates and starts an HTTP server with MCP support.

**Parameters:**
- `serverFactory`: `(server: MCPServer) => void` - Function to configure server and register services
- `options`: Server configuration options
  - `port?: number` - Port to listen on (default: 8080)
  - `enableCors?: boolean` - Enable CORS (default: false)

**Example:**
```typescript
import { createHTTPServer, MCPServer } from "@leanmcp/core";
import { MyService } from "./mcp/myservice/index.js";

const serverFactory = (server: MCPServer) => {
  server.registerService(new MyService());
};

createHTTPServer(serverFactory, {
  port: 3000,
  enableCors: true
});
```

### `MCPServer.registerService(instance)`

Registers a service instance with the MCP server.

**Parameters:**
- `instance`: Service class instance with decorated methods

**Example:**
```typescript
const server = new MCPServer();
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

## License

MIT

## Links

- [MCP Specification](https://modelcontextprotocol.io/)
- [GitHub Repository](https://github.com/leanmcp/leanmcp-sdk)

## Acknowledgments

- Built on top of [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Uses [reflect-metadata](https://www.npmjs.com/package/reflect-metadata) for decorator support
