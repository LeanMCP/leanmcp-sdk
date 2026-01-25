<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.png"
    alt="LeanMCP Logo"
    width="400"
  />
</p>

<p align="center">
  <strong>@leanmcp/auth</strong><br/>
  Token-based authentication decorators and multi-provider support for MCP tools.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/auth">
    <img src="https://img.shields.io/npm/v/@leanmcp/auth" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/auth">
    <img src="https://img.shields.io/npm/dm/@leanmcp/auth" alt="npm downloads" />
  </a>
  <a href="https://docs.leanmcp.com/sdk/auth">
    <img src="https://img.shields.io/badge/Docs-leanmcp-0A66C2?" />
  </a>
  <a href="https://discord.com/invite/DsRcA3GwPy">
    <img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://x.com/LeanMcp">
    <img src="https://img.shields.io/badge/@LeanMCP-f5f5f5?logo=x&logoColor=000000" />
  </a>
  <a href="https://deepwiki.com/LeanMCP/leanmcp-sdk"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

## Features

- **@Authenticated Decorator** — Protect tools, prompts, and resources with a simple decorator
- **Multi-Provider Support** — AWS Cognito, Clerk, Auth0, and LeanMCP providers
- **Automatic authUser** — Decoded user info injected as global `authUser` variable
- **Concurrency Safe** — Uses AsyncLocalStorage for request-isolated context
- **Method or Class-Level** — Apply to individual methods or entire services
- **OAuth & Session Modes** — Support for both session-based and OAuth refresh token flows

## Installation

```bash
npm install @leanmcp/auth @leanmcp/core
```

### Provider Dependencies

**AWS Cognito:**
```bash
npm install @aws-sdk/client-cognito-identity-provider axios jsonwebtoken jwk-to-pem
```

**Clerk:**
```bash
npm install axios jsonwebtoken jwk-to-pem
```

**Auth0:**
```bash
npm install axios jsonwebtoken jwk-to-pem
```

## Quick Start

### 1. Initialize Auth Provider

```typescript
import { AuthProvider } from "@leanmcp/auth";

const authProvider = new AuthProvider('cognito', {
  region: 'us-east-1',
  userPoolId: 'us-east-1_XXXXXXXXX',
  clientId: 'your-client-id'
});

await authProvider.init();
```

### 2. Protect Methods with @Authenticated

```typescript
import { Tool } from "@leanmcp/core";
import { Authenticated } from "@leanmcp/auth";

export class SentimentService {
  @Tool({ description: 'Analyze sentiment (requires auth)' })
  @Authenticated(authProvider)
  async analyzeSentiment(input: { text: string }) {
    // authUser is automatically available with user info
    console.log('User ID:', authUser.sub);
    console.log('Email:', authUser.email);

    return { 
      sentiment: 'positive', 
      score: 0.8,
      analyzedBy: authUser.sub
    };
  }

  // Public method - no authentication
  @Tool({ description: 'Get categories (public)' })
  async getCategories() {
    return { categories: ['positive', 'negative', 'neutral'] };
  }
}
```

### 3. Protect Entire Service

```typescript
// All methods in this class require authentication
@Authenticated(authProvider)
export class SecureService {
  @Tool({ description: 'Protected tool' })
  async protectedTool(input: { data: string }) {
    // authUser is available in all methods
    return { data: input.data, userId: authUser.sub };
  }
}
```

---

## The authUser Variable

When using `@Authenticated`, a global `authUser` variable is automatically injected containing the decoded JWT payload:

```typescript
@Tool({ description: 'Create post' })
@Authenticated(authProvider)
async createPost(input: { title: string, content: string }) {
  return {
    id: generateId(),
    title: input.title,
    content: input.content,
    authorId: authUser.sub,
    authorEmail: authUser.email
  };
}
```

### Provider-Specific User Data

**AWS Cognito:**
```typescript
{
  sub: 'user-uuid',
  email: 'user@example.com',
  email_verified: true,
  'cognito:username': 'username',
  'cognito:groups': ['admin', 'users']
}
```

**Clerk:**
```typescript
{
  sub: 'user_2abc123xyz',
  userId: 'user_2abc123xyz',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  imageUrl: 'https://img.clerk.com/...'
}
```

**Auth0:**
```typescript
{
  sub: 'auth0|507f1f77bcf86cd799439011',
  email: 'user@example.com',
  email_verified: true,
  name: 'John Doe',
  picture: 'https://s.gravatar.com/avatar/...'
}
```

### Controlling User Fetch

