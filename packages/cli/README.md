# @leanmcp/cli

Command-line tool for creating LeanMCP projects with production-ready templates.

## Features

- **Interactive setup** - Guided prompts for dependency installation and dev server
- **Quick project scaffolding** - Create new MCP servers in seconds
- **Complete setup** - Includes TypeScript, dependencies, and configuration
- **Best practices** - Generated projects follow MCP standards
- **Ready to run** - Start developing immediately with hot reload
- **Example service** - Includes working examples to get started
- **Pure ESM** - Modern ES modules with full TypeScript support

## Installation

```bash
# npm 
npm install -g @leanmcp/cli

# GitHub Packages 
npm install -g @leanmcp/cli --registry=https://npm.pkg.github.com
```

Or use without installing:
```bash
npx @leanmcp/cli create my-mcp-server
```

## Usage

### Create a New Project

```bash
leanmcp create <project-name>
```

Or with npx:
```bash
npx @leanmcp/cli create my-mcp-server
```

### Example

```bash
$ leanmcp create my-sentiment-tool
✔ Project my-sentiment-tool created!

Success! Your MCP server is ready.

Next, navigate to your project:
  cd my-sentiment-tool

? Would you like to install dependencies now? (Y/n) Yes
✔ Dependencies installed successfully!
? Would you like to start the development server? (Y/n) Yes

Starting development server...

> my-sentiment-tool@1.0.0 dev
> tsx watch main.ts

[HTTP][INFO] Starting LeanMCP HTTP Server...
[HTTP][INFO] Server running on http://localhost:3001
[HTTP][INFO] MCP endpoint: http://localhost:3001/mcp
```

### Add a New Service

After creating a project, you can quickly add new services:

```bash
leanmcp add <service-name>
```

This command:
- Creates a new service file in `mcp/<service-name>.ts`
- Includes example Tool, Prompt, and Resource decorators
- Automatically registers the service in `main.ts`
- Includes schema validation examples

**Example:**

```bash
$ leanmcp add weather
✔ Created new service: weather
   File: mcp/weather.ts
   Tool: greet
   Prompt: welcomePrompt
   Resource: getStatus

Service automatically registered in main.ts!
```

The generated service includes:
- **Tool** - `greet()`: A callable function with schema validation
- **Prompt** - `welcomePrompt()`: A reusable prompt template
- **Resource** - `getStatus()`: A data endpoint

You can then customize these to fit your needs.

## Generated Project Structure

```
my-mcp-server/
├── main.ts              # Entry point with HTTP server
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── mcp/                 # Services directory
    └── example.ts       # Example service with tools
```

## Generated Files

### main.ts
Entry point that:
- Loads environment variables
- Creates MCP server instance
- Registers services
- Starts HTTP server with session management

### mcp/example.ts
Example service demonstrating:
- `@Tool` decorator for callable functions
- `@Resource` decorator for data sources
- `@Prompt` decorator for prompt templates
- Class-based schema validation with `@SchemaConstraint`
- Input/output type safety

### package.json
Includes:
- `@leanmcp/core` - Core MCP functionality
- `@modelcontextprotocol/sdk` - Official MCP SDK
- `express` - HTTP server
- `tsx` - TypeScript execution with hot reload
- All type definitions

### tsconfig.json
Configured with:
- ESNext modules
- Decorator support
- Strict type checking
- Source maps

## NPM Scripts

Generated projects include:

```bash
npm run dev     # Start with hot reload (tsx watch)
npm run build   # Build for production
npm run start   # Run production build
npm run clean   # Remove build artifacts
```

## Development Workflow

### Interactive Setup (Recommended)

The CLI provides an interactive setup experience:

```bash
# Create project
leanmcp create my-mcp-server

# The CLI will:
# 1. Create project structure
# 2. Ask if you want to install dependencies (Y/n)
# 3. If yes, ask if you want to start dev server (Y/n)
# 4. If yes, start server with hot reload

# If you choose "No" to installation:
cd my-mcp-server
npm install
npm run dev
```

### Manual Setup

If you prefer manual control:

```bash
# 1. Create project (answer "No" to prompts)
leanmcp create my-mcp-server

# 2. Navigate to project
cd my-mcp-server

# 3. Install dependencies
npm install

# 4. Start development server
npm run dev

# 5. Server starts on http://localhost:3001
# - Endpoint: http://localhost:3001/mcp
# - Health check: http://localhost:3001/health
# - Hot reload enabled

# 6. Edit files in mcp/ directory
# Server automatically reloads on changes
```

