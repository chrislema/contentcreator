// MCP Client - Supports both Streamable HTTP and stdio transports
// Supports the MCP protocol with initialize handshake, then tools/list and tools/call

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// When launched from Finder/Dock on macOS, process.env.PATH is the minimal GUI
// PATH and excludes the dirs that `npx`/node and CLI tools install into. Append
// the common locations so stdio MCP servers can actually spawn.
function augmentedPath(basePath) {
  const home = os.homedir();
  const extras = [
    path.join(home, '.local', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin'
  ];
  const merged = (basePath || '').split(path.delimiter).filter(Boolean);
  for (const dir of extras) {
    if (!merged.includes(dir)) merged.push(dir);
  }
  return merged.join(path.delimiter);
}

function buildHeaders(mcp, includeAccept) {
  const headers = {};
  if (includeAccept) {
    headers['Accept'] = 'application/json, text/event-stream';
  }
  // OAuth token takes precedence
  if (mcp.oauth?.accessToken) {
    headers['Authorization'] = `Bearer ${mcp.oauth.accessToken}`;
  } else if (mcp.token) {
    if (mcp.authType === 'api-key') {
      headers['X-API-Key'] = mcp.token;
    } else {
      headers['Authorization'] = `Bearer ${mcp.token}`;
    }
  }
  return headers;
}

function nextId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// Parse SSE stream and extract the final JSON-RPC response
async function parseSseResponse(res) {
  const contentType = res.headers.get('content-type') || '';

  // If plain JSON, just parse it
  if (contentType.includes('application/json')) {
    return await res.json();
  }

  // If SSE stream, read till we get our result
  if (contentType.includes('text/event-stream')) {
    const text = await res.text();
    const events = text.split('\n\n');
    for (const evt of events) {
      const dataLines = evt
        .split('\n')
        .filter((l) => l.startsWith('data:'))
        .map((l) => l.slice(5).trim());
      if (dataLines.length) {
        try {
          const parsed = JSON.parse(dataLines.join('\n'));
          if (parsed.result || parsed.error) return parsed;
        } catch {}
      }
    }
  }

  // Fallback: try to read as text and parse
  const text = await res.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response format: ${contentType}`);
  }
}

// ── Stdio transport ─────────────────────────────
// Spawns a subprocess and communicates over JSON-RPC on stdin/stdout

const stdioProcs = {}; // mcp.id -> { proc, buffer, pending }

async function stdioEnsure(mcp) {
  const key = mcp.id || mcp.command;
  if (stdioProcs[key] && stdioProcs[key].proc && !stdioProcs[key].proc.killed) {
    return stdioProcs[key];
  }

  return new Promise((resolve, reject) => {
    const cmd = mcp.command || 'npx';
    const args = mcp.args || ['-y', 'contentstudio-mcp'];
    const env = { ...process.env, ...(mcp.env || {}) };
    env.PATH = augmentedPath(env.PATH || process.env.PATH);

    const proc = spawn(cmd, args, {
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: cmd === 'bash' || cmd === 'sh' || cmd.includes(' ')
    });

    const entry = { proc, buffer: '', pending: {} };

    proc.stdout.on('data', (chunk) => {
      entry.buffer += chunk.toString();
      // Parse complete JSON-RPC messages (newline-delimited)
      let nl;
      while ((nl = entry.buffer.indexOf('\n')) >= 0) {
        const line = entry.buffer.slice(0, nl).trim();
        entry.buffer = entry.buffer.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id !== undefined && entry.pending[msg.id]) {
            entry.pending[msg.id](msg);
            delete entry.pending[msg.id];
          }
        } catch {}
      }
    });

    let stderrBuf = '';
    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
    });

    proc.on('error', (err) => {
      delete stdioProcs[key];
      reject(new Error(`Failed to spawn ${cmd}: ${err.message}`));
    });

    proc.on('exit', (code) => {
      delete stdioProcs[key];
      if (code !== null && code !== 0 && stderrBuf.trim()) {
        // Notify any pending requests
        for (const id of Object.keys(entry.pending)) {
          entry.pending[id]({ error: { message: `Process exited (code ${code}): ${stderrBuf.slice(0, 200)}` } });
          delete entry.pending[id];
        }
      }
    });

    // Wait briefly to ensure process starts
    setTimeout(() => {
      if (proc.killed || proc.exitCode !== null) {
        reject(new Error(`Process exited immediately. ${stderrBuf.slice(0, 300)}`));
      } else {
        stdioProcs[key] = entry;
        resolve(entry);
      }
    }, 500);
  });
}

function stdioSend(mcp, msg) {
  return stdioEnsure(mcp).then((entry) => {
    return new Promise((resolve, reject) => {
      entry.pending[msg.id] = resolve;
      entry.proc.stdin.write(JSON.stringify(msg) + '\n');
      // Timeout after 30s
      setTimeout(() => {
        if (entry.pending[msg.id]) {
          delete entry.pending[msg.id];
          reject(new Error('stdio MCP request timed out'));
        }
      }, 30000);
    });
  });
}

// ── Transport dispatch ───────────────────────────

function isStdio(mcp) {
  return mcp.transport === 'stdio' || (mcp.command && !mcp.url);
}

// Initialize handshake - must happen before tools/list
async function initialize(mcp) {
  const url = mcp.url.replace(/\/$/, '');
  const id = nextId();

  const body = JSON.stringify({
    jsonrpc: '2.0',
    id,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'ContentCreator', version: '1.0.0' }
    }
  });

  const res = await fetch(url, {
    method: 'POST',
    headers: { ...buildHeaders(mcp, true), 'Content-Type': 'application/json' },
    body
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Initialize failed: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await parseSseResponse(res);
  return data;
}

// Send initialized notification (required after initialize)
async function sendInitialized(mcp) {
  const url = mcp.url.replace(/\/$/, '');

  await fetch(url, {
    method: 'POST',
    headers: { ...buildHeaders(mcp, true), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized'
    })
  }).catch(() => {});
}

// Test connection and list available tools
async function connectMcp(mcp) {
  if (isStdio(mcp)) {
    return connectStdio(mcp);
  }
  return connectHttp(mcp);
}

async function connectStdio(mcp) {
  const initParams = {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'ContentCreator', version: '1.0.0' }
  };

  // Step 1: Initialize
  const initResp = await stdioSend(mcp, { jsonrpc: '2.0', id: nextId(), method: 'initialize', params: initParams });
  if (initResp.error) throw new Error(initResp.error.message || 'Initialize failed');

  // Step 2: Send initialized notification (no response expected)
  try {
    stdioProcs[mcp.id || mcp.command].proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  } catch {}

  // Step 3: List tools
  const listResp = await stdioSend(mcp, { jsonrpc: '2.0', id: nextId(), method: 'tools/list', params: {} });
  if (listResp.error) throw new Error(listResp.error.message || 'tools/list failed');

  const tools = (listResp.result?.tools || []).map((t) => ({
    name: t.name,
    description: t.description || '',
    inputSchema: t.inputSchema || { type: 'object', properties: {} }
  }));

  return { connected: true, toolCount: tools.length, tools };
}

async function connectHttp(mcp) {
  // Step 1: Initialize handshake
  await initialize(mcp);

  // Step 2: Send initialized notification
  await sendInitialized(mcp);

  // Step 3: List tools
  const url = mcp.url.replace(/\/$/, '');
  const id = nextId();

  const res = await fetch(url, {
    method: 'POST',
    headers: { ...buildHeaders(mcp, true), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/list',
      params: {}
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`tools/list failed: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await parseSseResponse(res);

  const tools = (data.result?.tools || []).map((t) => ({
    name: t.name,
    description: t.description || '',
    inputSchema: t.inputSchema || { type: 'object', properties: {} }
  }));

  return {
    connected: true,
    toolCount: tools.length,
    tools
  };
}

// Call a specific MCP tool
async function callTool(mcp, toolName, args) {
  if (isStdio(mcp)) {
    const resp = await stdioSend(mcp, { jsonrpc: '2.0', id: nextId(), method: 'tools/call', params: { name: toolName, arguments: args || {} } });
    if (resp.error) throw new Error(resp.error.message || 'Tool call error');
    if (resp.result?.content) {
      return resp.result.content.filter((c) => c.type === 'text').map((c) => c.text).join('\n');
    }
    return JSON.stringify(resp.result || resp, null, 2);
  }

  const url = mcp.url.replace(/\/$/, '');
  const id = nextId();

  const res = await fetch(url, {
    method: 'POST',
    headers: { ...buildHeaders(mcp, true), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: 'tools/call',
      params: { name: toolName, arguments: args || {} }
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Tool call failed: HTTP ${res.status} ${errText.slice(0, 200)}`);
  }

  const data = await parseSseResponse(res);

  if (data.error) {
    throw new Error(data.error.message || 'Tool call error');
  }

  // Extract text content from result
  if (data.result?.content) {
    return data.result.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text)
      .join('\n');
  }

  return JSON.stringify(data.result || data, null, 2);
}

// Use a model to interpret a natural language query, pick the right MCP tool, and execute
async function queryMcp(mcp, mcpTools, userQuery, modelConfig) {
  const toolList = mcpTools.map((t) => `- ${t.name}: ${t.description}`).join('\n');

  const sysPrompt = `You are an MCP tool orchestrator. The user wants to interact with "${mcp.name}" which has these tools available:

${toolList}

Based on the user's request, determine which tool to call and what arguments to pass. Return ONLY valid JSON with this shape:
{"tool": "tool_name", "arguments": {"key": "value"}}

If no tool fits the request, return: {"error": "reason"}`;

  const { chatCompletion } = require('./modelClient');
  const toolResponse = await chatCompletion(modelConfig, [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: userQuery }
  ], 1024);

  let toolPlan;
  try {
    const jsonMatch = toolResponse.match(/\{[\s\S]*\}/);
    toolPlan = JSON.parse(jsonMatch ? jsonMatch[0] : toolResponse);
  } catch {
    return { error: 'Could not determine which MCP tool to use', raw: toolResponse };
  }

  if (toolPlan.error) {
    return { error: toolPlan.error };
  }

  const result = await callTool(mcp, toolPlan.tool, toolPlan.arguments);

  const formatted = await chatCompletion(modelConfig, [
    { role: 'system', content: `You are formatting the result of an MCP tool call from "${mcp.name}" (tool: ${toolPlan.tool}). Present the result in a clean, readable way for the user.` },
    { role: 'user', content: `User asked: "${userQuery}"\n\nTool result:\n${result}` }
  ], 2048);

  return {
    tool: toolPlan.tool,
    arguments: toolPlan.arguments,
    rawResult: result,
    formatted
  };
}

module.exports = { connectMcp, callTool, queryMcp };
