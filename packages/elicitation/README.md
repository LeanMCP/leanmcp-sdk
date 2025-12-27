<p align="center">
  <img
    src="https://raw.githubusercontent.com/LeanMCP/leanmcp-sdk/refs/heads/main/assets/logo.svg"
    alt="LeanMCP Logo"
    width="400"
  />
</p>

<p align="center">
  <strong>@leanmcp/elicitation</strong><br/>
  Structured user input collection for MCP tools using the elicitation protocol.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@leanmcp/elicitation">
    <img src="https://img.shields.io/npm/v/@leanmcp/elicitation" alt="npm version" />
  </a>
  <a href="https://www.npmjs.com/package/@leanmcp/elicitation">
    <img src="https://img.shields.io/npm/dm/@leanmcp/elicitation" alt="npm downloads" />
  </a>
  <a href="https://docs.leanmcp.com/sdk/elicitation">
    <img src="https://img.shields.io/badge/Docs-leanmcp-0A66C2?" />
  </a>
  <a href="https://discord.com/invite/DsRcA3GwPy">
    <img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" />
  </a>
  <a href="https://x.com/LeanMcp">
    <img src="https://img.shields.io/badge/@LeanMCP-f5f5f5?logo=x&logoColor=000000" />
  </a>
</p>

## Features

- **@Elicitation Decorator** — Automatically collect missing user inputs before tool execution
- **Fluent Builder API** — Programmatic form creation with `ElicitationFormBuilder`
- **Multiple Strategies** — Form and multi-step elicitation
- **Built-in Validation** — min/max, pattern matching, custom validators
- **Conditional Elicitation** — Only ask for inputs when needed

## Installation

```bash
npm install @leanmcp/elicitation @leanmcp/core
```

## Quick Start

### Simple Form Elicitation

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
    return { success: true, channelName: args.channelName };
  }
}
```

### How It Works

1. **Client calls tool** with missing required fields
2. **Decorator intercepts** and checks for missing fields
3. **Elicitation request returned** with form definition
4. **Client displays form** to collect user input
5. **Client calls tool again** with complete arguments
6. **Method executes** normally

---

## Fluent Builder API

For more complex forms, use `ElicitationFormBuilder`:

```typescript
import { Tool } from "@leanmcp/core";
import { Elicitation, ElicitationFormBuilder, validation } from "@leanmcp/elicitation";

class UserService {
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
    return { success: true, email: args.email };
  }
}
```

### Builder Methods

| Method | Description |
|--------|-------------|
| `title(string)` | Set form title |
| `description(string)` | Set form description |
| `condition(fn)` | Set condition for elicitation |
| `addTextField(name, label, opts?)` | Add text input |
| `addTextAreaField(name, label, opts?)` | Add textarea |
| `addNumberField(name, label, opts?)` | Add number input |
| `addBooleanField(name, label, opts?)` | Add checkbox |
| `addSelectField(name, label, options, opts?)` | Add dropdown |
| `addMultiSelectField(name, label, options, opts?)` | Add multi-select |
| `addEmailField(name, label, opts?)` | Add email input |
| `addUrlField(name, label, opts?)` | Add URL input |
| `addDateField(name, label, opts?)` | Add date picker |
| `addCustomField(field)` | Add custom field |
| `build()` | Build final config |

---

## Conditional Elicitation

Only ask for inputs when needed:

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

---

## Multi-Step Elicitation

Break input collection into sequential steps:

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

---

## Field Types

| Type | Description |
|------|-------------|
| `text` | Single-line text input |
| `textarea` | Multi-line text area |
| `number` | Numeric input |
| `boolean` | Checkbox |
| `select` | Dropdown (single choice) |
| `multiselect` | Multi-select |
| `email` | Email input |
| `url` | URL input |
| `date` | Date picker |

---

## Validation

### Built-in Validation

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

---

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

---

## Best Practices

1. **Use conditional elicitation** — Only ask when truly needed
2. **Provide sensible defaults** — Reduce user input burden
3. **Clear field labels** — Make fields self-explanatory
4. **Validate early** — Catch errors before submission
5. **Use builder for complex forms** — Fluent API is more maintainable

---

## Documentation

- [Full Documentation](https://docs.leanmcp.com/sdk/elicitation)

## Related Packages

- [@leanmcp/core](https://www.npmjs.com/package/@leanmcp/core) — Core MCP server functionality
- [@leanmcp/auth](https://www.npmjs.com/package/@leanmcp/auth) — Authentication decorators
- [@leanmcp/cli](https://www.npmjs.com/package/@leanmcp/cli) — CLI for project scaffolding

## Links

- [GitHub Repository](https://github.com/LeanMCP/leanmcp-sdk)
- [NPM Package](https://www.npmjs.com/package/@leanmcp/elicitation)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

## License

MIT
