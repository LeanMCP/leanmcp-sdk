# Slack MCP Server with Elicitation

A comprehensive example demonstrating structured user input collection using the `@leanmcp/elicitation` package with Slack integration.

## Overview

This example demonstrates:
- **@Elicitation decorator** for automatic input collection
- **Multiple elicitation strategies** (form, multi-step, conditional)
- **Fluent builder API** for programmatic form creation
- **Built-in and custom validation** rules
- **Simulated mode** for testing without real Slack credentials
- **Type-safe input schemas** with TypeScript

## Architecture

### Project Structure

```
slack-with-elicitation/
├── main.ts              # Server entry point and configuration
├── mcp/                 # MCP services directory
│   └── slack/
│       └── index.ts     # Slack service with elicitation examples
├── .env.example         # Environment variables template
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── README.md            # Documentation
```

### Service: SlackService

Demonstrates 5 different elicitation patterns:

**1. Simple Form Elicitation** (`createChannel`)
- Declarative field definitions
- Inline validation rules
- All fields collected at once

**2. Conditional Elicitation** (`sendMessage`)
- Conditional elicitation based on provided arguments
- Only asks for missing required fields

**3. Fluent Builder API** (`listChannels`)
- Programmatic form construction
- Chainable API for field definitions
- Complex validation rules

**4. Multi-Step Elicitation** (`deployApp`)
- Sequential step-by-step input collection
- Conditional steps based on previous answers
- Progress tracking with metadata

**5. Complex Validation** (`createUser`)
- Custom validators
- Multiple validation rules per field
- Pattern matching and custom error messages

## Setup

### 1. Prerequisites

- Node.js 18+ installed
- Slack workspace and bot token (optional - works in simulated mode)

### 2. Install Dependencies

From the monorepo root:

```bash
npm install
npm run build
```

### 3. Configure Environment

Copy the example environment file:

```bash
cd examples/slack-with-elicitation
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Slack Configuration (optional)
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token-here

# Server Configuration
PORT=3000
```

**Note:** If you don't provide a `SLACK_BOT_TOKEN`, the server will run in **simulated mode** with mock responses, allowing you to test elicitation without a real Slack integration.

### 4. Run the Server

```bash
# Development mode with hot reload
npm run dev

# Or build and run
npm run build
npm start
```

The server will start on `http://localhost:3000` with the following endpoints:
- **MCP endpoint**: `http://localhost:3000/mcp`
- **Health check**: `http://localhost:3000/health`

## Tools

### 1. createChannel - Simple Form Elicitation

Collects all channel details in a single form.

**Fields:**
- `channelName` (text, required) - Channel name with pattern validation
- `isPrivate` (boolean) - Private channel flag
- `description` (textarea) - Channel description

**Example Call:**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "createChannel",
      "arguments": {}
    }
  }'
```

**Response (Elicitation Request):**
```json
{
  "content": [{
    "type": "text",
    "text": "{\n  \"type\": \"elicitation\",\n  \"title\": \"Create Slack Channel\",\n  \"fields\": [...]\n}"
  }]
}
```

### 2. sendMessage - Conditional Elicitation

Only asks for channel ID if not provided.

**Fields:**
- `channelId` (select, conditional) - Only requested if missing
- `message` (text, required) - Message content
- `threadTs` (text, optional) - Thread timestamp

**Example Call (Missing channelId):**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "sendMessage",
      "arguments": {
        "message": "Hello World"
      }
    }
  }'
```

### 3. listChannels - Fluent Builder API

Uses programmatic form builder with complex validation.

**Fields:**
- `excludeArchived` (boolean) - Exclude archived channels
- `types` (select, required) - Channel types filter
- `limit` (number) - Maximum results (1-1000)

### 4. deployApp - Multi-Step Elicitation

Breaks deployment into sequential steps.

**Step 1: Environment Selection**
- `environment` (select, required) - prod/staging/dev

**Step 2: Configuration** (conditional on production)
- `replicas` (number) - Number of replicas (1-10)
- `autoScale` (boolean) - Enable auto-scaling

### 5. createUser - Complex Validation

Demonstrates custom validators and multiple validation rules.

**Fields:**
- `email` (email, required) - Email address
- `username` (text, required) - Username with pattern validation
- `password` (text, required) - Password with custom validator
- `role` (select, required) - User role

## Usage Examples

### Elicitation Flow

The elicitation flow works in two steps:

**Step 1: Call tool with missing fields**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "createChannel",
      "arguments": {}
    }
  }'
```

**Response: Elicitation Request**
```json
{
  "content": [{
    "type": "text",
    "text": "{\n  \"type\": \"elicitation\",\n  \"title\": \"Create Slack Channel\",\n  \"description\": \"Please provide the channel details\",\n  \"fields\": [\n    {\n      \"name\": \"channelName\",\n      \"label\": \"Channel Name\",\n      \"type\": \"text\",\n      \"required\": true\n    }\n  ]\n}"
  }]
}
```

**Step 2: Call tool with complete fields**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "createChannel",
      "arguments": {
        "channelName": "my-channel",
        "isPrivate": false,
        "description": "A test channel"
      }
    }
  }'
```

