<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.png"
    alt="LeanMCP Logo"
    width="400"
  />
</p>

<p align="center">
  <strong>@leanmcp/env-injection</strong><br/>
  Request-scoped environment variable injection for LeanMCP tools.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/env-injection">
    <img src="https://img.shields.io/npm/v/@leanmcp/env-injection" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/env-injection">
    <img src="https://img.shields.io/npm/dm/@leanmcp/env-injection" alt="npm downloads" />
  </a>
  <a href="https://docs.leanmcp.com/sdk/env-injection">
    <img src="https://img.shields.io/badge/Docs-leanmcp-0A66C2?" />
  </a>
  <a href="https://discord.com/invite/DsRcA3GwPy">
    <img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://x.com/LeanMcp">
    <img src="https://img.shields.io/badge/@LeanMCP-f5f5f5?logo=x&logoColor=000000" />
  </a>
  <a href="https://leanmcp.com/">
    <img src="https://img.shields.io/badge/Website-leanmcp-0A66C2?" />
  </a>
  <a href="https://deepwiki.com/LeanMCP/leanmcp-sdk"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

## Features

- **Request-scoped isolation** — Each user's secrets are isolated using `AsyncLocalStorage`
- **@RequireEnv decorator** — Validate required env vars exist before method execution
- **getEnv() / getAllEnv()** — Access user-specific secrets in your tool code
- **Type-safe** — Full TypeScript support
- **Works with @leanmcp/auth** — Integrates with `@Authenticated` decorator

## Installation

```bash
npm install @leanmcp/env-injection @leanmcp/auth @leanmcp/core
```

## Quick Start

### 1. Configure Auth Provider with projectId

```typescript
import { AuthProvider } from '@leanmcp/auth';

export const projectId = process.env.LEANMCP_PROJECT_ID;

export const authProvider = new AuthProvider('leanmcp', {
  apiKey: process.env.LEANMCP_API_KEY,
  orchestrationApiUrl: 'https://api.leanmcp.com',
  authUrl: 'https://auth.leanmcp.com',
});

await authProvider.init();
```

### 2. Use @RequireEnv and getEnv()

```typescript
import { Tool } from '@leanmcp/core';
import { Authenticated } from '@leanmcp/auth';
import { RequireEnv, getEnv } from '@leanmcp/env-injection';
import { authProvider, projectId } from './config.js';

@Authenticated(authProvider, { projectId })
export class SlackService {
  @Tool({ description: 'Send a message to Slack' })
  @RequireEnv(['SLACK_TOKEN', 'SLACK_CHANNEL'])
  async sendMessage(args: { message: string }) {
    // getEnv() returns THIS USER's secret, not a global env var
    const token = getEnv('SLACK_TOKEN')!;
    const channel = getEnv('SLACK_CHANNEL')!;

    // Send message using user's own Slack token
    await slackApi.postMessage(channel, args.message, token);

    return { success: true, channel };
  }
}
```

## API Reference

### runWithEnv(env, fn)

Run a function with environment variables in scope. Used internally by `@Authenticated`.

```typescript
import { runWithEnv } from '@leanmcp/env-injection';

await runWithEnv({ API_KEY: 'secret123' }, async () => {
  console.log(getEnv('API_KEY')); // "secret123"
});
```

### getEnv(key)

Get a single environment variable from the current request context.

```typescript
import { getEnv } from '@leanmcp/env-injection';

const token = getEnv('SLACK_TOKEN');
// Returns undefined if key doesn't exist
// Throws if called outside env context (projectId not configured)
```

### getAllEnv()

Get all environment variables from the current request context.

```typescript
import { getAllEnv } from '@leanmcp/env-injection';

const env = getAllEnv();
// { SLACK_TOKEN: "xoxb-...", SLACK_CHANNEL: "#general" }
```

### hasEnvContext()

Check if currently inside an env context.

```typescript
import { hasEnvContext } from '@leanmcp/env-injection';

if (hasEnvContext()) {
  // Safe to call getEnv()
}
```

### @RequireEnv(keys)

Decorator to validate required environment variables exist before method execution.

```typescript
import { RequireEnv } from "@leanmcp/env-injection";

@RequireEnv(["SLACK_TOKEN", "SLACK_CHANNEL"])
async sendMessage(args: { message: string }) {
    // Method only executes if BOTH keys exist
    // Otherwise throws: "Missing required environment variables: SLACK_TOKEN, SLACK_CHANNEL"
}
```

**Requirements:**

- Must be used with `@Authenticated(authProvider, { projectId })`
- Throws clear error if `projectId` is not configured

## Error Messages

### Missing projectId Configuration

```
Environment injection not configured for SlackService.sendMessage().
To use @RequireEnv, you must configure 'projectId' in your @Authenticated decorator:
@Authenticated(authProvider, { projectId: 'your-project-id' })
```

### Missing Required Variables

```
Missing required environment variables: SLACK_TOKEN, SLACK_CHANNEL.
Please configure these secrets in your LeanMCP dashboard for this project.
```

### Called Outside Context

```
getEnv("SLACK_TOKEN") called outside of env context.
To use getEnv(), you must configure 'projectId' in your @Authenticated decorator:
@Authenticated(authProvider, { projectId: 'your-project-id' })
```

## How It Works

1. User makes request to your MCP server with auth token
2. `@Authenticated` verifies token and fetches user's secrets from LeanMCP API
3. Secrets are stored in `AsyncLocalStorage` for this request only
4. `@RequireEnv` validates required secrets exist
5. `getEnv()` / `getAllEnv()` access secrets during method execution
6. Context is automatically cleaned up after request completes

```
Request → @Authenticated(projectId) → Fetch Secrets → runWithEnv() → @RequireEnv → Method → Cleanup
           ↓                                            ↓                ↓
     Verify token                              Store in ALS        getEnv() works
```

## Environment Variables

| Variable                        | Description                                  |
| ------------------------------- | -------------------------------------------- |
| `LEANMCP_API_KEY`               | Your LeanMCP API key (with SDK scope)        |
| `LEANMCP_PROJECT_ID`            | Project ID to scope secrets to               |
| `LEANMCP_ORCHESTRATION_API_URL` | API URL (default: https://api.leanmcp.com)   |
| `LEANMCP_AUTH_URL`              | Auth URL (default: https://auth.leanmcp.com) |

## Best Practices

1. **Always use @Authenticated with projectId** - Required for env injection to work
2. **Use @RequireEnv for validation** - Fails fast with clear error messages
3. **Don't cache secrets** - They're request-scoped for security
4. **Configure secrets in dashboard** - Users manage their own secrets
5. **Use non-null assertion** - After @RequireEnv, secrets are guaranteed to exist

```typescript
@RequireEnv(["API_KEY"])
async method() {
    const key = getEnv("API_KEY")!; // Safe to use ! here
}
```

## License

MIT

## Related Packages

- [@leanmcp/auth](../auth) - Authentication decorators
- [@leanmcp/core](../core) - Core MCP server functionality

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)
