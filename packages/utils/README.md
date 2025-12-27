<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.svg"
    alt="LeanMCP Logo"
    width="400"
  />
</p>

<p align="center">
  <strong>@leanmcp/utils</strong><br/>
  Utility functions and helpers for LeanMCP SDK.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/utils">
    <img src="https://img.shields.io/npm/v/@leanmcp/utils" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/utils">
    <img src="https://img.shields.io/npm/dm/@leanmcp/utils" alt="npm downloads" />
  </a>
  <a href="https://docs.leanmcp.com/sdk/utils">
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

- **Retry logic** — Exponential backoff for resilient operations
- **Response formatting** — Format data as JSON, Markdown, HTML, or tables
- **Object utilities** — Deep merge, validation, and manipulation
- **Async helpers** — Sleep, timeout, and promise utilities

## Installation

```bash
npm install @leanmcp/utils
```

## API Reference

### Response Formatting

#### formatResponse(data, format)

Format data based on specified format type.

```typescript
import { formatResponse } from "@leanmcp/utils";

// JSON formatting
const json = formatResponse({ hello: "world" }, "json");
// Output: '{\n  "hello": "world"\n}'

// Markdown formatting
const md = formatResponse({ hello: "world" }, "markdown");
// Output: '```json\n{\n  "hello": "world"\n}\n```'

// HTML formatting
const html = formatResponse({ hello: "world" }, "html");
// Output: '<pre>{\n  "hello": "world"\n}</pre>'

// Table formatting (for arrays)
const table = formatResponse([
  { name: "Alice", age: 30 },
  { name: "Bob", age: 25 }
], "table");
// Output: Markdown table format
```

**Supported formats:**
- `json` - Pretty-printed JSON
- `markdown` - JSON wrapped in markdown code block
- `html` - JSON wrapped in HTML pre tag
- `table` - Markdown table (for arrays of objects)
- Default - String conversion

#### formatAsTable(data)

Format array of objects as a Markdown table.

```typescript
import { formatAsTable } from "@leanmcp/utils";

const data = [
  { name: "Alice", age: 30, city: "NYC" },
  { name: "Bob", age: 25, city: "LA" }
];

const table = formatAsTable(data);
console.log(table);
// | name | age | city |
// | --- | --- | --- |
// | Alice | 30 | NYC |
// | Bob | 25 | LA |
```

### Object Utilities

#### deepMerge(target, ...sources)

Deep merge multiple objects.

```typescript
import { deepMerge } from "@leanmcp/utils";

const target = { a: 1, b: { c: 2 } };
const source1 = { b: { d: 3 } };
const source2 = { e: 4 };

const result = deepMerge(target, source1, source2);
// { a: 1, b: { c: 2, d: 3 }, e: 4 }
```

#### isObject(item)

Check if value is a plain object.

```typescript
import { isObject } from "@leanmcp/utils";

isObject({});           // true
isObject([]);           // false
isObject(null);         // false
isObject("string");     // false
```

### Async Utilities

#### retry(fn, options)

Retry a function with exponential backoff.

```typescript
import { retry } from "@leanmcp/utils";

// Retry API call up to 3 times
const result = await retry(
  async () => {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error('API error');
    return response.json();
  },
  {
    maxRetries: 3,       // Maximum number of retries
    delayMs: 1000,       // Initial delay in milliseconds
    backoff: 2           // Backoff multiplier (2^n)
  }
);
```

**Retry logic:**
- Attempt 1: Immediate
- Attempt 2: Wait 1000ms
- Attempt 3: Wait 2000ms
- Attempt 4: Wait 4000ms

#### sleep(ms)

Async sleep function.

```typescript
import { sleep } from "@leanmcp/utils";

await sleep(1000);  // Wait 1 second
console.log("1 second later");
```

#### timeout(promise, ms)

Add timeout to a promise.

```typescript
import { timeout } from "@leanmcp/utils";

try {
  const result = await timeout(
    fetch('https://slow-api.example.com'),
    5000  // 5 second timeout
  );
} catch (error) {
  console.log('Request timed out');
}
```

## Usage Examples

### Formatting API Responses

```typescript
import { formatResponse } from "@leanmcp/utils";

class DataService {
  @Tool({ description: 'Get user data' })
  async getUsers() {
    const users = await fetchUsers();
    
    // Return as formatted table
    return {
      content: [{
        type: "text",
        text: formatResponse(users, "table")
      }]
    };
  }
}
```

### Resilient API Calls

```typescript
import { retry } from "@leanmcp/utils";

class ExternalService {
  @Tool({ description: 'Fetch external data' })
  async fetchData(input: { url: string }) {
    // Automatically retry failed requests
    const data = await retry(
      () => fetch(input.url).then(r => r.json()),
      { maxRetries: 3, delayMs: 1000 }
    );
    
    return { data };
  }
}
```

### Deep Configuration Merging

```typescript
import { deepMerge } from "@leanmcp/utils";

const defaultConfig = {
  server: { port: 3000, host: 'localhost' },
  logging: { level: 'info' }
};

const userConfig = {
  server: { port: 4000 },
  features: { auth: true }
};

const config = deepMerge(defaultConfig, userConfig);
// {
//   server: { port: 4000, host: 'localhost' },
//   logging: { level: 'info' },
//   features: { auth: true }
// }
```

## Type Definitions

All functions are fully typed with TypeScript:

```typescript
export function formatResponse(data: any, format: string): string;
export function formatAsTable(data: any[]): string;
export function deepMerge<T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T;
export function isObject(item: any): boolean;
export function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
export function sleep(ms: number): Promise<void>;
export function timeout<T>(promise: Promise<T>, ms: number): Promise<T>;

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: number;
}
```

## License

MIT

## Related Packages

- [@leanmcp/core](../core) - Core MCP server functionality
- [@leanmcp/auth](../auth) - Authentication decorators
- [@leanmcp/cli](../cli) - CLI tool for creating new projects

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)
