#!/usr/bin/env node
/**
 * openclaw-antigravity-mcp — Bridge your Antigravity proxy to any MCP client
 *
 * Connect your own Antigravity Claude Proxy to Claude Code, Cursor, Windsurf,
 * or any MCP-compatible client. Get free Claude & Gemini access via MCP tools.
 *
 * Zero dependencies. Pure Node.js >= 18.
 *
 * Environment:
 *   ANTIGRAVITY_URL  — Proxy URL (default: http://localhost:8080)
 *   ANTIGRAVITY_KEY  — API key (default: test)
 *
 * Usage:
 *   npx openclaw-antigravity-mcp          # start MCP server (stdio)
 *   npx openclaw-antigravity-mcp --test   # test proxy connection
 *   npx openclaw-antigravity-mcp --help   # show help
 *
 * License: MIT | OpenClaw Intelligence
 */

const PROXY_URL = process.env.ANTIGRAVITY_URL || 'http://localhost:8080';
const PROXY_KEY = process.env.ANTIGRAVITY_KEY || 'test';

const SERVER_INFO = { name: 'openclaw-antigravity-mcp', version: '1.0.0' };
const PROTOCOL_VERSION = '2025-03-26';

// ── Tool Definitions ────────────────────────────────────────────

const TOOLS = [
  {
    name: 'chat',
    description:
      'Chat with Claude or Gemini models through your Antigravity proxy. ' +
      'Supports multi-turn conversations, system prompts, and temperature control. ' +
      'Models: claude-opus-4-6-thinking, claude-sonnet-4-6-thinking, gemini-3-flash, gemini-3-pro-high, and more.',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Your message' },
        model: {
          type: 'string',
          description:
            'Model to use (default: claude-sonnet-4-6-thinking). Options: claude-opus-4-6-thinking, claude-sonnet-4-6-thinking, claude-sonnet-4-6, gemini-3-flash, gemini-3-pro-low, gemini-3-pro-high',
        },
        system: { type: 'string', description: 'System prompt' },
        history: {
          type: 'array',
          description: 'Conversation history [{role, content}]',
          items: {
            type: 'object',
            properties: {
              role: { type: 'string', enum: ['user', 'assistant'] },
              content: { type: 'string' },
            },
            required: ['role', 'content'],
          },
        },
        temperature: { type: 'number', description: '0.0-1.0 (default: 0.7)' },
        max_tokens: { type: 'integer', description: 'Max tokens (default: 4096)' },
      },
      required: ['message'],
    },
  },
  {
    name: 'reason',
    description:
      'Deep reasoning with extended thinking. Uses Claude or Gemini thinking models ' +
      'to solve complex logic, math, coding, and multi-step problems. ' +
      'Returns both the thinking process and final answer.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'Question requiring deep reasoning' },
        model: {
          type: 'string',
          description: 'Thinking model (default: claude-sonnet-4-6-thinking)',
        },
        context: { type: 'string', description: 'Background context' },
      },
      required: ['question'],
    },
  },
  {
    name: 'code',
    description:
      'AI-powered code assistant. Generate, review, debug, refactor, explain, ' +
      'or write tests for code. Uses Claude or Gemini through your Antigravity proxy.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          enum: ['generate', 'review', 'debug', 'refactor', 'explain', 'test'],
          description: 'Task type',
        },
        instruction: { type: 'string', description: 'What to do (for generate)' },
        code: { type: 'string', description: 'Code to work with (for review/debug/refactor/explain/test)' },
        language: { type: 'string', description: 'Programming language' },
        model: { type: 'string', description: 'Model (default: claude-sonnet-4-6-thinking)' },
      },
      required: ['task'],
    },
  },
  {
    name: 'models',
    description: 'List all available models on your Antigravity proxy.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'status',
    description: 'Check your Antigravity proxy health, account info, and rate limits.',
    inputSchema: { type: 'object', properties: {} },
  },
];

// ── Proxy Communication ─────────────────────────────────────────

