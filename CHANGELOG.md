# Changelog

## 2.0.0 (2026-03-08)

### Breaking Changes

- Rewritten in TypeScript with strict mode
- Node.js >= 20 required (was >= 18)
- Binary entry point changed from `index.js` to `dist/cli.js`

### Added

- Official `@modelcontextprotocol/sdk` integration
- Zod input validation on all tools
- Custom error hierarchy (AuthError, ConnectionError, TimeoutError)
- Exponential backoff retry (3 attempts for transient failures)
- Structured JSON logging to stderr
- `--test` CLI with 4-step connection verification
- `--help` and `--version` CLI flags
- 90%+ test coverage with Vitest
- TypeScript declarations (.d.ts) for library usage
- SECURITY.md, CONTRIBUTING.md

### Changed

- Proxy client extracted to reusable module
- Tool handlers split into individual files
- Error messages are human-readable with actionable fixes

### Removed

- Zero-dependency claim (now uses MCP SDK + Zod)
- Default API key "test" (must set ANTIGRAVITY_KEY explicitly)

## 1.2.0 (2026-03-08)

- README rewrite with architecture diagram and FAQ
- Improved error messages with `parseProxyError()`

## 1.1.0 (2026-03-08)

- Enhanced `--test` CLI with numbered steps
- Better proxy error parsing

## 1.0.0 (2026-03-08)

- Initial release: 5 tools (chat, reason, code, models, status)
- Pure JavaScript, zero dependencies
- stdio transport, MCP protocol 2025-03-26
