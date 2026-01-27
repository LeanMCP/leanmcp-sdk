# Tests

This directory contains tests for LeanMCP SDK.

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Test Structure

```
tests/
├── unit/           # Unit tests for individual components
├── integration/    # Integration tests
├── examples/       # Tests for example services
└── fixtures/       # Test data and fixtures
```

## Writing Tests

We use Jest for testing. Example test structure:

```typescript
import { describe, it, expect } from '@jest/globals';
import { YourService } from '../src/your-service';

describe('YourService', () => {
  it('should do something', () => {
    const service = new YourService();
    const result = service.doSomething();
    expect(result).toBe('expected');
  });
});
```

## Test Guidelines

- Write tests for all public APIs
- Include both positive and negative test cases
- Use descriptive test names
- Mock external dependencies
- Keep tests fast and isolated