## Testing Your Server

Test with curl:
```bash
# List available tools
curl http://localhost:3001/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'

# Call a tool
curl http://localhost:3001/mcp \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "calculate",
      "arguments": {
        "a": 10,
        "b": 5,
        "operation": "add"
      }
    }
  }'
```

## Customizing Generated Projects

### Add New Services

**Quick Way (Recommended):**

Use the `add` command to automatically generate and register a new service:

```bash
leanmcp add weather
```

This creates `mcp/weather.ts` with example Tool, Prompt, and Resource decorators, and automatically registers it in `main.ts`.

**Manual Way:**

Create a new file in `mcp/`:

```typescript
// mcp/weather.ts
import { Tool } from "@leanmcp/core";

export class WeatherService {
  @Tool({ description: 'Get weather for a city' })
  async getWeather(input: { city: string }) {
    // Your implementation
    return { temperature: 72, condition: 'sunny' };
  }
}
```

Register in `main.ts`:
```typescript
import { WeatherService } from "./mcp/weather.js";

server.registerService(new WeatherService());
```

### Add Authentication

Install auth package:
```bash
npm install @leanmcp/auth
```

See [@leanmcp/auth](../auth) documentation for details.

### Configure Port

Set in environment variable:
```bash
PORT=4000 npm run dev
```

Or in `.env` file:
```bash
PORT=4000
```

## Advanced Options

### Custom Project Location

```bash
leanmcp create my-project
cd my-project
```

Project is created in current directory with the specified name.

### Modify Template

The generated project is fully customizable:
- Edit `main.ts` for server configuration
- Add/remove services in `mcp/` directory
- Modify `package.json` for additional dependencies
- Update `tsconfig.json` for compiler options

## Troubleshooting

### Port Already in Use

Change the port in `.env`:
```bash
PORT=3002
```

### Module Not Found Errors

Ensure you've installed dependencies:
```bash
npm install
```

### TypeScript Errors

Check your `tsconfig.json` and ensure:
- `experimentalDecorators: true`
- `emitDecoratorMetadata: true`

### Hot Reload Not Working

Try restarting the dev server:
```bash
npm run dev
```

## Project Types

Currently supports:
- **MCP Server** - Standard MCP server with HTTP transport

Coming soon:
- MCP Server with Auth
- MCP Server with Database
- MCP Server with File Storage

## Examples

See the [examples](../../examples) directory for complete working examples:
- [basic-sentiment-tool](../../examples/basic-sentiment-tool) - Simple sentiment analysis
- [slack-with-auth](../../examples/slack-with-auth) - Slack integration with Cognito auth

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## CLI Commands

```bash
leanmcp create <name>      # Create new project
leanmcp add <service>      # Add new service to existing project
leanmcp --version          # Show version
leanmcp --help             # Show help
```

### Command Details

#### `create <project-name>`
Creates a complete MCP server project with:
- Entry point (`main.ts`)
- Example service with Tool, Resource, and Prompt decorators
- TypeScript configuration
- Package.json with all dependencies
- Development and build scripts

**Interactive Prompts:**
- Asks if you want to install dependencies
- If installed, asks if you want to start dev server
- Runs commands in the project directory automatically

#### `add <service-name>`
Adds a new service to an existing project:
- Must be run inside a LeanMCP project directory
- Creates `mcp/<service-name>.ts` with template code
- Automatically imports and registers in `main.ts`
- Includes example Tool, Prompt, and Resource implementations
- Uses schema validation with `@SchemaConstraint` decorators

## 🌟 Showcase Your MCP Server

Built something cool with LeanMCP? We'd love to feature it!

### How to Get Featured

1. **Build** an awesome MCP server using LeanMCP
2. **Share** your project on GitHub
3. **Submit** for showcase:
   - Open an issue: [Request Showcase](https://github.com/LeanMCP/leanmcp-sdk/issues/new?title=[Showcase]%20Your%20Project%20Name)
   - Include:
     - Project name and description
     - GitHub repository link
     - What makes it unique
     - Screenshots or demo 


## License

MIT

## Related Packages

- [@leanmcp/core](../core) - Core MCP server functionality
- [@leanmcp/auth](../auth) - Authentication decorators
- [@leanmcp/utils](../utils) - Utility functions

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
