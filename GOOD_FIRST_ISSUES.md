# Good First Issues for LeanMCP

Here are 10 beginner-friendly tasks to help new contributors get started with LeanMCP:

## 📖 Documentation (1-2 hours each)

### 1. Add "Common Patterns" Documentation
**What**: Create a guide showing common MCP server patterns
**Skills needed**: Technical writing, understanding of examples
**Files to modify**: `docs/common-patterns.md` (create new)
**Details**: Document patterns like authentication flows, error handling, input validation

### 2. Improve CLI Command Documentation
**What**: Add more detailed examples for each CLI command
**Skills needed**: Technical writing, CLI usage
**Files to modify**: `packages/cli/README.md`
**Details**: Add real-world examples and common use cases for each command

## 🔧 Examples (2-3 hours each)

### 3. Create Weather Service Example
**What**: Build a complete weather service with API integration
**Skills needed**: TypeScript, API integration
**Files to create**: `examples/weather-service/`
**Details**: Use OpenWeatherMap API, include error handling and input validation

### 4. Add E-commerce Product Search Example
**What**: Create a service that searches products from a mock database
**Skills needed**: TypeScript, data modeling
**Files to create**: `examples/ecommerce-search/`
**Details**: Include pagination, filtering, and product details

### 5. Build File Management Service Example
**What**: Create a service for file operations (list, read, create)
**Skills needed**: TypeScript, Node.js file system
**Files to create**: `examples/file-manager/`
**Details**: Include proper error handling and security considerations

## 🔐 Auth Integrations (3-4 hours each)

### 6. Add Firebase Auth Integration
**What**: Create Firebase authentication provider
**Skills needed**: TypeScript, Firebase SDK
**Files to create**: `packages/auth/src/providers/firebase.ts`
**Details**: Follow existing Auth0/Cognito pattern, include tests

### 7. Add Supabase Auth Integration
**What**: Create Supabase authentication provider
**Skills needed**: TypeScript, Supabase SDK
**Files to create**: `packages/auth/src/providers/supabase.ts`
**Details**: Include JWT validation and user context

## 🧪 Testing (2-3 hours each)

### 8. Add Core Decorator Tests
**What**: Write comprehensive tests for @Tool, @Prompt, @Resource decorators
**Skills needed**: TypeScript, Jest
**Files to create**: `tests/unit/decorators.test.ts`
**Details**: Test both positive and negative cases, edge cases

### 9. Add CLI Integration Tests
**What**: Write tests that verify CLI commands work end-to-end
**Skills needed**: TypeScript, Jest, CLI testing
**Files to create**: `tests/integration/cli.test.ts`
**Details**: Test project creation, service addition, build process

## 🎨 UI/UX (1-2 hours)

### 10. Improve README Visual Structure
**What**: Add more visual elements and improve readability
**Skills needed**: Markdown, design sense
**Files to modify**: `README.md`
**Details**: Add diagrams, improve section organization, add more badges

---

## How to Claim an Issue

1. Comment on the issue saying you'd like to work on it
2. A maintainer will assign it to you
3. Fork the repo and create a branch
4. Work on the issue and submit a PR
5. Get feedback and iterate

## Need Help?

- Join our [Discord](https://discord.com/invite/DsRcA3GwPy) for questions
- Check the [Contributing Guide](CONTRIBUTING.md) for detailed instructions
- Look at existing examples for patterns to follow