```typescript
// Fetch user info (default)
@Authenticated(authProvider, { getUser: true })
async withUserInfo(input: any) {
  console.log(authUser); // User data available
}

// Only verify token, skip user fetch (faster)
@Authenticated(authProvider, { getUser: false })
async tokenOnlyValidation(input: any) {
  // authUser is undefined
}
```

---

## Supported Providers

### AWS Cognito

```typescript
const authProvider = new AuthProvider('cognito', {
  region: 'us-east-1',
  userPoolId: 'us-east-1_XXXXXXXXX',
  clientId: 'your-client-id'
});
await authProvider.init();
```

**Environment Variables:**
```bash
AWS_REGION=us-east-1
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=your-client-id
```

### Clerk

```typescript
// Session Mode (default)
const authProvider = new AuthProvider('clerk', {
  frontendApi: 'your-frontend-api.clerk.accounts.dev',
  secretKey: 'sk_test_...'
});

// OAuth Mode (with refresh tokens)
const authProvider = new AuthProvider('clerk', {
  frontendApi: 'your-frontend-api.clerk.accounts.dev',
  secretKey: 'sk_test_...',
  clientId: 'your-oauth-client-id',
  clientSecret: 'your-oauth-client-secret',
  redirectUri: 'https://yourapp.com/callback'
});

await authProvider.init();
```

### Auth0

```typescript
const authProvider = new AuthProvider('auth0', {
  domain: 'your-tenant.auth0.com',
  clientId: 'your-client-id',
  clientSecret: 'your-client-secret',
  audience: 'https://your-api-identifier'
});
await authProvider.init();
```

### LeanMCP

For LeanMCP platform deployments with user secrets support:

```typescript
const authProvider = new AuthProvider('leanmcp', {
  apiKey: 'your-leanmcp-api-key'
});
await authProvider.init();
```

---

## Client Usage

Authentication tokens are passed via the `_meta` field following MCP protocol standards:

```typescript
await mcpClient.callTool({
  name: "analyzeSentiment",
  arguments: { text: "Hello world" },
  _meta: {
    authorization: {
      type: "bearer",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
});
```

---

## Error Handling

```typescript
import { AuthenticationError } from "@leanmcp/auth";

try {
  await service.protectedMethod({ text: "test" });
} catch (error) {
  if (error instanceof AuthenticationError) {
    switch (error.code) {
      case 'MISSING_TOKEN':
        console.log('No token provided');
        break;
      case 'INVALID_TOKEN':
        console.log('Token is invalid or expired');
        break;
      case 'VERIFICATION_FAILED':
        console.log('Verification failed:', error.message);
        break;
    }
  }
}
```

---

## API Reference

### AuthProvider

```typescript
class AuthProvider {
  constructor(provider: string, config: any);
  async init(config?: any): Promise<void>;
  async verifyToken(token: string): Promise<boolean>;
  async refreshToken(refreshToken: string): Promise<any>;
  async getUser(token: string): Promise<any>;
  getProviderType(): string;
}
```

### @Authenticated Decorator

```typescript
function Authenticated(
  authProvider: AuthProvider, 
  options?: AuthenticatedOptions
): ClassDecorator | MethodDecorator;

interface AuthenticatedOptions {
  getUser?: boolean;   // Default: true
  projectId?: string;  // For LeanMCP user secrets
}
```

### AuthenticationError

```typescript
class AuthenticationError extends Error {
  code: 'MISSING_TOKEN' | 'INVALID_TOKEN' | 'VERIFICATION_FAILED';
  constructor(message: string, code: string);
}
```

### Helper Functions

```typescript
// Check if authentication is required
function isAuthenticationRequired(target: any): boolean;

// Get auth provider for method/class
function getAuthProvider(target: any): AuthProviderBase | undefined;

// Get current authenticated user
function getAuthUser(): any;
```

---

## Best Practices

### Security
- Always use HTTPS in production
- Store tokens securely (keychain, encrypted storage)
- Implement token refresh before expiration
- Add rate limiting to protect against brute force

### Configuration
- Use environment variables for credentials
- Never hardcode secrets in code
- Use `_meta` for auth, not business arguments

### Performance
- Use `getUser: false` when you only need token validation
- JWKS keys are cached automatically for performance

---

## Documentation

- [Full Documentation](https://docs.leanmcp.com/sdk/auth)

## Related Packages

- [@leanmcp/core](https://www.npmjs.com/package/@leanmcp/core) — Core decorators and server functionality
- [@leanmcp/env-injection](https://www.npmjs.com/package/@leanmcp/env-injection) — Environment variable injection for user secrets

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [NPM Package](https://www.npmjs.com/package/@leanmcp/auth)

## License

MIT
