export const getPythonExampleServiceTemplate = (projectName: string): string => `"""
Example MCP service demonstrating tools, resources, and prompts.
"""
from typing import Optional
from pydantic import Field
from mcp.server.fastmcp import FastMCP

# Get the MCP instance from main
from main import mcp


@mcp.tool()
def calculate(
    a: float = Field(description="First number"),
    b: float = Field(description="Second number"),
    operation: str = Field(
        default="add",
        description="Operation to perform: add, subtract, multiply, divide"
    )
) -> dict:
    """Perform arithmetic operations with automatic schema validation."""
    result: float
    
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
    
    return {
        "operation": operation,
        "operands": {"a": a, "b": b},
        "result": result
    }


@mcp.tool()
def echo(message: str = Field(description="Message to echo back", min_length=1)) -> dict:
    """Echo a message back with a timestamp."""
    from datetime import datetime
    
    return {
        "echoed": message,
        "timestamp": datetime.now().isoformat()
    }


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
def greeting(name: Optional[str] = None) -> str:
    """Generate a greeting prompt."""
    return f"Hello {name or 'there'}! Welcome to ${projectName}."
`;
