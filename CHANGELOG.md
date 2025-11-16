# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Complete package metadata for all packages (repository, homepage, bugs, keywords, author)
- Standardized exports across all packages for proper ESM/CJS support
- Input validation utilities for port numbers and file paths
- Improved CORS security configuration

### Changed
- CORS configuration now defaults to secure settings (no wildcard origins with credentials)

### Fixed
- Security vulnerability in CORS configuration
- Missing package.json metadata preventing proper NPM publication

## [0.1.0] - 2025-01-XX

### Added
- Initial release of LeanMCP SDK
- **@leanmcp/core**: Core MCP server implementation with decorators and runtime
  - `@Tool`, `@Prompt`, `@Resource` decorators for defining MCP primitives
  - `MCPServer` and `MCPServerRuntime` for server management
  - HTTP server with streamable transport
  - Automatic JSON Schema generation from TypeScript classes
  - `@SchemaConstraint` and `@Optional` decorators for schema customization
- **@leanmcp/auth**: Authentication module with provider support
  - `@Authenticated` decorator for protecting tools, prompts, and resources
  - AWS Cognito provider implementation
  - JWT token verification
  - Support for class-level and method-level authentication
- **@leanmcp/elicitation**: User input collection system
  - `@Elicitation` decorator for structured input collection
  - Form and multi-step elicitation strategies
  - Conditional field support
  - Field validation and error handling
- **@leanmcp/cli**: Command-line interface for project scaffolding
  - `leanmcp create` command for new project generation
  - `leanmcp add` command for adding new services
  - Automatic service registration in main.ts
  - TypeScript configuration generation
- **@leanmcp/utils**: Shared utility functions
  - Schema validation helpers
  - Response formatting utilities
  - Retry, debounce, and throttle functions
  - Environment variable parsing
  - String manipulation utilities

### Documentation
- Comprehensive README files for all packages
- API reference documentation
- Quick start guides
- Example implementations

### Dependencies
- TypeScript 5.x support
- Node.js 18+ compatibility
- Integration with @modelcontextprotocol/sdk
- Express.js and CORS as optional peer dependencies
