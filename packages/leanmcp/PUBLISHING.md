# Publishing the LeanMCP Meta-Package

This guide explains how to publish the `leanmcp` meta-package to npm.

## Prerequisites

1. **npm account**: You need an npm account with publish permissions
2. **Login**: Run `npm login` if you haven't already
3. **Build all packages**: Ensure all dependent packages are built

## Pre-Publishing Checklist

### 1. Build All Packages

From the monorepo root:

```bash
npm run build
```

This builds all packages including:

- `@leanmcp/core`
- `@leanmcp/auth`
- `@leanmcp/ui`
- `@leanmcp/utils`
- `@leanmcp/elicitation`
- `@leanmcp/env-injection`

### 2. Verify the Meta-Package Build

```bash
cd packages/leanmcp
npm run build
```

Check that `dist/` contains:

- `index.js` (CommonJS)
- `index.mjs` (ES Module)
- `index.d.ts` (TypeScript declarations)

### 3. Test Locally (Optional)

Link the package locally to test:

```bash
cd packages/leanmcp
npm link

# In a test project
npm link leanmcp
```

## Publishing Steps

### Option 1: Publish Individual Packages First (Recommended)

If you haven't published the individual `@leanmcp/*` packages yet:

```bash
# Publish core packages first
cd packages/core
npm publish --access public

cd ../auth
npm publish --access public

cd ../ui
npm publish --access public

cd ../utils
npm publish --access public

cd ../elicitation
npm publish --access public

cd ../env-injection
npm publish --access public

cd ../cli
npm publish --access public
```

### Option 2: Publish Meta-Package Only

If all `@leanmcp/*` packages are already published:

```bash
cd packages/leanmcp
npm publish --access public
```

## Version Management

### Updating Versions

When updating versions, ensure consistency:

1. **Update individual package versions** in their respective `package.json` files
2. **Update meta-package dependencies** in `packages/leanmcp/package.json`:
   ```json
   {
     "dependencies": {
       "@leanmcp/core": "^0.3.1", // Update to match
       "@leanmcp/auth": "^0.3.1"
       // ... etc
     }
   }
   ```
3. **Update meta-package version** to match

### Automated Version Bump

You can use npm's version command:

```bash
# In packages/leanmcp
npm version patch  # 0.3.1 -> 0.3.2
npm version minor  # 0.3.1 -> 0.4.0
npm version major  # 0.3.1 -> 1.0.0
```

## Post-Publishing

### Verify Installation

Test that users can install the package:

```bash
npm install leanmcp
```

### Test Imports

Create a test file to verify exports work:

```typescript
// test.ts
import { createHTTPServer, Tool, AuthProvider, AppProvider } from 'leanmcp';
import { HTTPTransport } from 'leanmcp/ui';
import 'leanmcp/ui/styles.css';

console.log('All imports successful!');
```

## Package Contents

The published package includes:

- `dist/` - Compiled JavaScript and TypeScript declarations
- `README.md` - Package documentation
- `LICENSE` - MIT license
- `package.json` - Package metadata

## Troubleshooting

### "Package not found" errors

Make sure all `@leanmcp/*` dependencies are published to npm first.

### Type errors during build

Check that all exported types actually exist in the source packages.

### Import errors after publishing

Verify the `exports` field in `package.json` is correctly configured.

## Continuous Integration

For automated publishing, add to your CI/CD pipeline:

```yaml
# .github/workflows/publish.yml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - run: npm install
      - run: npm run build

      - name: Publish meta-package
        run: |
          cd packages/leanmcp
          npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Support

For issues or questions:

- GitHub Issues: https://github.com/LeanMCP/leanmcp-sdk/issues
- Email: admin@leanmcp.com
