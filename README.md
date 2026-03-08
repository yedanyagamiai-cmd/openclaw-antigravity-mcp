# openclaw-antigravity-mcp

**Bridge your [Antigravity Claude Proxy](https://www.npmjs.com/package/antigravity-claude-proxy) to any MCP client.**

Free Claude Opus 4.6, Sonnet 4.6, and Gemini 3 access through 5 MCP tools. Zero dependencies. One command setup.

[![MCP](https://img.shields.io/badge/MCP-2025--03--26-blue)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)

## What is this?

If you have [Antigravity Claude Proxy](https://www.npmjs.com/package/antigravity-claude-proxy) running locally, this MCP server lets you use Claude and Gemini models directly from **Claude Code**, **Cursor**, **Windsurf**, or any MCP-compatible client.

```
Your MCP Client ──MCP──▶ this server ──HTTP──▶ Your Antigravity Proxy ──▶ Claude/Gemini (FREE)
```

## Quick Start

### Prerequisites

You need Antigravity Claude Proxy running locally:

```bash
npm i -g antigravity-claude-proxy
acc accounts add     # add your Google account
acc start            # start proxy on localhost:8080
```

### Connect to Claude Code

Add to your MCP settings (`.mcp.json` or Claude Code settings):

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

### Connect to Cursor / Windsurf

Same config — add to your MCP settings file.

### Test Connection

```bash
npx openclaw-antigravity-mcp --test
```

## 5 Tools

| Tool | Description |
|------|-------------|
| `chat` | Chat with Claude or Gemini. Multi-turn, system prompts, model selection, temperature. |
| `reason` | Deep reasoning with extended thinking (chain-of-thought). |
| `code` | Generate, review, debug, refactor, explain, or test code. |
| `models` | List all available models on your proxy. |
| `status` | Check proxy health and account info. |

## Available Models

Through Antigravity proxy, you get access to:

| Model | Type |
|-------|------|
| `claude-opus-4-6-thinking` | Claude Opus 4.6 with extended thinking |
| `claude-sonnet-4-6-thinking` | Claude Sonnet 4.6 with extended thinking |
| `claude-sonnet-4-6` | Claude Sonnet 4.6 |
| `gemini-3-flash` | Gemini 3 Flash (fast) |
| `gemini-3-pro-low` | Gemini 3 Pro |
| `gemini-3-pro-high` | Gemini 3 Pro (high quality) |

## Configuration

Custom proxy URL or API key:

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
| `ANTIGRAVITY_URL` | `http://localhost:8080` | Your Antigravity proxy URL |
| `ANTIGRAVITY_KEY` | `test` | API key for the proxy |

## How It Works

1. This runs as a **local stdio MCP server** (no network exposure)
2. Your MCP client sends tool calls via stdin/stdout
3. This server translates them to Anthropic Messages API calls
4. Calls go to your local Antigravity proxy
5. Proxy routes to Claude/Gemini through your Google account
6. Response flows back through the same chain

**Your keys never leave your machine.** This server has zero dependencies and makes no external network calls — only to your local proxy.

## License

MIT — [OpenClaw Intelligence](https://github.com/yedanyagamiai-cmd)
