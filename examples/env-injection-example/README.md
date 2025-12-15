# ENV Injection Example

This example demonstrates user-scoped environment variable injection with LeanMCP.

## Features

- **`@RequireEnv`** - Validate required env vars exist before method execution
- **`getEnv()`** - Access user-specific secrets (not global process.env)
- **Request isolation** - Each user sees only their own secrets

## Setup

1. Copy `.env.example` to `.env` and fill in your values:
   ```bash
   cp .env.example .env
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure user secrets in your LeanMCP dashboard:
   - Go to your project's Secrets page
   - Add `SLACK_TOKEN` and `SLACK_CHANNEL` for each user

4. Run the server:
   ```bash
   npm run dev
   ```

## How It Works

```typescript
@Authenticated(authProvider, { projectId })  // Fetches user secrets
class SlackService {
  @Tool("Send Slack message")
  @RequireEnv(["SLACK_TOKEN"])  // Validates secret exists
  async sendMessage({ message }) {
    const token = getEnv("SLACK_TOKEN");  // Returns THIS user's token
    // ...
  }
}
```

When a user calls this tool:
1. `@Authenticated` verifies their token and fetches their secrets
2. `@RequireEnv` validates required secrets exist
3. `getEnv()` returns the user's specific secret value

## Tools

| Tool | Description |
|------|-------------|
| `sendSlackMessage` | Send a Slack message using user's token |
| `listEnvVars` | List available env vars (keys only) |
| `getEnvVar` | Get a specific env var value (redacted) |
