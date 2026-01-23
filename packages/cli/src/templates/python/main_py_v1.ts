export const getPythonMainTemplate = (projectName: string): string => `#!/usr/bin/env python3
"""
${projectName} - MCP Server with Streamable HTTP Transport
"""
import os
import uvicorn
from dotenv import load_dotenv
from mcp.server.fastmcp import FastMCP

# Load environment variables
load_dotenv()

# Create the MCP server
mcp = FastMCP("${projectName}")


# === Define your tools, resources, and prompts below ===

@mcp.tool()
def calculate(a: float, b: float, operation: str = "add") -> dict:
    """
    Perform arithmetic operations.
    
    Args:
        a: First number
        b: Second number  
        operation: Operation to perform (add, subtract, multiply, divide)
    """
    if operation == "add":
        result = a + b
    elif operation == "subtract":
        result = a - b
    elif operation == "multiply":
        result = a * b
    elif operation == "divide":
        if b == 0:
            raise ValueError("Cannot divide by zero")
        result = a / b
    else:
        raise ValueError(f"Invalid operation: {operation}")
    
    return {"operation": operation, "a": a, "b": b, "result": result}


@mcp.tool()
def echo(message: str) -> dict:
    """Echo a message back with a timestamp."""
    from datetime import datetime
    return {"echoed": message, "timestamp": datetime.now().isoformat()}


@mcp.resource("server://info")
def server_info() -> str:
    """Get server information."""
    import json
    import time
    return json.dumps({
        "name": "${projectName}",
        "version": "1.0.0",
        "uptime": time.process_time()
    }, indent=2)


@mcp.prompt()
def greeting(name: str = "there") -> str:
    """Generate a greeting prompt."""
    return f"Hello {name}! Welcome to ${projectName}."


if __name__ == "__main__":
    port = int(os.getenv("PORT", "3001"))
    print(f"\\n${projectName} MCP Server starting on port {port}...")
    
    # Run with streamable HTTP transport
    uvicorn.run(
        mcp.streamable_http_app(),
        host="127.0.0.1",
        port=port,
        log_level="info"
    )
`;
