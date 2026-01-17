# LeanMCP SDK - Release & Versioning Guide

## Table of Contents
1. [Versioning Strategy](#versioning-strategy)
2. [Release Process](#release-process)
3. [Git Tags & Releases](#git-tags--releases)
4. [Best Practices for Open Source SDKs](#best-practices-for-open-source-sdks)
5. [Troubleshooting](#troubleshooting)

---

## Versioning Strategy

### Synchronized Versioning (Recommended)

All packages in the SDK share the **same version number**. This approach:
- Simplifies dependency management
- Makes it clear which versions work together
- Follows patterns used by major projects (React, Angular, Vue)

```
@leanmcp/core    → 0.5.0
@leanmcp/auth    → 0.5.0
@leanmcp/cli     → 0.5.0
@leanmcp/ui      → 0.5.0
... all packages → 0.5.0
```

### Semantic Versioning (SemVer)

We follow [Semantic Versioning 2.0.0](https://semver.org/):

| Version Part | When to Bump | Example |
|--------------|--------------|---------|
| **MAJOR** (x.0.0) | Breaking changes | Removing APIs, changing behavior |
| **MINOR** (0.x.0) | New features (backwards compatible) | Adding new functions, options |
| **PATCH** (0.0.x) | Bug fixes (backwards compatible) | Fixing bugs, security patches |

### Pre-release Versions

For testing before stable releases:

```bash
# Alpha (early testing)
./scripts/publish-sync.sh 0.5.0-alpha.1

# Beta (feature complete, testing)
./scripts/publish-sync.sh 0.5.0-beta.1

# Release Candidate (final testing)
./scripts/publish-sync.sh 0.5.0-rc.1
```

---

## Release Process

### Quick Release (Recommended)

Use the synchronized publish script:

```bash
# Patch release (bug fixes): 0.4.0 → 0.4.1
./scripts/publish-sync.sh patch

# Minor release (new features): 0.4.0 → 0.5.0
./scripts/publish-sync.sh minor

# Major release (breaking changes): 0.4.0 → 1.0.0
./scripts/publish-sync.sh major

# Specific version
./scripts/publish-sync.sh 0.5.0
```

The script automatically:
1. Updates all package versions
2. Updates internal `@leanmcp/*` dependencies
3. Builds all packages
4. Publishes to npm
5. Creates git commit
6. Creates git tag `vX.Y.Z`
7. Pushes to remote

### Manual Release (Step by Step)

If you need more control:

```bash
# 1. Update versions in all package.json files
# 2. Update internal dependencies

# 3. Build all packages
npm run build --workspaces

# 4. Publish each package (in dependency order)
cd packages/utils && npm publish --access public
cd packages/env-injection && npm publish --access public
cd packages/elicitation && npm publish --access public
cd packages/auth && npm publish --access public
cd packages/core && npm publish --access public
cd packages/ui && npm publish --access public
cd packages/cli && npm publish --access public
cd packages/leanmcp && npm publish --access public

# 5. Git commit and tag
git add -A
git commit -m "chore: release v0.5.0"
git tag -a v0.5.0 -m "Release v0.5.0"
git push && git push --tags
```

---

## Git Tags & Releases

### Tag Naming Convention

| Tag Format | Purpose | Example |
|------------|---------|---------|
| `vX.Y.Z` | Stable release | `v0.5.0`, `v1.0.0` |
| `vX.Y.Z-alpha.N` | Alpha pre-release | `v0.5.0-alpha.1` |
| `vX.Y.Z-beta.N` | Beta pre-release | `v0.5.0-beta.1` |
| `vX.Y.Z-rc.N` | Release candidate | `v0.5.0-rc.1` |

### Creating GitHub Releases

After publishing:

1. Go to **GitHub → Releases → Draft new release**
2. Select the tag `vX.Y.Z`
3. Title: `v0.5.0`
4. Description (use template below):

```markdown
## What's New

### Features
- Feature 1 description
- Feature 2 description

### Bug Fixes
- Fixed issue with X
- Resolved Y problem

### Breaking Changes
- Changed API for Z (migration guide below)

## Migration Guide

If upgrading from v0.4.x:
```js
// Old
import { oldFunction } from '@leanmcp/core';

// New
import { newFunction } from '@leanmcp/core';
```

## Installation

```bash
npm install @leanmcp/core@0.5.0
```

## Package Versions

| Package | Version |
|---------|---------|
| @leanmcp/core | 0.5.0 |
| @leanmcp/auth | 0.5.0 |
| @leanmcp/cli | 0.5.0 |
| @leanmcp/ui | 0.5.0 |
```

---

## Best Practices for Open Source SDKs

### 1. Documentation

**Essential Documentation:**
- [ ] **README.md** - Quick start, installation, basic usage
- [ ] **API Reference** - Auto-generated from JSDoc/TSDoc
- [ ] **Migration Guides** - For each major version
- [ ] **Examples** - Working code examples
- [ ] **CHANGELOG.md** - Document all changes

**Tools:**
- [TypeDoc](https://typedoc.org/) for TypeScript API docs
- [Docusaurus](https://docusaurus.io/) for documentation sites
- [Conventional Commits](https://www.conventionalcommits.org/) for automatic changelogs

### 2. Versioning & Dependencies

**Do:**
- ✅ Use synchronized versions across all packages
- ✅ Pin internal dependencies with `^` (e.g., `"@leanmcp/core": "^0.5.0"`)
- ✅ Use `peerDependencies` for framework dependencies (React, etc.)
- ✅ Test dependency combinations before release

**Don't:**
- ❌ Let packages drift to different versions
- ❌ Use `*` or `latest` for dependencies
- ❌ Break peer dependency compatibility

### 3. Testing

**Required Tests:**
```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests between packages
├── e2e/            # End-to-end tests
└── compatibility/  # Version compatibility tests
```

**CI/CD Pipeline:**
```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [18, 20, 22]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
      - run: npm run build
```

### 4. Code Quality

**Essential Tools:**
- **TypeScript** - Type safety
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks for pre-commit checks

**package.json scripts:**
```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "prepublishOnly": "npm run lint && npm run test && npm run build"
  }
}
```

### 5. Security

**Best Practices:**
- ✅ Run `npm audit` regularly
- ✅ Use Dependabot for dependency updates
- ✅ Add `SECURITY.md` with vulnerability reporting process
- ✅ Never commit secrets or API keys
- ✅ Use `.npmignore` to exclude sensitive files

**SECURITY.md template:**
```markdown
# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities to: security@leanmcp.com

Do NOT open public issues for security vulnerabilities.

We will respond within 48 hours and work with you to resolve the issue.
```

### 6. Community & Support

**Essential Files:**
- `CONTRIBUTING.md` - How to contribute
- `CODE_OF_CONDUCT.md` - Community standards
- `SUPPORT.md` - How to get help
- Issue templates - Bug reports, feature requests
- PR templates - Checklist for contributors

**Communication Channels:**
- GitHub Discussions for Q&A
- Discord for community chat
- Twitter/X for announcements

### 7. Release Cadence

**Recommended Schedule:**
| Release Type | Frequency | Contents |
|--------------|-----------|----------|
| Patch | As needed | Bug fixes, security |
| Minor | Monthly | New features |
| Major | Quarterly/Yearly | Breaking changes |

**Release Checklist:**
- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Migration guide (if breaking)
- [ ] Announce on Discord/Twitter

### 8. Backwards Compatibility

**Guidelines:**
1. **Deprecate before removing** - Mark old APIs as deprecated for 1-2 minor versions
2. **Provide migration paths** - Document how to upgrade
3. **Support LTS versions** - Maintain older major versions with security patches

**Deprecation Example:**
```typescript
/**
 * @deprecated Use `newFunction()` instead. Will be removed in v2.0.0
 */
export function oldFunction() {
  console.warn('oldFunction is deprecated. Use newFunction() instead.');
  return newFunction();
}
```

---

## Troubleshooting

### Common Issues

**npm publish 403 error:**
```
npm error 403 You cannot publish over the previously published versions
```
Solution: Version already exists. Bump version and try again.

**Peer dependency conflicts:**
```
npm error ERESOLVE could not resolve
```
Solution: Ensure all `@leanmcp/*` peer dependencies use compatible versions.

**Build failures during publish:**
Solution: Run builds locally first to catch errors:
```bash
npm run build --workspaces
```

### Rollback a Release

If you publish a broken version:

```bash
# Unpublish (only within 72 hours)
npm unpublish @leanmcp/core@0.5.0

# Or deprecate (preferred)
npm deprecate @leanmcp/core@0.5.0 "This version has issues. Please use 0.5.1"
```

---

## Summary

| Task | Command |
|------|---------|
| Patch release | `./scripts/publish-sync.sh patch` |
| Minor release | `./scripts/publish-sync.sh minor` |
| Major release | `./scripts/publish-sync.sh major` |
| Specific version | `./scripts/publish-sync.sh 0.5.0` |
| Check current version | `node -p "require('./packages/core/package.json').version"` |

**Golden Rules:**
1. All packages = same version
2. Test before publish
3. Document everything
4. Never break backwards compatibility without major version bump
