<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.svg"
    alt="LeanMCP Logo"
    width="400"
  />
</p>

<p align="center">
  <strong>@leanmcp/cli</strong><br/>
  Command-line tool for creating, developing, and deploying LeanMCP projects.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/cli">
    <img src="https://img.shields.io/npm/v/@leanmcp/cli" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/cli">
    <img src="https://img.shields.io/npm/dm/@leanmcp/cli" alt="npm downloads" />
  </a>
  <a href="https://docs.leanmcp.com/sdk/cli">
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

- **Quick Scaffolding** — Create production-ready MCP servers in seconds
- **Hot Reload Development** — `leanmcp dev` with UI component hot-reload
- **Cloud Deployment** — Deploy to LeanMCP Cloud with custom subdomains
- **Project Management** — List, view, and delete cloud projects
- **Interactive Setup** — Guided prompts for dependencies and dev server

## Installation

```bash
npm install -g @leanmcp/cli
```

Or run without installing:
```bash
npx @leanmcp/cli create my-mcp-server
```

## Commands Overview

```bash
# Local development
leanmcp create <name>     # Create a new project
leanmcp add <service>     # Add a service to existing project
leanmcp dev               # Start development server with hot-reload
leanmcp build             # Build for production
leanmcp start             # Start production server

# Cloud commands
leanmcp login             # Authenticate with LeanMCP Cloud
leanmcp logout            # Remove API key
leanmcp whoami            # Show login status
leanmcp deploy <folder>   # Deploy to LeanMCP Cloud
leanmcp projects list     # List your cloud projects
leanmcp projects get <id> # Get project details
leanmcp projects delete <id>  # Delete a project
```

---

## Local Development

### create

Create a new MCP server project:

```bash
leanmcp create my-sentiment-tool
```

Interactive prompts will guide you through:
1. Creating the project structure
2. Installing dependencies (optional)
3. Starting the dev server (optional)

**Generated structure:**
```
my-mcp-server/
├── main.ts              # Entry point with HTTP server
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── mcp/                 # Services directory
    └── example/
        └── index.ts     # Example service with tools
```

### add

Add a new service to an existing project:

```bash
cd my-mcp-server
leanmcp add weather
```

This:
- Creates `mcp/weather/index.ts` with example Tool, Prompt, and Resource
- Automatically registers the service in `main.ts`
- Includes `@SchemaConstraint` validation examples

### dev

Start the development server with hot-reload:

```bash
leanmcp dev
```

This command:
- Scans for `@UIApp` components and builds them
- Starts the HTTP server with `tsx watch`
- Watches `mcp/` directory for changes
- Automatically rebuilds UI components when modified
- Hot-reloads when adding/removing `@UIApp` decorators

```bash
$ leanmcp dev

LeanMCP Development Server

ℹ Found 2 @UIApp component(s)
ℹ UI components built

Starting development server...

[HTTP][INFO] Server running on http://localhost:3001
[HTTP][INFO] MCP endpoint: http://localhost:3001/mcp
```

### build

Build the project for production:

```bash
leanmcp build
```

Compiles TypeScript and bundles UI components.

### start

Start the production server:

```bash
leanmcp start
```

Runs the compiled production build.

---

## Cloud Commands

### login

Authenticate with LeanMCP Cloud:

```bash
leanmcp login
```

Steps:
1. Go to [ship.leanmcp.com/api-keys](https://ship.leanmcp.com/api-keys)
2. Create an API key with "BUILD_AND_DEPLOY" scope
3. Enter the key when prompted

### logout

Remove your API key:

```bash
leanmcp logout
```

### whoami

Check your current login status:

```bash
leanmcp whoami
```

### deploy

Deploy your MCP server to LeanMCP Cloud:

```bash
leanmcp deploy .
# Or specify a folder
leanmcp deploy ./my-project
```

Deployment process:
1. Creates project (or updates existing)
2. Packages and uploads code
3. Builds container image
4. Deploys to serverless Lambda
5. Configures custom subdomain

```bash
$ leanmcp deploy .

LeanMCP Deploy

Generated project name: swift-coral-sunset
Path: /path/to/my-project

? Subdomain for your deployment: my-api
✔ Subdomain 'my-api' is available

? Proceed with deployment? Yes

✔ Project created: 7f4a3b2c...
✔ Project uploaded
✔ Build complete (45s)
✔ Deployed
✔ Subdomain configured

============================================================
  DEPLOYMENT SUCCESSFUL!
============================================================

  Your MCP server is now live:

  URL:  https://my-api.leanmcp.dev

  Test endpoints:
    curl https://my-api.leanmcp.dev/health
    curl https://my-api.leanmcp.dev/mcp
```

### projects

Manage your cloud projects:

```bash
# List all projects
leanmcp projects list

# Get project details
leanmcp projects get <project-id>

# Delete a project
leanmcp projects delete <project-id>
leanmcp projects delete <project-id> --force  # Skip confirmation
```

---

## NPM Scripts

Generated projects include:

```bash
npm run dev     # Start with hot reload (tsx watch)
npm run build   # Build for production
npm run start   # Run production build
npm run clean   # Remove build artifacts
```

## Configuration

### Port

```bash
PORT=4000 npm run dev
# Or in .env file
PORT=4000
```

### LeanMCP Config

Stored in `~/.leanmcp/config.json`:
```json
{
  "apiKey": "airtrain_...",
  "apiUrl": "https://api.leanmcp.com",
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### Port Already in Use

Change the port in `.env`:
```bash
PORT=3002
```

### Module Not Found Errors

Ensure dependencies are installed:
```bash
npm install
```

### TypeScript Decorator Errors

Ensure your `tsconfig.json` has:
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### Deploy: Not Logged In

Run `leanmcp login` first to authenticate with your API key.

### Deploy: Subdomain Taken

Choose a different subdomain when prompted.

## Requirements

- Node.js >= 18.0.0
- npm >= 9.0.0

## Documentation

- [Full Documentation](https://docs.leanmcp.com/sdk/cli)

## Related Packages

- [@leanmcp/core](https://www.npmjs.com/package/@leanmcp/core) — Core MCP server functionality
- [@leanmcp/auth](https://www.npmjs.com/package/@leanmcp/auth) — Authentication decorators
- [@leanmcp/ui](https://www.npmjs.com/package/@leanmcp/ui) — MCP App UI components

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [NPM Package](https://www.npmjs.com/package/@leanmcp/cli)
- [LeanMCP Dashboard](https://ship.leanmcp.com)

## License

MIT
