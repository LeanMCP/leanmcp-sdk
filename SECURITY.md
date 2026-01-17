# Security Policy

## Supported Versions

We currently support the following versions of the LeanMCP SDK:

| Version | Supported          |
| ------- | ------------------ |
| 0.5.x   | :white_check_mark: |
| 0.4.x   | :white_check_mark: |
| < 0.4.0 | :x:                |

## Reporting a Vulnerability

We take the security of LeanMCP very seriously. If you have found a security vulnerability in LeanMCP, we appreciate your help in disclosing it to us in a responsible manner.

**Please do not report security vulnerabilities through public GitHub issues.**

### How to Report

If you believe you have found a vulnerability, please email us immediately at:

**founders@leanmcp.com**

Please include as much information as possible to help us reproduce and fix the issue, including:
- Steps to reproduce the vulnerability
- Version of LeanMCP being used
- Any relevant code snippets or configuration files

### Our Process

1.  **Response:** We will acknowledge your report within 48 hours.
2.  **Investigation:** We will investigate the issue and determine its impact.
3.  **Fix:** We will work on a fix and release a security patch as soon as possible.
4.  **Disclosure:** Once the fix is released, we will publicly disclose the vulnerability and credit you for your discovery (if you wish).

## Security Best Practices for LeanMCP Users

- **Keep Dependencies Updated:** regularly run `npm update` or use `leanmcp-sdk/scripts/publish-sync.sh` to keep your SDK versions in sync.
- **Environment Variables:** Never commit `.env` files. Use the built-in environment variable injection securely.
- **Authentication:** Always use `@leanmcp/auth` for securing your MCP servers when exposing them over the internet.

Thank you for helping keep LeanMCP safe!
