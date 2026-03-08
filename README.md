# openclaw-antigravity-mcp

**Use Claude & Gemini for free in Claude Code, Cursor, and any MCP client.**

This is an [MCP server](https://modelcontextprotocol.io/) that bridges [Antigravity Claude Proxy](https://www.npmjs.com/package/antigravity-claude-proxy) — a local proxy that provides free access to Claude and Gemini models through your Google account — to any MCP-compatible AI coding tool.

[![npm](https://img.shields.io/npm/v/openclaw-antigravity-mcp)](https://www.npmjs.com/package/openclaw-antigravity-mcp)
[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

## What is Antigravity?

[Antigravity Claude Proxy](https://www.npmjs.com/package/antigravity-claude-proxy) is a popular open-source npm package that runs a local API proxy on your machine. It uses your Google account to access Claude (Opus 4.6, Sonnet 4.6) and Gemini (3 Flash, 3 Pro) models at **zero cost**. The proxy exposes a standard Anthropic Messages API on `localhost`.

**This MCP server** is the bridge: it translates MCP tool calls from your coding tool into Antigravity proxy API calls, so you can use these models as native MCP tools.

```
┌─────────────────┐     stdio      ┌──────────────┐     HTTP       ┌──────────────────┐
│  Claude Code /  │ ◀──────────▶   │  this MCP    │ ◀──────────▶   │  Antigravity     │
│  Cursor /       │   MCP protocol │  server       │  localhost     │  Proxy (:8080)   │
│  Windsurf       │                │  (0 deps)    │                │  → Claude/Gemini │
└─────────────────┘                └──────────────┘                └──────────────────┘
```

## Quick Start

### 1. Install & start Antigravity proxy

```bash
npm i -g antigravity-claude-proxy
acc accounts add     # add your Google account
acc start            # starts proxy on localhost:8080
```

### 2. Add to your MCP config

**Claude Code** — add to `.mcp.json` in your project root:

```json
{
  "mcpServers": {
    "antigravity": {
      "command": "npx",
      "args": ["-y", "openclaw-antigravity-mcp"]
    }
  }
}
```

**Cursor / Windsurf** — same config in your MCP settings.

### 3. Verify

```bash
npx openclaw-antigravity-mcp --test
```

Output:
```
🛸 OpenClaw Antigravity MCP — Connection Test
   Proxy: http://localhost:8080

   [1/3] Health...  ✅ ok (1 account)
   [2/3] Models...  ✅ 6 models
          • claude-opus-4-6-thinking
          • claude-sonnet-4-6-thinking
          • claude-sonnet-4-6
          • gemini-3-flash
          • gemini-3-pro-low
          • gemini-3-pro-high
   [3/3] Chat...    ✅ Response: "ok"

   Result: ✅ All tests passed (3/3)
```

That's it. Your MCP client now has 5 AI tools powered by Claude and Gemini.

## Tools

| Tool | What it does |
|------|-------------|
| **`chat`** | Chat with Claude or Gemini. Supports multi-turn conversations, system prompts, model selection, and temperature control. |
| **`reason`** | Deep reasoning with extended thinking (chain-of-thought). For complex logic, math, and multi-step problems. |
| **`code`** | AI code assistant — generate, review, debug, refactor, explain, or write tests. |
| **`models`** | List all models available on your proxy. |
| **`status`** | Check proxy health, account info, latency, and rate limits. |

## Models

| Model ID | Description |
|----------|------------|
| `claude-opus-4-6-thinking` | Claude Opus 4.6 with extended thinking |
| `claude-sonnet-4-6-thinking` | Claude Sonnet 4.6 with extended thinking |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 (fast) |
| `gemini-3-flash` | Gemini 3 Flash |
| `gemini-3-pro-low` | Gemini 3 Pro |
| `gemini-3-pro-high` | Gemini 3 Pro (high quality) |

## Configuration

Custom proxy URL or API key via environment variables:

```json
{
  "mcpServers": {
    "antigravity": {
      "command": "npx",
      "args": ["-y", "openclaw-antigravity-mcp"],
      "env": {
        "ANTIGRAVITY_URL": "http://localhost:3000",
        "ANTIGRAVITY_KEY": "my-key"
      }
    }
  }
}
```

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTIGRAVITY_URL` | `http://localhost:8080` | Antigravity proxy URL |
| `ANTIGRAVITY_KEY` | `test` | API key for the proxy |

## Architecture

- **Transport**: stdio (stdin/stdout JSON-RPC) — the standard for local MCP servers
- **Dependencies**: zero — pure Node.js `>=18`, uses built-in `fetch` and `readline`
- **Network**: only connects to your local Antigravity proxy (no external calls)
- **Security**: your API keys and Google credentials never leave your machine

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to proxy` | Run `acc start` to start Antigravity proxy |
| `Auth expired` | Re-login in the Antigravity app, then restart proxy |
| `No models returned` | Check `acc accounts list` — you need at least one Google account |
| Timeout after 30s | Proxy may be overloaded — restart with `acc start` |

## FAQ

**Q: Is this actually free?**
Yes. Antigravity proxy uses your Google account's free-tier access to Claude and Gemini. This MCP server adds no cost on top of that.

**Q: Is this safe?**
Yes. This server runs locally, has zero dependencies, and only talks to `localhost`. It never contacts any external server. Review the source — it's a single `index.js` file.

**Q: What's the difference from using Claude API directly?**
The Claude API requires a paid API key. Antigravity proxy provides the same models through your Google account at no cost. This MCP server makes those models available as native tools in your coding environment.

## License

MIT — [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd)
