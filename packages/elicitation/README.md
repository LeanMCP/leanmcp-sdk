# @leanmcp/elicitation

Structured user input collection for LeanMCP tools using the MCP elicitation protocol. The `@Elicitation` decorator automatically intercepts tool calls to request missing required fields from users before execution.

## Features

- **@Elicitation decorator** - Declarative way to collect missing user inputs
- **Method wrapping** - Automatically intercepts calls and returns elicitation requests
- **Multiple strategies** - Form, multi-step, and conversational elicitation
- **Fluent builder API** - Programmatic form creation with type safety
- **Built-in validation** - Email, URL, pattern matching, custom validators
- **Conditional elicitation** - Only ask for inputs when needed
- **Type-safe** - Full TypeScript support with type inference

## Installation

```bash
npm install @leanmcp/elicitation @leanmcp/core
```

## Quick Start

### 1. Simple Form Elicitation

```typescript
import { Tool } from "@leanmcp/core";
import { Elicitation } from "@leanmcp/elicitation";

class SlackService {
  @Tool({ description: "Create a new Slack channel" })
  @Elicitation({
    title: "Create Channel",
    description: "Please provide channel details",
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
  async createChannel(args: { channelName: string; isPrivate: boolean }) {
    // Implementation
    return { success: true, channelName: args.channelName };
  }
}
```

### 2. Conditional Elicitation

Only ask for inputs when they're missing:

```typescript
@Tool({ description: "Send message to Slack" })
@Elicitation({
  condition: (args) => !args.channelId,
  title: "Select Channel",
  fields: [
    {
      name: "channelId",
      label: "Channel",
      type: "select",
      required: true,
      options: [
        { label: "#general", value: "C12345" },
        { label: "#random", value: "C67890" }
      ]
    }
  ]
})
async sendMessage(args: { channelId?: string; message: string }) {
  // Only elicits if channelId is missing
}
```

### 3. Fluent Builder API

More programmatic approach:

```typescript
import { ElicitationFormBuilder, validation } from "@leanmcp/elicitation";

@Tool({ description: "Create user account" })
@Elicitation({
  builder: () => new ElicitationFormBuilder()
    .title("User Registration")
    .description("Create a new user account")
    .addEmailField("email", "Email Address", { required: true })
    .addTextField("username", "Username", {
      required: true,
      validation: validation()
        .minLength(3)
        .maxLength(20)
        .pattern("^[a-zA-Z0-9_]+$")
        .build()
    })
    .addSelectField("role", "Role", [
      { label: "Admin", value: "admin" },
      { label: "User", value: "user" }
    ])
    .build()
})
async createUser(args: any) {
  // Implementation
}
```

### 4. Multi-Step Elicitation

Break input collection into multiple steps:

```typescript
@Tool({ description: "Deploy application" })
@Elicitation({
  strategy: "multi-step",
  builder: () => [
    {
      title: "Step 1: Environment",
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
          label: "Replicas",
          type: "number",
          defaultValue: 3
        }
      ],
      condition: (prev) => prev.environment === "prod"
    }
  ]
})
async deployApp(args: any) {
  // Implementation
}
```

## Field Types

### Text Fields

```typescript
{
  name: "description",
  label: "Description",
  type: "text",
  placeholder: "Enter description...",
  validation: {
    minLength: 10,
    maxLength: 500
  }
}
```

### Textarea

```typescript
{
  name: "content",
  label: "Content",
  type: "textarea",
  placeholder: "Enter long text..."
}
```

### Number

```typescript
{
  name: "age",
  label: "Age",
  type: "number",
  validation: {
    min: 18,
    max: 120
  }
}
```

### Boolean (Checkbox)

```typescript
{
  name: "agree",
  label: "I agree to terms",
  type: "boolean",
  defaultValue: false
}
```

### Select (Dropdown)

```typescript
{
  name: "country",
  label: "Country",
  type: "select",
  options: [
    { label: "United States", value: "US" },
    { label: "Canada", value: "CA" }
  ]
}
```

### Multi-Select

```typescript
{
  name: "tags",
  label: "Tags",
  type: "multiselect",
  options: [
    { label: "JavaScript", value: "js" },
    { label: "TypeScript", value: "ts" },
    { label: "Python", value: "py" }
  ]
}
```

### Email

```typescript
{
  name: "email",
  label: "Email",
  type: "email",
  required: true
}
```

### URL

```typescript
{
  name: "website",
  label: "Website",
  type: "url",
  placeholder: "https://example.com"
}
```

### Date

```typescript
{
  name: "birthdate",
  label: "Birth Date",
  type: "date"
}
```

## Validation

### Built-in Validators

```typescript
{
  name: "username",
  label: "Username",
  type: "text",
  validation: {
    minLength: 3,
    maxLength: 20,
    pattern: "^[a-zA-Z0-9_]+$",
    errorMessage: "Username must be 3-20 alphanumeric characters"
  }
}
```

### Custom Validators

```typescript
{
  name: "password",
  label: "Password",
  type: "text",
  validation: {
    customValidator: (value) => {
      const hasUpper = /[A-Z]/.test(value);
      const hasLower = /[a-z]/.test(value);
      const hasNumber = /[0-9]/.test(value);
      
      if (!hasUpper || !hasLower || !hasNumber) {
        return "Password must contain uppercase, lowercase, and numbers";
      }
      
      return true; // Valid
    }
  }
}
```

