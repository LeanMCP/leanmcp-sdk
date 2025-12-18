# MCP App Dashboard Example

Demonstrates proper MCP Apps usage with `@UIApp` decorator and `@leanmcp/ui` components.

## Architecture

```
mcp-app-dashboard/
├── main.ts                          # MCP server entry point
├── mcp/products/
│   ├── index.ts                     # ProductsService with @UIApp tools
│   └── ProductsDashboard.tsx        # React component for UI
└── dist/ui/                         # Built HTML (auto-generated)
```

## How It Works

1. **`@UIApp` decorator** on tools links them to React components
2. **`leanmcp dev`** pre-builds components to `dist/ui/*.html`
3. **`@leanmcp/core`** auto-registers UI resources from `dist/ui-manifest.json`
4. **Host** fetches resource and renders in iframe

## Usage

```bash
# Install dependencies
npm install

# Development (with UI hot-reload)
npm run dev

# Production
npm run build
npm run start
```

## Key Features Demonstrated

- **@UIApp decorator** - Links tools to React components
- **ToolDataGrid** - Server-side paginated table
- **ToolForm** - Form with field types
- **ToolButton** - Action buttons with toast
- **useTool** - Custom tool calling
- **useHostContext** - Theme adaptation

## Example Tool Definition

```typescript
@Tool({
    description: "List products",
    inputClass: ListProductsInput
})
@UIApp({
    component: './ProductsDashboard',
    title: 'Products Dashboard'
})
async listProducts(input: ListProductsInput) {
    return { products: [...], total: 100 };
}
```
