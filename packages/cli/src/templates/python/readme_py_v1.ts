export const getPythonReadmeTemplate = (projectName: string): string => `# ${projectName}

A Python MCP (Model Context Protocol) server with Streamable HTTP transport.

## Quick Start

### Prerequisites

- Python 3.10+
- pip or uv package manager

### Installation

\`\`\`bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt
\`\`\`

### Development

\`\`\`bash
# Start development server
python main.py
\`\`\`

Server runs at http://localhost:3001

### Test with MCP Inspector

\`\`\`bash
npx @modelcontextprotocol/inspector http://localhost:3001/mcp
\`\`\`

## Project Structure

\`\`\`
${projectName}/
  main.py              # Server entry point with tools/resources/prompts
  requirements.txt     # Python dependencies
  .env                 # Environment variables
\`\`\`

## Adding New Tools

Add tools directly in \`main.py\` using the \`@mcp.tool()\` decorator:

\`\`\`python
@mcp.tool()
def my_tool(param: str) -> dict:
    """Tool description shown to AI.
    
    Args:
        param: Parameter description
    """
    return {"result": param}
\`\`\`

## Deploy to LeanMCP Cloud

\`\`\`bash
leanmcp deploy .
\`\`\`

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [FastMCP Documentation](https://github.com/jlowin/fastmcp)
- [LeanMCP Documentation](https://docs.leanmcp.com)
`;
