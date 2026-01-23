export const getPythonRequirementsTemplate = (): string => `# MCP Server Dependencies
mcp>=1.0.0
fastmcp>=0.1.0
uvicorn>=0.30.0
python-dotenv>=1.0.0
pydantic>=2.0.0

# Optional: Add your dependencies below
# requests>=2.31.0
# httpx>=0.27.0
`;
