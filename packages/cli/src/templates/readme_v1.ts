export const getReadmeTemplate = (projectName: string): string => `# ${projectName}

MCP Server with Streamable HTTP Transport built with LeanMCP SDK

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start development server (hot reload)
npm run dev

# Build for production
npm run build

# Run production server
npm start
\`\`\`

## Project Structure

\`\`\`
${projectName}/
├── main.ts              # Server entry point
├── mcp/                 # Services directory (auto-discovered)
│   └── example/
│       └── index.ts     # Example service
├── .env                 # Environment variables
└── package.json
\`\`\`

## Adding New Services

Create a new service directory in \`mcp/\`:

\`\`\`typescript
// mcp/myservice/index.ts
import { Tool, SchemaConstraint } from "@leanmcp/core";

// Define input schema
class MyToolInput {
  @SchemaConstraint({ 
    description: "Message to process",
    minLength: 1
  })
  message!: string;
}

export class MyService {
  @Tool({ 
    description: "My awesome tool",
    inputClass: MyToolInput
  })
  async myTool(input: MyToolInput) {
    return {
      content: [{
        type: "text",
        text: \`You said: \${input.message}\`
      }]
    };
  }
}
\`\`\`

Services are automatically discovered and registered - no need to modify \`main.ts\`!

## Features

- **Zero-config auto-discovery** - Services automatically registered from \`./mcp\` directory
- **Type-safe decorators** - \`@Tool\`, \`@Prompt\`, \`@Resource\` with full TypeScript support
- **Schema validation** - Automatic input validation with \`@SchemaConstraint\`
- **HTTP transport** - Production-ready HTTP server with session management
- **Hot reload** - Development mode with automatic restart on file changes

## Testing with MCP Inspector

\`\`\`bash
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
\`\`\`

## License

MIT
`;
