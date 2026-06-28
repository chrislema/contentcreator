const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const fs = require('fs');
const path = require('path');
const os = require('os');

// Common locations CLI tools (claude, codex) get installed into. When the app
// is launched from Finder/Dock on macOS, process.env.PATH is the minimal GUI
// PATH and excludes these, so `execFile('claude', ...)` fails with ENOENT.
function extraBinDirs() {
  const home = os.homedir();
  return [
    path.join(home, '.local', 'bin'),
    path.join(home, '.npm-global', 'bin'),
    path.join(home, 'bin'),
    '/opt/homebrew/bin',
    '/usr/local/bin',
    '/usr/bin'
  ];
}

// Augment a PATH string with the extra bin dirs (appended, so user PATH wins).
function augmentedPath(basePath) {
  const sep = path.delimiter;
  const existing = (basePath || '').split(sep).filter(Boolean);
  const merged = [...existing];
  for (const dir of extraBinDirs()) {
    if (!merged.includes(dir)) merged.push(dir);
  }
  return merged.join(sep);
}

// Resolve a bare CLI name (e.g. "claude") to an absolute path by searching the
// augmented PATH. If the binary already contains a slash, or can't be found,
// it's returned unchanged so execFile can surface its own error.
function resolveCliBin(cliBin) {
  if (!cliBin || cliBin.includes(path.sep)) return cliBin;
  const dirs = augmentedPath(process.env.PATH).split(path.delimiter).filter(Boolean);
  for (const dir of dirs) {
    const candidate = path.join(dir, cliBin);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // not here, keep looking
    }
  }
  return cliBin;
}

