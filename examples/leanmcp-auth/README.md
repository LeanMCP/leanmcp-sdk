# Leanmcp Auth Example

This example demonstrates how to build an MCP server protected by Leanmcp authentication.

## Features

- **Leanmcp Authentication**: Uses `@leanmcp/auth` to verify user tokens.
- **Zero-Config Setup**: Services are automatically discovered from the `mcp` directory.
- **Automatic User Injection**: The `authUser` object is automatically available in authenticated tools.

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Configure your Leanmcp API Key in `.env`:
   ```
   LEANMCP_API_KEY=your_api_key_here
   ```
   You can generate an API Key with the `SDK` scope from the Leanmcp dashboard (or via the Orchestration API).

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run the server:
   ```bash
   npm run dev
   ```

## Usage

The server exposes an HTTP endpoint at `http://localhost:3000/mcp`.
You can use this endpoint with any MCP client that supports authentication.

When calling the tools, you must provide a valid Leanmcp User Token (JWT) in the `Authorization` header:
```
Authorization: Bearer <your_user_token>
```

## Tools

- `demo.getUserProfile`: Returns the authenticated user's profile.
- `demo.echo`: Echoes back a message with the user's ID and email.