**Response: Tool Result**
```json
{
  "content": [{
    "type": "text",
    "text": "{\n  \"success\": true,\n  \"channelId\": \"C1234567890\",\n  \"channelName\": \"my-channel\",\n  \"message\": \"[SIMULATED] Channel my-channel created successfully!\"\n}"
  }]
}
```

### Testing Multi-Step Elicitation

```bash
# Step 1: Initial call
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "deployApp",
      "arguments": {}
    }
  }'

# Returns Step 1: Environment selection

# Step 2: Provide environment
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "deployApp",
      "arguments": {
        "environment": "prod"
      }
    }
  }'

# Returns Step 2: Configuration (only for prod)

# Step 3: Complete deployment
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "deployApp",
      "arguments": {
        "environment": "prod",
        "replicas": 5,
        "autoScale": true
      }
    }
  }'

# Returns deployment result
```

## How Elicitation Works

1. **Client calls tool** with missing required fields
2. **@Elicitation decorator intercepts** the method call
3. **Elicitation check** determines if required fields are missing
4. **Elicitation request returned** if fields are missing
5. **Client displays form** to collect user input
6. **Client calls tool again** with complete arguments
7. **Method executes** normally with all required fields

## Key Features

- ✅ **Automatic interception** - Decorator wraps methods to check for missing fields
- ✅ **Multiple strategies** - Form, multi-step, and conditional elicitation
- ✅ **Type-safe** - Full TypeScript support with decorators
- ✅ **Simulated mode** - Test without real Slack credentials
- ✅ **Hot reload** - Watch mode for rapid development
- ✅ **MCP compliant** - Follows MCP elicitation protocol

## Code Examples

### Simple Form Elicitation

```typescript
@Tool({ description: "Create a new Slack channel" })
@Elicitation({
  title: "Create Slack Channel",
  description: "Please provide the channel details",
  fields: [
    {
      name: "channelName",
      label: "Channel Name",
      type: "text",
      required: true,
      validation: {
        pattern: "^[a-z0-9-]+$",
        errorMessage: "Must be lowercase alphanumeric with hyphens"
      }
    },
    {
      name: "isPrivate",
      label: "Private Channel",
      type: "boolean",
      defaultValue: false
    }
  ]
})
async createChannel(args: CreateChannelInput) {
  // Implementation
}
```

### Fluent Builder API

```typescript
@Tool({ description: "List Slack channels" })
@Elicitation({
  builder: () => new ElicitationFormBuilder()
    .title("Channel Filters")
    .description("Filter the channels you want to see")
    .addBooleanField("excludeArchived", "Exclude Archived", { 
      defaultValue: true 
    })
    .addSelectField("types", "Channel Types", [
      { label: "Public Channels", value: "public_channel" },
      { label: "Private Channels", value: "private_channel" }
    ], { required: true })
    .addNumberField("limit", "Maximum Results", {
      defaultValue: 100,
      validation: validation()
        .min(1)
        .max(1000)
        .build()
    })
    .build()
})
async listChannels(args: any) {
  // Implementation
}
```

### Multi-Step Elicitation

```typescript
@Tool({ description: "Deploy application" })
@Elicitation({
  strategy: "multi-step",
  builder: () => [
    {
      title: "Step 1: Select Environment",
      fields: [
        {
          name: "environment",
          label: "Environment",
          type: "select",
          required: true,
          options: [
            { label: "Production", value: "prod" },
            { label: "Staging", value: "staging" }
          ]
        }
      ]
    },
    {
      title: "Step 2: Configuration",
      fields: [
        {
          name: "replicas",
          label: "Number of Replicas",
          type: "number",
          defaultValue: 3
        }
      ],
      condition: (prev) => prev.environment === 'prod'
    }
  ]
})
async deployApp(args: DeployAppInput) {
  // Implementation
}
```

## Troubleshooting

### Elicitation not triggering

- Verify `@Elicitation` decorator is applied to the method
- Check that required fields are actually missing in the request
- Ensure condition function (if used) returns true

### Simulated mode not working

- Check that `SLACK_BOT_TOKEN` is not set or is set to `'simulated-token'`
- Look for console logs indicating "Running in SIMULATED mode"

### Build errors

- Ensure all dependencies are installed: `npm install`
- Rebuild packages: `npm run build` from monorepo root
- Check TypeScript version compatibility

## Learn More

- [@leanmcp/elicitation documentation](../../packages/elicitation/README.md)
- [@leanmcp/core documentation](../../packages/core/README.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io)

## License

MIT
