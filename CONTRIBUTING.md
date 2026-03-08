# Contributing

## Development Setup

```bash
git clone https://github.com/yedanyagamiai-cmd/openclaw-antigravity-mcp
cd openclaw-antigravity-mcp
npm install
npm run build
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Watch mode (rebuild on change) |
| `npm run build` | Build with tsup |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm test` | Run tests |
| `npm run test:coverage` | Tests with coverage report |

## Code Standards

- TypeScript strict mode
- All tool inputs validated with Zod schemas
- All errors use custom error classes from `src/errors.ts`
- Logs go to stderr (stdout reserved for MCP JSON-RPC)
- Tests required for new tools (target: 90%+ coverage)

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all checks pass: `npm run typecheck && npm run lint && npm test`
5. Submit a PR with a clear description
