<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.svg"
    alt="LeanMCP Logo"
    width="400"
  />
</p>

<p align="center">
  <strong>@leanmcp/ui</strong><br/>
  MCP-Native UI SDK for React — Build rich, interactive MCP Apps with first-class tool integration.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/ui">
    <img src="https://img.shields.io/npm/v/@leanmcp/ui" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/ui">
    <img src="https://img.shields.io/npm/dm/@leanmcp/ui" alt="npm downloads" />
  </a>
  <a href="https://docs.leanmcp.com/sdk/ui">
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

- **MCP-Native Components** — ToolButton, ToolSelect, ToolForm, ToolDataGrid, and more
- **First-Class Tool Integration** — Components that natively call MCP tools
- **ChatGPT Apps Support** — Build apps that work inside ChatGPT with `@GPTApp`
- **Streaming Support** — Handle partial/streaming tool responses
- **Theming** — Automatic host theme adaptation (light/dark)
- **Testing Utilities** — `MockAppProvider` for unit testing

## Installation

```bash
npm install @leanmcp/ui
```

## Quick Start

```tsx
import { AppProvider, ToolButton } from '@leanmcp/ui';
import '@leanmcp/ui/styles.css';

function MyApp() {
  return (
    <AppProvider appInfo={{ name: 'MyApp', version: '1.0.0' }}>
      <ToolButton tool="refresh-data" resultDisplay="toast">
        Refresh
      </ToolButton>
    </AppProvider>
  );
}
```

## Components

### MCP-Native Components

| Component | Description |
|-----------|-------------|
| `ToolButton` | Button with tool execution, confirmation, result display |
| `ToolSelect` | Select with tool-based options and selection callbacks |
| `ToolInput` | Input with debounced search and autocomplete |
| `ToolForm` | Form with multiple field types (text, select, checkbox, slider) |
| `ToolDataGrid` | Table with server-side pagination, sorting, row actions |
| `ResourceView` | Display MCP server resources with auto-refresh |
| `StreamingContent` | Render streaming/partial tool data |

### Utility Components

| Component | Description |
|-----------|-------------|
| `RequireConnection` | Guard wrapper for MCP connection state |
| `ToolErrorBoundary` | Error boundary with retry for tool errors |
| `ToolProvider` | Scoped configuration context |

## Hooks

| Hook | Description |
|------|-------------|
| `useTool` | Call tools with retry, abort, transformation |
| `useToolStream` | Handle streaming tool input |
| `useResource` | Read MCP resources with auto-refresh |
| `useMessage` | Send messages to host chat |
| `useHostContext` | Access host theme and viewport |

## Examples

### ToolButton with Confirmation

```tsx
<ToolButton 
  tool="delete-item" 
  args={{ id: item.id }}
  confirm={{ 
    title: 'Delete Item?',
    description: 'This cannot be undone.' 
  }}
  variant="destructive"
>
  Delete
</ToolButton>
```

### ToolSelect with Dynamic Options

```tsx
<ToolSelect
  optionsTool="list-categories"
  transformOptions={(r) => r.categories.map(c => ({
    value: c.id,
    label: c.name
  }))}
  onSelectTool="set-category"
  argName="categoryId"
/>
```

### ToolDataGrid

```tsx
<ToolDataGrid
  dataTool="list-users"
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status' }
  ]}
  transformData={(r) => ({ rows: r.users, total: r.total })}
  rowActions={[
    { label: 'Edit', tool: 'edit-user' }
  ]}
  pagination
/>
```

### ToolForm

```tsx
<ToolForm
  toolName="create-item"
  fields={[
    { name: 'title', label: 'Title', required: true },
    { name: 'priority', label: 'Priority', type: 'select', 
      options: [
        { value: 'low', label: 'Low' },
        { value: 'high', label: 'High' }
      ] 
    },
    { name: 'notify', label: 'Send notifications', type: 'switch' }
  ]}
  showSuccessToast
/>
```

## Server-Side Integration

Use `@UIApp` decorator to register your React component as an MCP resource.

> **Note:** Use a relative path string for the `component` property, not an imported component. This avoids importing React components on the server side.

```typescript
// mcp/dashboard/index.ts
import { UIApp } from '@leanmcp/core';

export class DashboardService {
  @UIApp({
    component: './Dashboard',  // Path relative to this file
    name: 'dashboard',
    title: 'Analytics Dashboard'
  })
  dashboard() {}
}
```

## ChatGPT Integration

Use `@GPTApp` for ChatGPT-specific apps:

```typescript
import { GPTApp } from '@leanmcp/ui';

export class SlackService {
  @GPTApp({
    component: './SlackApp',  // Path relative to this file
    name: 'slack-composer'
  })
  slackComposer() {}
}
```

## Theming

The SDK uses CSS variables compatible with MCP host theming. Import the styles:

```tsx
import '@leanmcp/ui/styles.css';
```

The styles automatically adapt to the host's theme (light/dark).

## Testing

Use `MockAppProvider` for unit testing:

```tsx
import { MockAppProvider } from '@leanmcp/ui/testing';

test('renders tool result', () => {
  render(
    <MockAppProvider 
      toolResult={{ data: 'test' }}
      callTool={async () => ({ content: [{ type: 'text', text: '{}' }] })}
    >
      <MyComponent />
    </MockAppProvider>
  );
});
```

## Documentation

- [Full Documentation](https://docs.leanmcp.com/sdk/ui)
- [Component Reference](https://docs.leanmcp.com/sdk/ui-components)
- [Hooks Reference](https://docs.leanmcp.com/sdk/ui-hooks)
- [ChatGPT Apps Guide](https://docs.leanmcp.com/sdk/ui-gpt-apps)

## Related Packages

- [@leanmcp/core](https://www.npmjs.com/package/@leanmcp/core) — Core MCP server functionality
- [@leanmcp/cli](https://www.npmjs.com/package/@leanmcp/cli) — CLI for project scaffolding
- [@leanmcp/auth](https://www.npmjs.com/package/@leanmcp/auth) — Authentication decorators

## License

MIT