### Using ValidationBuilder

```typescript
import { validation } from "@leanmcp/elicitation";

validation()
  .minLength(8)
  .maxLength(100)
  .pattern("^[a-zA-Z0-9]+$")
  .customValidator((value) => value !== "admin")
  .errorMessage("Invalid input")
  .build()
```

## How It Works

1. **Client calls tool** with missing required fields
2. **Decorator intercepts** the method call before execution
3. **Elicitation check** determines if required fields are missing
4. **Elicitation request returned** if fields are missing
5. **Client displays form** to collect user input
6. **Client calls tool again** with complete arguments
7. **Method executes** normally with all required fields

**Key Benefits:**
- **Automatic interception** - No need to modify `@leanmcp/core`
- **Clean separation** - Elicitation logic separate from business logic
- **MCP compliant** - Follows MCP elicitation protocol
- **Type-safe** - Full TypeScript support

## Strategies

### Form Strategy (Default)

Collect all fields at once:

```typescript
@Elicitation({
  strategy: "form", // or omit, form is default
  title: "User Information",
  fields: [/* ... */]
})
```

### Multi-Step Strategy

Break input collection into sequential steps:

```typescript
@Elicitation({
  strategy: "multi-step",
  builder: () => [
    {
      title: "Step 1: Basic Info",
      fields: [/* step 1 fields */]
    },
    {
      title: "Step 2: Details",
      fields: [/* step 2 fields */],
      condition: (prev) => prev.needsDetails === true
    }
  ]
})
```

## Elicitation Flow

### Request/Response Cycle

**First Call (Missing Fields):**
```json
// Request
{
  "method": "tools/call",
  "params": {
    "name": "createChannel",
    "arguments": {}
  }
}

// Response (Elicitation Request)
{
  "content": [{
    "type": "text",
    "text": "{\n  \"type\": \"elicitation\",\n  \"title\": \"Create Channel\",\n  \"fields\": [...]\n}"
  }]
}
```

**Second Call (Complete Fields):**
```json
// Request
{
  "method": "tools/call",
  "params": {
    "name": "createChannel",
    "arguments": {
      "channelName": "my-channel",
      "isPrivate": false
    }
  }
}

// Response (Tool Result)
{
  "content": [{
    "type": "text",
    "text": "{\"success\": true, \"channelId\": \"C123\"}"
  }]
}
```

## API Reference

### ElicitationConfig

```typescript
interface ElicitationConfig {
  strategy?: 'form' | 'multi-step';
  title?: string;
  description?: string;
  fields?: ElicitationField[];
  condition?: (args: any) => boolean;
  builder?: (context: ElicitationContext) => ElicitationRequest | ElicitationStep[];
}
```

### ElicitationField

```typescript
interface ElicitationField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'email' | 'url' | 'textarea';
  description?: string;
  required?: boolean;
  defaultValue?: any;
  options?: Array<{ label: string; value: any }>;
  validation?: FieldValidation;
  placeholder?: string;
  helpText?: string;
}
```

### FieldValidation

```typescript
interface FieldValidation {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidator?: (value: any) => boolean | string;
  errorMessage?: string;
}
```

## Complete Example

See [examples/slack-with-elicitation](../../examples/slack-with-elicitation) for a complete working example.

```typescript
import { createHTTPServer, MCPServer, Tool } from "@leanmcp/core";
import { Elicitation, ElicitationFormBuilder, validation } from "@leanmcp/elicitation";

class SlackService {
  @Tool({ description: "Create a new Slack channel" })
  @Elicitation({
    title: "Create Channel",
    description: "Please provide channel details",
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
  async createChannel(args: { channelName: string; isPrivate: boolean }) {
    return {
      success: true,
      channelId: `C${Date.now()}`,
      channelName: args.channelName
    };
  }
}

// Start server
const serverFactory = () => {
  const server = new MCPServer({ name: "slack-server", version: "1.0.0" });
  server.registerService(new SlackService());
  return server.getServer();
};

await createHTTPServer(serverFactory, { port: 3000 });
```

## Error Handling

```typescript
try {
  const result = await service.createChannel({ channelName: "test" });
  console.log(result);
} catch (error) {
  console.error('Tool execution failed:', error);
}
```

If elicitation is needed, the method returns an `ElicitationRequest` object instead of throwing an error.

## Best Practices

1. **Use conditional elicitation** - Only ask when truly needed
2. **Provide sensible defaults** - Reduce user input burden
3. **Clear field labels** - Make fields self-explanatory
4. **Validate early** - Catch errors before submission
5. **Group related fields** - Use multi-step for complex forms
6. **Test thoroughly** - Test both elicitation and execution paths
7. **Use builder for complex forms** - Fluent API is more maintainable
8. **Add help text** - Guide users with helpful descriptions

## Related Packages

- [@leanmcp/core](../core) - Core MCP server functionality
- [@leanmcp/auth](../auth) - Authentication for MCP tools
- [@leanmcp/utils](../utils) - Utility functions

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [Documentation](https://github.com/LeanMCP/leanmcp-sdk#readme)
- [Example Implementation](../../examples/slack-with-elicitation)

## License

MIT