function sanitizeModelText(value = '') {
  return String(value)
    .replace(/\0/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
}

function sanitizeMessages(messages = []) {
  return messages.map((message) => ({
    ...message,
    content: sanitizeModelText(message.content)
  }));
}

// Build a system prompt for content drafting
function buildDraftSystemPrompt({ voiceProfile, segment, frameworks, antiAiRules }) {
  const parts = [];

  parts.push('You are a content creation assistant helping draft articles, blog posts, and social content.');

  if (voiceProfile) {
    parts.push(`\n## VOICE PROFILE: ${voiceProfile.name}`);
    if (voiceProfile.identity) parts.push(`Identity: ${voiceProfile.identity}`);
    if (voiceProfile.tone) parts.push(`Tone: ${voiceProfile.tone}`);
    if (voiceProfile.sentenceStructure) parts.push(`Sentence structure: ${voiceProfile.sentenceStructure}`);
    if (voiceProfile.vocabularyTendencies) parts.push(`Vocabulary: ${voiceProfile.vocabularyTendencies}`);
    if (voiceProfile.contentPhilosophy) parts.push(`Content philosophy: ${voiceProfile.contentPhilosophy}`);
    if (voiceProfile.openingMoves) parts.push(`Opening moves: ${voiceProfile.openingMoves}`);
    if (voiceProfile.closingMoves) parts.push(`Closing moves: ${voiceProfile.closingMoves}`);
    if (voiceProfile.contractions) parts.push(`Contractions: ${voiceProfile.contractions}`);
    if (voiceProfile.punctuation) parts.push(`Punctuation: ${voiceProfile.punctuation}`);
    if (voiceProfile.audienceRelationship) parts.push(`Audience relationship: ${voiceProfile.audienceRelationship}`);
    if (voiceProfile.antiPatterns) parts.push(`Anti-patterns: ${voiceProfile.antiPatterns}`);
  }

  if (segment) {
    parts.push(`\n## TARGET AUDIENCE MICRO-SEGMENT: ${segment.name}`);
    parts.push(`Description: ${segment.description || ''}`);
    if (segment.goalPyramid) {
      parts.push('Goal Pyramid:');
      if (segment.goalPyramid.level1) parts.push(`  Level 1 (Base): ${segment.goalPyramid.level1}`);
      if (segment.goalPyramid.level2) parts.push(`  Level 2: ${segment.goalPyramid.level2}`);
      if (segment.goalPyramid.level3) parts.push(`  Level 3: ${segment.goalPyramid.level3}`);
      if (segment.goalPyramid.level4) parts.push(`  Level 4: ${segment.goalPyramid.level4}`);
    }
    if (segment.invertedPainPyramid && segment.invertedPainPyramid.length) {
      parts.push('Pain Points:');
      for (const p of segment.invertedPainPyramid) {
        parts.push(`  Pain: "${p.pain}" -> They want: "${p.invertedGoal}"`);
      }
    }
    if (segment.fourForces) {
      const f = segment.fourForces;
      parts.push(`Forces: Push=${f.push}, Magnetism=${f.magnetism}, Anxiety=${f.anxiety}, Habit=${f.habit}`);
    }
    if (segment.hiringMoments && segment.hiringMoments.length) {
      parts.push(`Hiring Moments: ${segment.hiringMoments.join('; ')}`);
    }
  }

  if (frameworks && frameworks.length) {
    parts.push('\n## ACTIVE FRAMEWORKS TO USE:');
    for (const fw of frameworks) {
      parts.push(`- ${fw.name} (${fw.type}, Stage ${fw.stage}): ${fw.description}`);
      if (fw.pairsWellWith && fw.pairsWellWith.length) {
        parts.push(`  Pairs well with: ${fw.pairsWellWith.join(', ')}`);
      }
    }
  }

  if (antiAiRules && antiAiRules.length) {
    const active = antiAiRules.filter((r) => r.active);
    if (active.length) {
      parts.push('\n## ANTI-AI RULES (never violate these):');
      const byCat = {};
      for (const r of active) {
        if (!byCat[r.category]) byCat[r.category] = [];
        byCat[r.category].push(r.rule);
      }
      for (const [cat, rules] of Object.entries(byCat)) {
        parts.push(`${cat}: ${rules.join(', ')}`);
      }
    }
  }

  parts.push('\nWrite in first person as the voice profile describes. Use the frameworks to structure the content. Target the audience segment directly. Never sound like AI-generated content.');
  parts.push('When the user provides a story, example, case study, or different take, weave it into the draft naturally. Let their material transform the piece.');

  return parts.join('\n');
}

// Call an OpenAI-compatible API
async function callOpenAICompatible(config, messages, maxTokens) {
  // Build URL: if baseUrl already ends with a version path (/v1, /v4, etc.),
  // just append /chat/completions. Otherwise append /v1/chat/completions.
  const base = config.baseUrl.replace(/\/$/, '');
  const hasVersion = /\/v\d+$/.test(base);
  const url = hasVersion
    ? `${base}/chat/completions`
    : `${base}/v1/chat/completions`;

  // GPT-5.x models require max_completion_tokens; others use max_tokens
  const isOpenAiNextGen = config.provider === 'openai' && /gpt-5/.test(config.model);
  const tokenParam = isOpenAiNextGen ? 'max_completion_tokens' : 'max_tokens';
  const body = {
    model: config.model,
    messages,
    [tokenParam]: maxTokens || config.maxOutputTokens || 8192
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300000)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// Call Anthropic API
async function callAnthropic(config, messages, maxTokens) {
  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/messages`;
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMsgs = messages.filter((m) => m.role !== 'system');

  const body = {
    model: config.model,
    max_tokens: maxTokens || config.maxOutputTokens || 8192,
    messages: chatMsgs.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

// Call a CLI-backed model (e.g., claude code, codex)
async function callCLI(config, messages, options = {}) {
  const systemMsgs = messages.filter((m) => m.role === 'system');
  const chatMsgs = messages.filter((m) => m.role !== 'system');

  // Build the conversation as a single prompt for the CLI
  const prompt = chatMsgs.map((m) => {
    if (m.role === 'assistant') return `Assistant: ${m.content}`;
    return m.content;
  }).join('\n\n');

  const systemPrompt = systemMsgs.map((m) => m.content).join('\n\n');

  // Resolve the CLI binary - try the configured path, then search common bin
  // dirs (handles Finder-launched .app having a minimal PATH).
  const cliBin = resolveCliBin(config.cliPath || 'claude');

  // Build args based on which CLI this is
  let args;
  if (cliBin.includes('claude')) {
    // Claude Code CLI: claude -p "prompt" --model <model> [--system-prompt <system>] [--add-dir <context>]
    args = ['-p', prompt];
    if (config.model) args.push('--model', config.model);

    // Enable tool use (MCP tools, etc.) - needed when Claude should interact
    // with registered MCPs during the chat
    if (options.enableTools) {
      args.push('--dangerously-skip-permissions');

      // Write MCP servers to a temp config file so the CLI can access them
      if (options.mcps && options.mcps.length > 0) {
        const mcpServers = {};
        for (const mcp of options.mcps) {
          if (!mcp.connected) continue;
          // CLI normalizes server names to lowercase - use lowercase to match
          const serverName = (mcp.name || 'mcp').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
          if (mcp.transport === 'stdio' || (mcp.command && !mcp.url)) {
            mcpServers[serverName] = {
              command: mcp.command || 'npx',
              args: mcp.args || [],
              env: mcp.env || {}
            };
          } else {
            // HTTP/SSE transport - needs type field
            const serverConfig = { type: 'http', url: mcp.url };
            const headers = {};
            if (mcp.oauth?.accessToken) {
              headers['Authorization'] = `Bearer ${mcp.oauth.accessToken}`;
            } else if (mcp.token) {
              if (mcp.authType === 'api-key') {
                headers['X-API-Key'] = mcp.token;
              } else {
                headers['Authorization'] = `Bearer ${mcp.token}`;
              }
            }
            if (Object.keys(headers).length > 0) {
              serverConfig.headers = headers;
            }
            mcpServers[serverName] = serverConfig;
          }
        }

        if (Object.keys(mcpServers).length > 0) {
          const configPath = path.join(os.tmpdir(), `cc-mcp-${Date.now()}.json`);
          fs.writeFileSync(configPath, JSON.stringify({ mcpServers }, null, 2));
          args.push('--mcp-config', configPath, '--strict-mcp-config');
        }
      }
    } else if (options.noTools) {
      // Block all MCP tools so the model just writes text without trying to call tools
      const configPath = path.join(os.tmpdir(), `cc-empty-${Date.now()}.json`);
      fs.writeFileSync(configPath, JSON.stringify({ mcpServers: {} }, null, 2));
      args.push('--mcp-config', configPath, '--strict-mcp-config');
    }

    if (options.contextDir) {
      // Use --add-dir to expose context files, then set short system prompt
      args.push('--add-dir', options.contextDir);
      args.push('--append-system-prompt', systemPrompt || options.instruction || '');
    } else if (systemPrompt) {
      args.push('--system-prompt', systemPrompt);
    }
  } else if (cliBin.includes('codex')) {
    args = [prompt];
    if (config.model) args.push('--model', config.model);
  } else {
    args = [prompt];
  }

  // Log the actual CLI command for debugging MCP issues
  if (options.enableTools) {
    console.log('[CLI MCP debug] cmd:', cliBin, args.join(' '));
  }

  const result = await execFileAsync(cliBin, args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300000,
    env: { ...process.env, PATH: augmentedPath(process.env.PATH) }
  });
  const stdout = result.stdout;

  // Log stderr warnings for debugging (permission issues, file access, etc.)
  if (result.stderr) {
    const stderr = result.stderr.trim();
    if (stderr && !/^\s*$/.test(stderr)) {
      console.warn('[CLI stderr]', stderr.slice(0, 500));
    }
  }

  // Strip CLI noise (Mem0 status lines, markdown fences, status banners)
  let cleaned = stdout.trim();
  // Remove markdown code fences
  cleaned = cleaned.replace(/```json\s*/gi, '');
  cleaned = cleaned.replace(/```\s*/g, '');
  // Remove Mem0 / status banners at start of response
  cleaned = cleaned.replace(/^Mem0[^\n]*\n+/m, '');
  // Remove any leading non-JSON, non-XML text lines (CLI banners)
  const firstBracket = cleaned.search(/[\[{]/);
  if (firstBracket > 0) {
    const beforeContent = cleaned.slice(0, firstBracket);
    // Only strip if it looks like CLI banner text (short lines, no real content)
    if (/^(Mem0|Active|user=|project=|branch=|memories=|---+|===+|\s)/m.test(beforeContent)) {
      cleaned = cleaned.slice(firstBracket);
    }
  }

  // Detect permission/access warnings the model might self-report
  const permWarn = cleaned.match(/(couldn't get|permission prompts? kept|cannot access|unable to (read|open|access)|file access)/i);
  if (permWarn) {
    console.warn('[CLI response contains access warning]:', permWarn[0]);
  }

  return cleaned.trim();
}

// Main entry: call the right backend based on connectionType
async function chatCompletion(modelConfig, messages, maxTokens, options = {}) {
  const cleanMessages = sanitizeMessages(messages);
  if (modelConfig.connectionType === 'oauth-cli') {
    return callCLI(modelConfig, cleanMessages, options);
  }
  if (modelConfig.provider === 'anthropic') {
    return callAnthropic(modelConfig, cleanMessages, maxTokens);
  }
  return callOpenAICompatible(modelConfig, cleanMessages, maxTokens);
}

module.exports = { buildDraftSystemPrompt, chatCompletion };
