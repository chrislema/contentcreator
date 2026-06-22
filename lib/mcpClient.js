// MCP Client - Streamable HTTP transport
// Supports the MCP protocol with initialize handshake, then tools/list and tools/call

function buildHeaders(mcp, includeAccept) {
  const headers = {};
  if (includeAccept) {
    headers['Accept'] = 'application/json, text/event-stream';
  }
  if (mcp.token) {
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
    description: t.description || ''
  }));

  return {
    connected: true,
    toolCount: tools.length,
    tools
  };
}

// Call a specific MCP tool
async function callTool(mcp, toolName, args) {
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
