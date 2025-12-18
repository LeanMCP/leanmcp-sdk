# @leanmcp/ui

**MCP-Native UI SDK for React** - Build rich, interactive MCP Apps with first-class tool integration.

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

## License

MIT
