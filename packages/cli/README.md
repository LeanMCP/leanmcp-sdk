# @leanmcp/cli

<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.png"
    alt="LeanMCP Logo"
    width="400"
  />
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
    <img src="https://dcbadge.limes.pink/api/server/DsRcA3GwPy?style=flat" alt="Discord" />
  </a>
  <a href="https://x.com/LeanMcp">
    <img src="https://img.shields.io/badge/@LeanMCP-f5f5f5?logo=x&logoColor=000000" />
  </a>
  <a href="https://leanmcp.com/">
    <img src="https://img.shields.io/badge/Website-leanmcp-0A66C2?" />
  </a>
  <a href="https://deepwiki.com/LeanMCP/leanmcp-sdk"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

```json
{
  "package": "@leanmcp/cli",
  "purpose": "Command-line interface for scaffolding LeanMCP projects",
  "useCases": [
    "Project scaffolding",
    "Local development with hot-reload",
    "Cloud deployment",
    "Project management"
  ],
  "dependencies": ["@inquirer/prompts", "commander", "chalk", "vite", "archiver", "fs-extra"],
  "bin": {
    "leanmcp": "bin/leanmcp.js"
  },
  "main": "dist/index.js",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

## Overview

- **What it is**: Command-line interface for scaffolding LeanMCP projects with hot-reload development and cloud deployment
- **Purpose**: Streamlines the entire MCP server development workflow from project creation to production deployment
- **Key benefits**:
  - Quick project scaffolding with production-ready templates
  - Hot-reload development server with UI component building
  - One-command cloud deployment to LeanMCP platform
  - Interactive setup with guided prompts
  - Project management and monitoring tools

## When to Use It

**Use `@leanmcp/cli` when:**

- Starting any new MCP server project (highly recommended)
- Need local development with hot-reload and UI building
- Want to deploy to LeanMCP Cloud with custom subdomains
- Managing multiple MCP projects
- Need guided setup for dependencies and configuration

**You probably do NOT need this if:**

- Using custom build systems or deployment pipelines
- Only working with existing projects without scaffolding needs
- Building MCP clients (not servers)
- Working in environments where global CLI tools aren't allowed

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

**Requirements:**

- Node.js >= 18.0.0
- npm >= 9.0.0

## Usage / Examples

### Commands Overview

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
leanmcp send-feedback [msg]   # Send feedback or bug reports
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

### send-feedback

Send feedback, bug reports, or feature requests to the LeanMCP team:

```bash
leanmcp send-feedback "I love this tool!"
```

**Options:**

- `--anon`: Send anonymously
- `--include-logs`: Attach local logs for debugging

```bash
# Interactive mode (multiline)
leanmcp send-feedback

# With logs (great for bug reports)
leanmcp send-feedback "Deploy failed" --include-logs
```

---

## API Reference

### Command Reference

| Command                | Description                              | Usage                          |
| ---------------------- | ---------------------------------------- | ------------------------------ |
| `create <name>`        | Create new MCP server project            | `leanmcp create my-server`     |
| `add <service>`        | Add service to existing project          | `leanmcp add weather`          |
| `dev`                  | Start development server with hot-reload | `leanmcp dev`                  |
| `build`                | Build for production                     | `leanmcp build`                |
| `start`                | Start production server                  | `leanmcp start`                |
| `login`                | Authenticate with LeanMCP Cloud          | `leanmcp login`                |
| `logout`               | Remove API key                           | `leanmcp logout`               |
| `whoami`               | Show login status                        | `leanmcp whoami`               |
| `deploy [folder]`      | Deploy to LeanMCP Cloud                  | `leanmcp deploy .`             |
| `projects list`        | List cloud projects                      | `leanmcp projects list`        |
| `projects get <id>`    | Get project details                      | `leanmcp projects get <id>`    |
| `projects delete <id>` | Delete project                           | `leanmcp projects delete <id>` |
| `send-feedback [msg]`  | Send feedback to the team                | `leanmcp send-feedback`        |
| `env list [folder]`    | List environment variables               | `leanmcp env list`             |
| `env set <keyValue>`   | Set environment variable                 | `leanmcp env set KEY=VALUE`    |
| `env get <key>`        | Get environment variable value           | `leanmcp env get KEY`          |
| `env remove <key>`     | Remove environment variable              | `leanmcp env remove KEY`       |
| `env pull [folder]`    | Download env vars to local file          | `leanmcp env pull`             |
| `env push [folder]`    | Upload env vars from local file          | `leanmcp env push`             |

---

## Integration with Other LeanMCP Packages

**@leanmcp/cli** works seamlessly with all LeanMCP packages:

- **[@leanmcp/core](https://www.npmjs.com/package/@leanmcp/core)** — Generated projects use `@leanmcp/core` as the foundation
- **[@leanmcp/auth](https://www.npmjs.com/package/@leanmcp/auth)** — CLI can scaffold projects with authentication setup
- **[@leanmcp/ui](https://www.npmjs.com/package/@leanmcp/ui)** — `leanmcp dev` automatically builds UI components with hot-reload
- **[@leanmcp/elicitation](https://www.npmjs.com/package/@leanmcp/elicitation)** — Generated services include elicitation examples
- **[@leanmcp/env-injection](https://www.npmjs.com/package/@leanmcp/env-injection)** — Deploy command handles user secrets configuration

**Generated project structure:**

```
my-mcp-server/
├── main.ts              # Entry point with HTTP server
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── mcp/                 # Services directory (auto-discovered)
    └── example/
        └── index.ts     # Example service with @Tool, @Prompt, @Resource
```

---

## Best Practices / Troubleshooting

### NPM Scripts

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

---

## Links

- **Documentation**: [https://docs.leanmcp.com/sdk/cli](https://docs.leanmcp.com/sdk/cli)
- **GitHub**: [https://github.com/LeanMCP/leanmcp-sdk/tree/main/packages/cli](https://github.com/LeanMCP/leanmcp-sdk/tree/main/packages/cli)
- **npm**: [https://www.npmjs.com/package/@leanmcp/cli](https://www.npmjs.com/package/@leanmcp/cli)
- **LeanMCP Dashboard**: [https://ship.leanmcp.com](https://ship.leanmcp.com)
- **License**: MIT