async function proxyFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(`${PROXY_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${PROXY_KEY}`,
        ...options.headers,
      },
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Proxy ${res.status}: ${text.slice(0, 500)}`);
    }
    return res.json();
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Proxy timeout (30s). Is your proxy running?');
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

async function proxyChat(model, messages, system, maxTokens = 4096, temperature = 0.7) {
  const body = {
    model: model || 'claude-sonnet-4-6-thinking',
    max_tokens: maxTokens,
    messages,
  };
  if (system) body.system = system;
  if (temperature !== undefined && temperature !== 0.7) body.temperature = temperature;

  return proxyFetch('/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
}

async function proxyModels() {
  return proxyFetch('/v1/models');
}

async function proxyHealth() {
  return proxyFetch('/health');
}

// ── Tool Handlers ───────────────────────────────────────────────

function extractText(response) {
  if (!response || !response.content) return JSON.stringify(response);
  return response.content
    .map((block) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'thinking') return `<thinking>\n${block.thinking}\n</thinking>`;
      return JSON.stringify(block);
    })
    .join('\n\n');
}

async function handleChat(args) {
  const messages = [];
  if (args.history) messages.push(...args.history);
  messages.push({ role: 'user', content: args.message });

  const result = await proxyChat(
    args.model,
    messages,
    args.system,
    args.max_tokens || 4096,
    args.temperature
  );

  return {
    model: result.model || args.model || 'claude-sonnet-4-6-thinking',
    response: extractText(result),
    usage: result.usage || null,
    stop_reason: result.stop_reason || null,
  };
}

async function handleReason(args) {
  const model = args.model || 'claude-sonnet-4-6-thinking';
  const messages = [
    {
      role: 'user',
      content: args.context
        ? `Context: ${args.context}\n\nQuestion: ${args.question}`
        : args.question,
    },
  ];

  const result = await proxyChat(model, messages, 'Think step by step. Show your complete reasoning process before giving the final answer.', 8192, 0.3);

  const fullText = extractText(result);
  let thinking = '';
  let answer = fullText;

  // Try to separate thinking from answer
  const thinkMatch = fullText.match(/<thinking>([\s\S]*?)<\/thinking>/);
  if (thinkMatch) {
    thinking = thinkMatch[1].trim();
    answer = fullText.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
  }

  return {
    model: result.model || model,
    thinking: thinking || '(embedded in response)',
    answer,
    usage: result.usage || null,
  };
}

async function handleCode(args) {
  const prompts = {
    generate: `Generate clean, production-ready ${args.language || ''} code:\n${args.instruction || 'No instruction provided'}`,
    review: `Review this ${args.language || ''} code for bugs, security issues, and improvements:\n\`\`\`\n${args.code || ''}\n\`\`\`${args.instruction ? `\n\nFocus on: ${args.instruction}` : ''}`,
    debug: `Debug this ${args.language || ''} code. Find the root cause and provide the fix:\n\`\`\`\n${args.code || ''}\n\`\`\`${args.instruction ? `\n\nError/issue: ${args.instruction}` : ''}`,
    refactor: `Refactor this ${args.language || ''} code for better readability and performance:\n\`\`\`\n${args.code || ''}\n\`\`\`${args.instruction ? `\n\nGoal: ${args.instruction}` : ''}`,
    explain: `Explain this ${args.language || ''} code clearly:\n\`\`\`\n${args.code || ''}\n\`\`\``,
    test: `Write comprehensive tests for this ${args.language || ''} code:\n\`\`\`\n${args.code || ''}\n\`\`\``,
  };

  const prompt = prompts[args.task] || prompts.generate;
  const model = args.model || 'claude-sonnet-4-6-thinking';

  const result = await proxyChat(
    model,
    [{ role: 'user', content: prompt }],
    'You are an expert software engineer. Be concise and precise.',
    8192,
    args.task === 'generate' ? 0.5 : 0.3
  );

  return {
    model: result.model || model,
    task: args.task,
    result: extractText(result),
    usage: result.usage || null,
  };
}

async function handleModels() {
  try {
    const data = await proxyModels();
    const models = data.data || data.models || data;
    return {
      proxy_url: PROXY_URL,
      models: Array.isArray(models)
        ? models.map((m) => ({ id: m.id || m, name: m.name || m.id || m }))
        : models,
    };
  } catch (e) {
    return { error: e.message, proxy_url: PROXY_URL, hint: 'Is your Antigravity proxy running? Try: acc start' };
  }
}

async function handleStatus() {
  try {
    const health = await proxyHealth();
    return { proxy_url: PROXY_URL, status: 'connected', ...health };
  } catch (e) {
    return {
      proxy_url: PROXY_URL,
      status: 'disconnected',
      error: e.message,
      hint: 'Start your proxy: npx antigravity-claude-proxy start',
    };
  }
}

// ── MCP Protocol ────────────────────────────────────────────────

