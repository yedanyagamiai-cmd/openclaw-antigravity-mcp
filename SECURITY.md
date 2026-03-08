# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Email**: openclaw-intel@proton.me
2. **Subject**: `[SECURITY] openclaw-antigravity-mcp: <brief description>`

**Do NOT open a public GitHub issue for security vulnerabilities.**

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Assessment**: Within 7 days
- **Fix release**: Within 30 days for critical issues

## Scope

This package is an MCP server that proxies requests to a local Antigravity proxy. Security concerns include:

- Input validation and sanitization
- Proxy authentication handling
- Environment variable exposure
- JSON-RPC protocol compliance
