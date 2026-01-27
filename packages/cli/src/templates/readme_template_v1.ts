export const getReadmeTemplate = (projectName: string): string => `# ${projectName}

MCP server built with LeanMCP SDK.

## � Quick Start

\`\`\`bash
# Install dependencies
npm install

# Start the server
npm run dev

# Server runs on http://localhost:3001
\`\`\`

## Test Your Server

### Calculate Tool (Schema Validation)
\`\`\`bash
curl -X POST http://localhost:3001/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"method": "tools/call", "params": {"name": "calculate", "arguments": {"a": 10, "b": 5, "operation": "add"}}}'
\`\`\`

### Echo Tool
\`\`\`bash
curl -X POST http://localhost:3001/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"method": "tools/call", "params": {"name": "echo", "arguments": {"message": "Hello LeanMCP!"}}}'
\`\`\`

### Server Information (Resource)
\`\`\`bash
curl -X POST http://localhost:3001/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"method": "resources/read", "params": {"uri": "server://info"}}'
\`\`\`

## Available Tools & Resources

| Name | Type | Description |
|------|------|-------------|
| \`calculate\` | Tool | Perform arithmetic operations |
| \`echo\` | Tool | Echo messages back |
| \`serverInfo\` | Resource | Get server status and information |
| \`welcome\` | Prompt | Generate welcome message |

## Project Structure

\`\`\`
${projectName}/
├── main.ts              # Server entry point
├── package.json         # Dependencies
├── tsconfig.json        # TypeScript config
└── mcp/                 # Services directory
    └── ${projectName.toLowerCase()}/
        └── index.ts     # Your service implementation
\`\`\`

## Customization

### Add New Tools
Edit \`mcp/${projectName.toLowerCase()}/index.ts\` and add new methods with the \`@Tool\` decorator:

\`\`\`typescript
@Tool({
  description: "Your new tool",
  inputClass: YourInputClass
})
async yourNewTool(input: YourInputClass) {
  // Implementation
  return { content: [{ type: "text", text: "Result" }] };
}
\`\`\`

### Add Resources
Use the \`@Resource\` decorator for data endpoints:

\`\`\`typescript
@Resource({ description: "Your resource" })
async yourResource() {
  return {
    contents: [{
      uri: "your://resource",
      mimeType: "application/json",
      text: JSON.stringify({ data: "value" })
    }]
  };
}
\`\`\`

### Add Prompts
Use the \`@Prompt\` decorator for prompt templates:

\`\`\`typescript
@Prompt({ description: "Your prompt" })
async yourPrompt(args: { param?: string }) {
  return {
    messages: [{
      role: "user",
      content: { type: "text", text: "Your prompt text" }
    }]
  };
}
\`\`\`

## Learn More

- [LeanMCP Documentation](https://github.com/LeanMCP/leanmcp-sdk)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Discord Community](https://discord.com/invite/DsRcA3GwPy)

---

Built with [LeanMCP SDK](https://github.com/LeanMCP/leanmcp-sdk)
`;