function jsonRpc(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function jsonRpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

function toolContent(data) {
  return { content: [{ type: 'text', text: typeof data === 'string' ? data : JSON.stringify(data, null, 2) }] };
}

function toolErr(msg) {
  return { content: [{ type: 'text', text: JSON.stringify({ error: msg }) }], isError: true };
}

async function handleRequest(req) {
  const { method, id, params } = req;

  switch (method) {
    case 'initialize':
      return jsonRpc(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
      });

    case 'notifications/initialized':
      return null;

    case 'tools/list':
      return jsonRpc(id, { tools: TOOLS });

    case 'tools/call': {
      const name = params?.name;
      const args = params?.arguments || {};
      try {
        let result;
        switch (name) {
          case 'chat':
            result = await handleChat(args);
            break;
          case 'reason':
            result = await handleReason(args);
            break;
          case 'code':
            result = await handleCode(args);
            break;
          case 'models':
            result = await handleModels();
            break;
          case 'status':
            result = await handleStatus();
            break;
          default:
            return jsonRpc(id, toolErr(`Unknown tool: ${name}`));
        }
        return jsonRpc(id, toolContent(result));
      } catch (e) {
        return jsonRpc(id, toolErr(e.message));
      }
    }

    case 'ping':
      return jsonRpc(id, {});

    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`);
  }
}

// ── Stdio Transport ─────────────────────────────────────────────

async function runStdio() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, terminal: false });

  let buffer = '';
  let pending = 0;
  let closing = false;

  function maybeExit() {
    if (closing && pending === 0) process.exit(0);
  }

  rl.on('line', async (line) => {
    buffer += line;
    let req;
    try {
      req = JSON.parse(buffer);
      buffer = '';
    } catch {
      // might be multi-line JSON, keep buffering
      return;
    }

    pending++;
    try {
      const res = await handleRequest(req);
      if (res) {
        process.stdout.write(JSON.stringify(res) + '\n');
      }
    } catch (e) {
      // Unexpected error — still respond
      process.stdout.write(
        JSON.stringify(jsonRpcError(req.id, -32603, e.message)) + '\n'
      );
    } finally {
      pending--;
      maybeExit();
    }
  });

  rl.on('close', () => {
    closing = true;
    maybeExit();
  });
}

// ── CLI ─────────────────────────────────────────────────────────

async function runTest() {
  console.log('🛸 OpenClaw Antigravity MCP — Connection Test');
  console.log(`   Proxy: ${PROXY_URL}`);
  console.log('');

  // Test health
  process.stdout.write('   Health... ');
  try {
    const h = await proxyHealth();
    console.log(`✅ ${h.status || 'ok'} (${h.accounts?.available || '?'} accounts)`);
  } catch (e) {
    console.log(`❌ ${e.message}`);
    console.log('\n   Fix: Make sure Antigravity proxy is running:');
    console.log('     npm i -g antigravity-claude-proxy');
    console.log('     acc accounts add');
    console.log('     acc start');
    process.exit(1);
  }

  // Test models
  process.stdout.write('   Models... ');
  try {
    const m = await proxyModels();
    const models = m.data || m.models || [];
    console.log(`✅ ${Array.isArray(models) ? models.length : '?'} models available`);
    if (Array.isArray(models)) {
      models.forEach((model) => console.log(`     • ${model.id || model}`));
    }
  } catch (e) {
    console.log(`⚠️  ${e.message}`);
  }

  // Test chat
  process.stdout.write('   Chat...   ');
  try {
    const r = await proxyChat('claude-sonnet-4-6', [{ role: 'user', content: 'Say "ok" and nothing else.' }], null, 10);
    console.log(`✅ ${extractText(r).slice(0, 50)}`);
  } catch (e) {
    console.log(`⚠️  ${e.message.slice(0, 80)}`);
  }

  console.log('\n   Ready! Add to your MCP config:');
  console.log('   {');
  console.log('     "mcpServers": {');
  console.log('       "antigravity": {');
  console.log('         "command": "npx",');
  console.log('         "args": ["-y", "openclaw-antigravity-mcp"]');
  console.log('       }');
  console.log('     }');
  console.log('   }');
}

function showHelp() {
  console.log(`
🛸 openclaw-antigravity-mcp v${SERVER_INFO.version}

Bridge your Antigravity Claude Proxy to any MCP client.
Free Claude & Gemini access through MCP tools.

USAGE
  npx openclaw-antigravity-mcp          Start MCP server (stdio)
  npx openclaw-antigravity-mcp --test   Test proxy connection
  npx openclaw-antigravity-mcp --help   Show this help

SETUP
  1. Install Antigravity:  npm i -g antigravity-claude-proxy
  2. Add account:          acc accounts add
  3. Start proxy:          acc start
  4. Add to MCP config:
     {
       "mcpServers": {
         "antigravity": {
           "command": "npx",
           "args": ["-y", "openclaw-antigravity-mcp"]
         }
       }
     }

ENVIRONMENT
  ANTIGRAVITY_URL   Proxy URL (default: http://localhost:8080)
  ANTIGRAVITY_KEY   API key (default: test)

TOOLS
  chat     Chat with Claude/Gemini (multi-turn, system prompts)
  reason   Deep reasoning with extended thinking
  code     Generate, review, debug, refactor, explain, test code
  models   List available models
  status   Check proxy health

MIT License | OpenClaw Intelligence | github.com/yedanyagamiai-cmd/openclaw-antigravity-mcp
`);
}

// ── Entry Point ─────────────────────────────────────────────────

const arg = process.argv[2];
if (arg === '--test' || arg === 'test') {
  runTest().catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  });
} else if (arg === '--help' || arg === '-h' || arg === 'help') {
  showHelp();
} else {
  // Default: stdio MCP server
  runStdio();
}
