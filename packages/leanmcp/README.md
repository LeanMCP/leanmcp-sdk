# LeanMCP SDK

A TypeScript SDK for building **Model Context Protocol (MCP)** servers with type-safe decorators and streamable HTTP support.

## Installation

```bash
npm install leanmcp
```

This meta-package includes all LeanMCP packages:
- `@leanmcp/core` - Core decorators, server, and runtime
- `@leanmcp/auth` - Authentication and authorization
- `@leanmcp/ui` - React UI components for MCP Apps
- `@leanmcp/utils` - Utility functions
- `@leanmcp/elicitation` - Interactive prompts and forms
- `@leanmcp/env-injection` - Environment variable management

## Quick Start

### 1. Create a new project

```bash
npx @leanmcp/cli create my-mcp-server
cd my-mcp-server
npm install
```

### 2. Define your service

```typescript
import { Tool, SchemaConstraint } from 'leanmcp';

class GreetInput {
  @SchemaConstraint({
    description: 'Name to greet',
    minLength: 1
  })
  name!: string;
}

export class GreetingService {
  @Tool({ 
    description: 'Greet someone',
    inputClass: GreetInput
  })
  async greet(args: GreetInput) {
    return { message: `Hello, ${args.name}!` };
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

## Features

- **Type-safe decorators** - Full TypeScript support with compile-time validation
- **Declarative schema definition** - Define JSON Schema using `@SchemaConstraint` decorators
- **Clean API** - Function names become tool/prompt/resource names automatically
- **MCP compliant** - Built on official @modelcontextprotocol/sdk
- **Streamable HTTP** - Production-ready HTTP server with session management
- **Authentication** - Built-in `@Authenticated` decorator with multi-provider support
- **Interactive CLI** - Guided project setup with dependency installation
- **React UI Components** - Build interactive MCP apps with pre-built components
- **Built-in validation** - Automatic input validation using defined schemas

## Usage Examples

### Core Server

```typescript
import { createHTTPServer, Tool } from 'leanmcp';

// Services are automatically discovered from ./mcp directory
await createHTTPServer({
  name: "my-mcp-server",
  version: "1.0.0",
  port: 8080,
  cors: true,
  logging: true
});
```

### Authentication

```typescript
import { Tool, AuthProvider, Authenticated } from 'leanmcp';

const authProvider = new AuthProvider('cognito', {
  region: process.env.AWS_REGION,
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID
});
await authProvider.init();

@Authenticated(authProvider)
export class SecureService {
  @Tool({ description: 'Protected endpoint' })
  async protectedMethod(args: any) {
    return { success: true };
  }
}
```

### React UI Components

```typescript
import { AppProvider, AppShell, HTTPTransport } from 'leanmcp/ui';
import 'leanmcp/ui/styles.css';

function App() {
  const transport = new HTTPTransport('http://localhost:8080/mcp');
  
  return (
    <AppProvider transport={transport}>
      <AppShell />
    </AppProvider>
  );
}
```

## Package Exports

### Main Export

```typescript
import { createHTTPServer, Tool, Prompt, Resource } from 'leanmcp';
```

### UI Components

```typescript
import { AppProvider, AppShell } from 'leanmcp/ui';
import 'leanmcp/ui/styles.css';
```

### Individual Packages

You can also install individual packages if you only need specific functionality:

```bash
npm install @leanmcp/core        # Core decorators and server
npm install @leanmcp/auth        # Authentication
npm install @leanmcp/ui          # React UI components
npm install @leanmcp/cli         # CLI tools
```

## Documentation

For complete documentation, examples, and API reference, visit:
- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Full Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)

## CLI Commands

### Create a new project

```bash
npx @leanmcp/cli create my-mcp-server
```

### Add a service to existing project

```bash
npx @leanmcp/cli add weather
```

## License

MIT

## Links

- [MCP Specification](https://modelcontextprotocol.io/)
- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Issues](https://github.com/LeanMCP/leanmcp-sdk/issues)
