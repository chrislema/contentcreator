const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const { createCollection, createDocument } = require('./lib/store');
const seed = require('./lib/seedData');
const { parseAudienceMarkdown, parseVoiceProfileMarkdown, parsePlatformProfileMarkdown, makeId } = require('./lib/parser');
const { buildDraftSystemPrompt, chatCompletion } = require('./lib/modelClient');
const { connectMcp, queryMcp, callTool } = require('./lib/mcpClient');
const { runOAuthFlow, refreshToken } = require('./lib/mcpOAuth');
const { gatherAll, buildTopicPrompt } = require('./lib/topicIntelligence');

let win;

// Stores (initialized in createWindow)
let settingsStore, frameworksStore, antiAiStore, voiceProfilesStore, platformProfilesStore;
let audiencesStore, topicsStore, draftsStore, distributionsStore, existingContentStore;

function status(text) {
  if (win && !win.isDestroyed()) win.webContents.send('app:status', text);
}

// Write errors to a log file for debugging
function logError(source, error) {
  const dir = getDataDir();
  const logPath = path.join(dir, '..', 'error.log');
  const entry = `[${new Date().toISOString()}] ${source}: ${error.message || error}\n${error.stack || ''}\n\n`;
  try {
    fs.appendFileSync(logPath, entry);
  } catch {}
}

const ANALYTICS_ENRICHMENT_VERSION = 2;
let nextBackgroundJobId = 1;
const backgroundJobs = new Map();

function ensureNoBackgroundJob(key, label) {
  const running = backgroundJobs.get(key);
  if (running) {
    const error = new Error(`${label} is already running. Started at ${running.startedAt}.`);
    error.code = 'JOB_ALREADY_RUNNING';
    status(error.message);
    throw error;
  }
}

function startBackgroundJob(key, label, task) {
  ensureNoBackgroundJob(key, label);
  const job = {
    id: `${key}-${nextBackgroundJobId++}`,
    key,
    label,
    startedAt: new Date().toISOString()
  };
  backgroundJobs.set(key, job);

  Promise.resolve()
    .then(() => task(job))
    .catch((e) => {
      logError(`${key}:background`, e);
      status(`${label} failed: ${e.message}`);
    })
    .finally(() => {
      if (backgroundJobs.get(key) === job) backgroundJobs.delete(key);
    });

  return job;
}

function logAnalyticsEvent(event) {
  try {
    const logPath = path.join(getDataDir(), '..', 'analytics-enrichment.log');
    const entry = {
      ts: new Date().toISOString(),
      ...event
    };
    const title = entry.title ? ` "${entry.title}"` : '';
    const result = entry.ok ? `ok rows=${entry.rowsReturned ?? 0}/${entry.rowCount ?? 0}` : `error=${entry.error || 'unknown'}`;
    console.log(`[analytics-enrichment] ${entry.label || 'event'}${title}: ${result}`);
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
  } catch {}
}

function analyticsRows(data) {
  return Array.isArray(data?.data?.rows) ? data.data.rows : [];
}

function analyticsRowCount(data) {
  return data?.data?.rowCount ?? analyticsRows(data).length;
}

function toInteger(value) {
  const parsed = parseInt(value ?? 0, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNumber(value) {
  const parsed = parseFloat(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dimensionValue(row, index, key) {
  if (!row) return '';
  if (row[key] !== undefined && row[key] !== null) return String(row[key]);
  if (row.dimensionValues?.[index]?.value !== undefined) return String(row.dimensionValues[index].value);
  if (Array.isArray(row.dimensions) && row.dimensions[index] !== undefined) return String(row.dimensions[index]);
  if (row.dimensions && typeof row.dimensions === 'object' && row.dimensions[key] !== undefined) return String(row.dimensions[key]);
  if (Array.isArray(row.keys) && row.keys[index] !== undefined) return String(row.keys[index]);
  return '';
}

function metricValue(row, index, key) {
  if (!row) return 0;
  if (row[key] !== undefined && row[key] !== null) return row[key];
  if (row.metricValues?.[index]?.value !== undefined) return row.metricValues[index].value;
  if (Array.isArray(row.metrics) && row.metrics[index]?.value !== undefined) return row.metrics[index].value;
  if (row.metrics && typeof row.metrics === 'object' && row.metrics[key] !== undefined) return row.metrics[key];
  return 0;
}

function gaPageFilter(pagePath) {
  return {
    filter: {
      fieldName: 'pagePath',
      stringFilter: {
        matchType: 'EXACT',
        value: pagePath
      }
    }
  };
}

function needsAnalyticsRefresh(article) {
  const analytics = article.analytics;
  if (!analytics) return true;
  if (analytics.enrichmentVersion !== ANALYTICS_ENRICHMENT_VERSION) return true;
  return analytics.status === 'failed' || (Array.isArray(analytics.errors) && analytics.errors.length > 0);
}

async function callAnalyticsTool(article, analytics, googleMcp, label, toolName, args) {
  const logBase = {
    articleId: article.id,
    title: article.title,
    pagePath: article.pagePath,
    publicUrl: article.publicUrl,
    label,
    toolName,
    args
  };

  try {
    const raw = await callTool(googleMcp, toolName, args);
    const data = JSON.parse(raw);
    const rows = analyticsRows(data);

    analytics.callStatus[label] = {
      ok: true,
      rowCount: analyticsRowCount(data),
      rowsReturned: rows.length
    };

    logAnalyticsEvent({
      ...logBase,
      ok: true,
      rowCount: analyticsRowCount(data),
      rowsReturned: rows.length,
      firstRow: rows[0] || null
    });

    return data;
  } catch (e) {
    const message = e.message || String(e);
    analytics.errors.push({ label, message });
    analytics.callStatus[label] = { ok: false, error: message };
    logAnalyticsEvent({ ...logBase, ok: false, error: message });
    return null;
  }
}

// Parse a markdown article with optional YAML front matter
function parseArticle(text, filename) {
  let title = filename;
  let date = null;
  let tags = [];
  let description = '';
  let body = text;

  // Parse YAML front matter (between --- delimiters)
  const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (fmMatch) {
    const fm = fmMatch[1];
    body = text.slice(fmMatch[0].length);

    // Extract fields from front matter
    const titleM = fm.match(/^title:\s*"?([^"\n]+)"?/m);
    if (titleM) title = titleM[1].trim();

    const dateM = fm.match(/^date:\s*(.+)$/m);
    if (dateM) date = dateM[1].trim();

    const tagsM = fm.match(/^tags:\s*\[([^\]]*)\]/m);
    if (tagsM) {
      tags = tagsM[1].split(',').map((t) => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
    }

    const descM = fm.match(/^description:\s*"?([^"\n]*(?:\n[^"\n]*)*)"?/m);
    if (descM) description = descM[1].trim();
  } else {
    // No front matter - try H1
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
      body = body.replace(/^#\s+.+\n?/m, '');
    }
  }

  body = body.trim();

  // Use description as excerpt, or fall back to body
  const excerpt = description || (body.slice(0, 300).trim() + (body.length > 300 ? '...' : ''));

  return {
    id: makeId(),
    title,
    date,
    tags,
    description,
    excerpt,
    body,
    source: filename,
    importedAt: new Date().toISOString()
  };
}

function getDataDir() {
  return path.join(app.getPath('userData'), 'data');
}

// Seed data on first run
function seedIfNeeded() {
  const dir = getDataDir();
  if (frameworksStore.list().length === 0) {
    frameworksStore.setAll(seed.FRAMEWORKS);
  }
  if (antiAiStore.list().length === 0) {
    antiAiStore.setAll(seed.ANTI_AI_RULES);
  }
  if (Object.keys(settingsStore.get()).length === 0) {
    settingsStore.set({ profile: seed.DEFAULT_PROFILE });
  }
  if (voiceProfilesStore.list().length === 0) {
    voiceProfilesStore.setAll([seed.VOICE_PROFILE]);
  }
  if (platformProfilesStore.list().length === 0) {
    platformProfilesStore.setAll([seed.PLATFORM_PROFILE]);
  }
  if (audiencesStore.list().length === 0) {
    // Flatten seed data: each microSegment becomes a standalone audience
    const flatAudiences = [];
    for (const doc of seed.AUDIENCES) {
      for (const ms of (doc.microSegments || [])) {
        flatAudiences.push({
          ...ms,
          source: doc.name,
          id: ms.id || makeId()
        });
      }
    }
    // If seed had no nesting (already flat), use as-is
    audiencesStore.setAll(flatAudiences.length > 0 ? flatAudiences : seed.AUDIENCES);
  }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1117',
    title: 'ContentCreator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.setMenuBarVisibility(false);
  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'https:') {
        shell.openExternal(url).catch((e) => logError('window:openExternal', e));
      }
    } catch {}
    return { action: 'deny' };
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  const dir = getDataDir();
  settingsStore = createDocument(path.join(dir, 'settings.json'));
  frameworksStore = createCollection(path.join(dir, 'frameworks.json'));
  antiAiStore = createCollection(path.join(dir, 'antiAi.json'));
  voiceProfilesStore = createCollection(path.join(dir, 'voiceProfiles.json'));
  platformProfilesStore = createCollection(path.join(dir, 'platformProfiles.json'));
  audiencesStore = createCollection(path.join(dir, 'audiences.json'));
  topicsStore = createCollection(path.join(dir, 'topics.json'));
  draftsStore = createCollection(path.join(dir, 'drafts.json'));
  distributionsStore = createCollection(path.join(dir, 'distributions.json'));
  existingContentStore = createCollection(path.join(dir, 'existingContent.json'));

  seedIfNeeded();
}

// ── IPC: Settings ────────────────────────────────────────────────
ipcMain.handle('settings:get', () => settingsStore.get());
ipcMain.handle('settings:patch', (_e, partial) => {
  const doc = settingsStore.patch(partial);
  status('Settings saved');
  return doc;
});

// ── IPC: Models ──────────────────────────────────────────────────
ipcMain.handle('models:list', () => {
  const s = settingsStore.get();
  return s.models || [];
});
ipcMain.handle('models:add', (_e, model) => {
  const s = settingsStore.get();
  const models = s.models || [];
  const record = { ...model, id: makeId() };
  models.push(record);
  settingsStore.patch({ models });
  status('Model added');
  return record;
});
ipcMain.handle('models:update', (_e, id, patch) => {
  const s = settingsStore.get();
  const models = (s.models || []).map((m) => (m.id === id ? { ...m, ...patch, id } : m));
  settingsStore.patch({ models });
  status('Model updated');
  return models.find((m) => m.id === id);
});
ipcMain.handle('models:remove', (_e, id) => {
  const s = settingsStore.get();
  const models = (s.models || []).filter((m) => m.id !== id);
  // Clear default if the removed model was the default
  const patch = { models };
  if (s.defaultModelId === id) patch.defaultModelId = '';
  settingsStore.patch(patch);
  status('Model removed');
  return models;
});
ipcMain.handle('models:test', async (_e, modelId, message) => {
  const s = settingsStore.get();
  const model = (s.models || []).find((m) => m.id === modelId);
  if (!model) throw new Error('Model not found');

  status('Testing model...');
  try {
    const response = await chatCompletion(model, [
      { role: 'user', content: message || 'Say "Model connected and working" in one sentence.' }
    ], 256);
    status('Model test complete');
    return { connected: true, response };
  } catch (e) {
    status('Model test failed: ' + e.message);
    logError('models:test', e);
    return { connected: false, error: e.message };
  }
});

// ── IPC: Frameworks ──────────────────────────────────────────────
ipcMain.handle('frameworks:list', () => frameworksStore.list());
ipcMain.handle('frameworks:toggle', (_e, id) => {
  const fw = frameworksStore.get(id);
  if (fw) {
    frameworksStore.add({ ...fw, active: !fw.active });
    return frameworksStore.get(id);
  }
  return null;
});
ipcMain.handle('frameworks:add', (_e, fw) => {
  const record = { ...fw, id: makeId(), custom: true, active: true };
  frameworksStore.add(record);
  status('Framework added');
  return record;
});
ipcMain.handle('frameworks:remove', (_e, id) => {
  frameworksStore.remove(id);
  status('Framework removed');
  return frameworksStore.list();
});

// ── IPC: MCPs ────────────────────────────────────────────────────
ipcMain.handle('mcps:list', () => {
  const s = settingsStore.get();
  return s.mcps || [];
});
ipcMain.handle('mcps:add', (_e, mcp) => {
  const s = settingsStore.get();
  const mcps = s.mcps || [];
  const record = { ...mcp, id: makeId() };
  mcps.push(record);
  settingsStore.patch({ mcps });
  status('MCP added');
  return record;
});
ipcMain.handle('mcps:update', (_e, id, patch) => {
  const s = settingsStore.get();
  const mcps = (s.mcps || []).map((m) => (m.id === id ? { ...m, ...patch, id } : m));
  settingsStore.patch({ mcps });
  status('MCP updated');
  return mcps.find((m) => m.id === id);
});
ipcMain.handle('mcps:remove', (_e, id) => {
  const s = settingsStore.get();
  const mcps = (s.mcps || []).filter((m) => m.id !== id);
  settingsStore.patch({ mcps });
  status('MCP removed');
  return mcps;
});
ipcMain.handle('mcps:connect', async (_e, id) => {
  const s = settingsStore.get();
  let mcp = (s.mcps || []).find((m) => m.id === id);
  if (!mcp) throw new Error('MCP not found');

  status(`Connecting to ${mcp.name}...`);

  // For HTTP MCPs with oauth auth type, get OAuth token first
  if (mcp.transport !== 'stdio' && mcp.authType === 'oauth') {
    // If we have a stored token, try refreshing it first
    if (mcp.oauth?.refreshToken) {
      try {
        status(`Refreshing ${mcp.name} token...`);
        const { discoverMetadata } = require('./lib/mcpOAuth');
        const metadata = await discoverMetadata(mcp.url);
        const tokens = await refreshToken(metadata, mcp.oauth.clientId, mcp.oauth.refreshToken);
        mcp = {
          ...mcp,
          oauth: {
            ...mcp.oauth,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || mcp.oauth.refreshToken,
            expiresAt: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : null
          }
        };
        const mcps1 = (settingsStore.get().mcps || []).map((m) => m.id === id ? mcp : m);
        settingsStore.patch({ mcps: mcps1 });
      } catch {
        // Refresh failed, need full OAuth flow
      }
    }

    // If no valid token, run the full OAuth flow
    if (!mcp.oauth?.accessToken) {
      try {
        const tokens = await runOAuthFlow(mcp.url, (msg) => status(msg));
        mcp = { ...mcp, oauth: tokens };
        const mcps1 = (settingsStore.get().mcps || []).map((m) =>
          m.id === id ? mcp : m
        );
        settingsStore.patch({ mcps: mcps1 });
      } catch (e) {
        const mcps = (settingsStore.get().mcps || []).map((m) =>
          m.id === id ? { ...m, connected: false, toolCount: 0, tools: [], lastError: e.message } : m
        );
        settingsStore.patch({ mcps });
        status(`OAuth failed: ${e.message}`);
        throw e;
      }
    }
  }

  try {
    const result = await connectMcp(mcp);
    const mcps = (settingsStore.get().mcps || []).map((m) =>
      m.id === id ? { ...mcp, connected: true, toolCount: result.toolCount, tools: result.tools, lastConnected: new Date().toISOString(), lastError: null } : m
    );
    settingsStore.patch({ mcps });
    status(`Connected to ${mcp.name}: ${result.toolCount} tools available`);
    return result;
  } catch (e) {
    const mcps = (settingsStore.get().mcps || []).map((m) =>
      m.id === id ? { ...mcp, connected: false, toolCount: 0, tools: [], lastError: e.message } : m
    );
    settingsStore.patch({ mcps });
    status(`Connection failed: ${e.message}`);
    throw e;
  }
});
ipcMain.handle('mcps:disconnect', (_e, id) => {
  const s = settingsStore.get();
  const mcps = (s.mcps || []).map((m) =>
    m.id === id ? { ...m, connected: false, toolCount: 0, tools: [] } : m
  );
  settingsStore.patch({ mcps });
  const mcp = mcps.find((m) => m.id === id);
  status(`Disconnected from ${mcp.name}`);
  return mcps.find((m) => m.id === id);
});
ipcMain.handle('mcps:query', async (_e, mcpId, query, modelId) => {
  const s = settingsStore.get();
  const mcp = (s.mcps || []).find((m) => m.id === mcpId);
  if (!mcp) throw new Error('MCP not found');
  if (!mcp.connected) throw new Error('MCP not connected. Click Connect first.');

  const model = (s.models || []).find((m) => m.id === modelId);
  if (!model) throw new Error('No model configured for query interpretation');

  status(`Querying ${mcp.name}...`);
  const result = await queryMcp(mcp, mcp.tools || [], query, model);
  status(`Query complete`);
  return result;
});

// ── IPC: Anti-AI Rules ───────────────────────────────────────────
ipcMain.handle('antiAi:list', () => antiAiStore.list());
ipcMain.handle('antiAi:toggle', (_e, id) => {
  const rule = antiAiStore.get(id);
  if (rule) {
    antiAiStore.add({ ...rule, active: !rule.active });
    return antiAiStore.get(id);
  }
  return null;
});
ipcMain.handle('antiAi:add', (_e, rule) => {
  const record = { ...rule, id: makeId(), custom: true, active: true };
  antiAiStore.add(record);
  status('Anti-AI rule added');
  return record;
});
ipcMain.handle('antiAi:remove', (_e, id) => {
  antiAiStore.remove(id);
  status('Anti-AI rule removed');
  return antiAiStore.list();
});

// ── IPC: Voice Profiles ──────────────────────────────────────────
ipcMain.handle('voiceProfiles:list', () => voiceProfilesStore.list());
ipcMain.handle('voiceProfiles:add', (_e, vp) => {
  const record = { ...vp, id: makeId() };
  voiceProfilesStore.add(record);
  status('Voice profile added');
  return record;
});
ipcMain.handle('voiceProfiles:remove', (_e, id) => {
  voiceProfilesStore.remove(id);
  return voiceProfilesStore.list();
});

// ── IPC: Platform Profiles ───────────────────────────────────────
ipcMain.handle('platformProfiles:list', () => platformProfilesStore.list());
ipcMain.handle('platformProfiles:add', (_e, pp) => {
  const record = { ...pp, id: makeId() };
  platformProfilesStore.add(record);
  status('Platform profile added');
  return record;
});
ipcMain.handle('platformProfiles:remove', (_e, id) => {
  platformProfilesStore.remove(id);
  return platformProfilesStore.list();
});

// ── IPC: Audiences ───────────────────────────────────────────────
ipcMain.handle('audiences:list', () => audiencesStore.list());
ipcMain.handle('audiences:get', (_e, id) => audiencesStore.get(id));
ipcMain.handle('audiences:add', (_e, aud) => {
  const record = { ...aud, id: makeId() };
  audiencesStore.add(record);
  status('Audience added');
  return record;
});
ipcMain.handle('audiences:update', (_e, id, patch) => {
  const existing = audiencesStore.get(id);
  if (!existing) throw new Error('Audience not found');
  const merged = { ...existing, ...patch, id };
  audiencesStore.add(merged);
  status('Audience updated');
  return merged;
});
ipcMain.handle('audiences:remove', (_e, id) => {
  audiencesStore.remove(id);
  status('Audience removed');
  return audiencesStore.list();
});

// ── IPC: Import ──────────────────────────────────────────────────
ipcMain.handle('import:file', async (_e, type) => {
  const result = await dialog.showOpenDialog(win, {
    filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return null;

  const filePath = result.filePaths[0];
  const text = fs.readFileSync(filePath, 'utf8');
  const filename = path.basename(filePath);

  if (type === 'audience') {
    const audiences = parseAudienceMarkdown(text, filename);
    if (!audiences || audiences.length === 0) {
      status('No audience segments found in file');
      return null;
    }
    for (const aud of audiences) {
      audiencesStore.add(aud);
    }
    status(`Imported ${audiences.length} audience segments from ${filename}`);
    return audiences[0];
  }
  if (type === 'voice') {
    const vp = parseVoiceProfileMarkdown(text);
    voiceProfilesStore.add(vp);
    status(`Imported voice profile: ${vp.name}`);
    return vp;
  }
  if (type === 'platform') {
    const pp = parsePlatformProfileMarkdown(text);
    platformProfilesStore.add(pp);
    status(`Imported platform profile: ${pp.name}`);
    return pp;
  }
  return null;
});

// ── IPC: Existing Content ───────────────────────────────────────
ipcMain.handle('existing:list', () => existingContentStore.list());
ipcMain.handle('existing:add', (_e, article) => {
  const record = {
    id: makeId(),
    title: article.title || 'Untitled',
    excerpt: article.excerpt || '',
    body: article.body || '',
    source: article.source || '',
    importedAt: new Date().toISOString()
  };
  existingContentStore.add(record);
  status(`Added: ${record.title}`);
  return record;
});
ipcMain.handle('existing:update', (_e, id, patch) => {
  const existing = existingContentStore.get(id);
  if (!existing) throw new Error('Article not found');
  const merged = { ...existing, ...patch, id };
  existingContentStore.add(merged);
  return merged;
});
ipcMain.handle('existing:remove', (_e, id) => {
  existingContentStore.remove(id);
  status('Article removed');
  return existingContentStore.list();
});
ipcMain.handle('existing:importFiles', async () => {
  const result = await dialog.showOpenDialog(win, {
    title: 'Import Articles',
    filters: [{ name: 'Markdown/Text', extensions: ['md', 'txt', 'markdown'] }],
    properties: ['openFile', 'multiSelections']
  });
  if (result.canceled || !result.filePaths.length) return null;

  const imported = [];
  for (const filePath of result.filePaths) {
    const text = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath, path.extname(filePath));
    const record = parseArticle(text, filename);
    existingContentStore.add(record);
    imported.push(record);
  }
  status(`Imported ${imported.length} article${imported.length === 1 ? '' : 's'}`);
  return imported;
});

// Extract plain text from a Lexical JSON body structure
function extractLexicalText(body) {
  if (!body || typeof body !== 'object') return '';
  const parts = [];
  function walk(node) {
    if (!node) return;
    if (node.text) {
      parts.push(node.text);
      return;
    }
    if (node.children) {
      for (const child of node.children) walk(child);
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      parts.push('\n\n');
    }
  }
  if (body.root) walk(body.root);
  else walk(body);
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim();
}

ipcMain.handle('existing:syncMcp', async () => {
  const s = settingsStore.get();
  const payloadMcp = (s.mcps || []).find((m) => m.connected && m.name && m.name.toLowerCase().includes('payload'));
  if (!payloadMcp) throw new Error('Payload CMS MCP not connected. Connect it in Settings > MCPs first.');

  status('Fetching AI-tagged posts from CMS...');

  // Fetch all AI-tagged posts (paginate)
  let allPosts = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await callTool(payloadMcp, 'find_posts', {
      limit: 100,
      page,
      where: { tags: { contains: 'ai' } }
    });
    const data = JSON.parse(result);
    allPosts = allPosts.concat(data.docs || []);
    hasMore = data.hasNextPage;
    page++;
  }

  status(`Found ${allPosts.length} AI-tagged posts in CMS. Syncing...`);

  // Build title index of local articles (normalized for matching)
  const localArticles = existingContentStore.list();
  const titleIndex = {};
  for (const a of localArticles) {
    const normalized = (a.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
    if (normalized) titleIndex[normalized] = a;
  }

  let tagsUpdated = 0;
  let imported = 0;

  for (const post of allPosts) {
    const normalizedTitle = (post.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
    const match = normalizedTitle ? titleIndex[normalizedTitle] : null;

    if (match) {
      // Update tags if they differ
      const currentTags = JSON.stringify(match.tags || []);
      const newTags = JSON.stringify(post.tags || []);
      if (currentTags !== newTags) {
        await existingContentStore.add({
          ...match,
          tags: post.tags || [],
          date: post.date || match.date
        });
        tagsUpdated++;
      }
    } else {
      // Import new article
      const body = extractLexicalText(post.body);
      const record = {
        id: makeId(),
        title: post.title || 'Untitled',
        date: post.date || null,
        tags: post.tags || [],
        description: post.description || '',
        excerpt: post.description || (body.slice(0, 300).trim() + (body.length > 300 ? '...' : '')),
        body,
        source: post.slug || '',
        importedAt: new Date().toISOString()
      };
      existingContentStore.add(record);
      imported++;
    }
  }

  const msg = `Synced: ${tagsUpdated} tags updated, ${imported} new articles imported`;
  status(msg);
  return { tagsUpdated, imported, total: allPosts.length };
});

// Fetch public URLs for AI-tagged articles via Payload CMS MCP (one-time setup)
ipcMain.handle('existing:fetchUrls', async () => {
  const s = settingsStore.get();
  const payloadMcp = (s.mcps || []).find((m) => m.connected && m.name && m.name.toLowerCase().includes('payload'));
  if (!payloadMcp) throw new Error('Payload CMS MCP not connected. Connect it in Settings > MCPs first.');

  const articles = existingContentStore.list();
  const aiArticles = articles.filter((a) => (a.tags || []).includes('ai'));
  const needingUrls = aiArticles.filter((a) => !a.publicUrl);

  if (needingUrls.length === 0) {
    return { updated: 0, skipped: aiArticles.length, total: aiArticles.length };
  }

  status(`Fetching URLs for ${needingUrls.length} articles...`);

  // Fetch all AI-tagged posts from CMS once (paginate)
  let allPosts = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const result = await callTool(payloadMcp, 'find_posts', {
      limit: 100,
      page,
      where: { tags: { contains: 'ai' } }
    });
    const data = JSON.parse(result);
    allPosts = allPosts.concat(data.docs || []);
    hasMore = data.hasNextPage;
    page++;
  }

  // Build slug index by normalized title
  const slugIndex = {};
  for (const post of allPosts) {
    const normalized = (post.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
    if (normalized) slugIndex[normalized] = post.slug || '';
  }

  let updated = 0;
  let notFound = 0;

  for (const article of needingUrls) {
    const normalized = (article.title || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ' ');
    const slug = slugIndex[normalized];
    if (slug) {
      existingContentStore.add({
        ...article,
        slug,
        pagePath: '/' + slug,
        publicUrl: 'https://chrislema.com/' + slug
      });
      updated++;
    } else {
      notFound++;
    }
  }

  status(`URLs fetched: ${updated} updated, ${notFound} not found in CMS`);
  return { updated, notFound, total: aiArticles.length };
});

// Enrich articles with analytics data from Google MCP (GA4 + GSC)
ipcMain.handle('existing:enrichAnalytics', async () => {
  const s = settingsStore.get();
  const googleMcp = (s.mcps || []).find((m) => m.connected && /google/i.test(m.name));
  if (!googleMcp) throw new Error('Google MCP not connected. Connect it in Settings > MCPs first.');

  const articles = existingContentStore.list();
  const withUrls = articles.filter((a) => a.pagePath && (a.tags || []).includes('ai'));
  const needingEnrichment = withUrls.filter(needsAnalyticsRefresh);

  if (needingEnrichment.length === 0) {
    return { enriched: 0, skipped: withUrls.length, total: withUrls.length };
  }

  const job = startBackgroundJob(
    'existing:enrichAnalytics',
    'Analytics enrichment',
    () => enrichAnalyticsInBackground(needingEnrichment, googleMcp)
  );

  status(`Enriching ${needingEnrichment.length} articles with analytics...`);
  return { started: true, jobId: job.id, count: needingEnrichment.length };
});

// Background analytics enrichment - fetches GA4 + GSC data per article
async function enrichAnalyticsInBackground(articles, googleMcp) {
  let done = 0;
  const total = articles.length;

  for (const article of articles) {
    try {
      status(`Enriching ${done + 1}/${total}: ${article.title.slice(0, 50)}...`);

      const pagePath = article.pagePath;
      const publicUrl = article.publicUrl || (article.slug ? `https://chrislema.com/${article.slug}` : '');
      const analytics = {
        enrichmentVersion: ANALYTICS_ENRICHMENT_VERSION,
        enrichedAt: new Date().toISOString(),
        provider: 'Google MCP',
        dateRanges: {
          traffic: '30daysAgo..yesterday',
          dimensions: '90daysAgo..yesterday',
          search: '28daysAgo..yesterday'
        },
        callStatus: {},
        warnings: [],
        errors: []
      };

      // GA4: last 30 days traffic + engagement
      const ga30 = await callAnalyticsTool(article, analytics, googleMcp, 'ga4_30d', 'ga4_run_report', {
        dimensions: ['pagePath'],
        metrics: ['screenPageViews', 'activeUsers', 'averageSessionDuration', 'engagementRate'],
        start_date: '30daysAgo',
        end_date: 'yesterday',
        dimension_filter: gaPageFilter(pagePath),
        limit: 1
      });
      const ga30Row = analyticsRows(ga30)[0];
      if (ga30Row) {
        analytics.last30d = {
          pageViews: toInteger(metricValue(ga30Row, 0, 'screenPageViews')),
          activeUsers: toInteger(metricValue(ga30Row, 1, 'activeUsers')),
          avgSessionDuration: toNumber(metricValue(ga30Row, 2, 'averageSessionDuration')),
          engagementRate: toNumber(metricValue(ga30Row, 3, 'engagementRate'))
        };
      } else if (ga30) {
        analytics.warnings.push({ label: 'ga4_30d', message: `No GA4 rows returned for ${pagePath}` });
      }

      // GA4: top 5 countries (last 90 days)
      const gaCountries = await callAnalyticsTool(article, analytics, googleMcp, 'ga4_countries', 'ga4_run_report', {
        dimensions: ['country'],
        metrics: ['activeUsers'],
        start_date: '90daysAgo',
        end_date: 'yesterday',
        dimension_filter: gaPageFilter(pagePath),
        order_bys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5
      });
      analytics.topCountries = analyticsRows(gaCountries)
        .map((r) => ({
          country: dimensionValue(r, 0, 'country'),
          users: toInteger(metricValue(r, 0, 'activeUsers'))
        }))
        .filter((r) => r.country || r.users > 0);
      if (gaCountries && analytics.topCountries.length === 0) {
        analytics.warnings.push({ label: 'ga4_countries', message: `No country rows returned for ${pagePath}` });
      }

      // GA4: top 5 traffic sources (last 90 days)
      const gaSources = await callAnalyticsTool(article, analytics, googleMcp, 'ga4_sources', 'ga4_run_report', {
        dimensions: ['sessionSource'],
        metrics: ['activeUsers'],
        start_date: '90daysAgo',
        end_date: 'yesterday',
        dimension_filter: gaPageFilter(pagePath),
        order_bys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        limit: 5
      });
      analytics.topSources = analyticsRows(gaSources)
        .map((r) => ({
          source: dimensionValue(r, 0, 'sessionSource'),
          users: toInteger(metricValue(r, 0, 'activeUsers'))
        }))
        .filter((r) => r.source || r.users > 0);
      if (gaSources && analytics.topSources.length === 0) {
        analytics.warnings.push({ label: 'ga4_sources', message: `No source rows returned for ${pagePath}` });
      }

      // GSC: top 5 queries driving traffic (last 28 days)
      if (publicUrl) {
        const gscQueries = await callAnalyticsTool(article, analytics, googleMcp, 'gsc_queries', 'gsc_search_analytics', {
          dimensions: ['query'],
          start_date: '28daysAgo',
          end_date: 'yesterday',
          dimension_filter_groups: [{ filters: [{ dimension: 'page', operator: 'equals', expression: publicUrl }] }],
          row_limit: 5
        });
        analytics.topQueries = analyticsRows(gscQueries)
          .map((r) => ({
            query: dimensionValue(r, 0, 'query'),
            clicks: toInteger(metricValue(r, 0, 'clicks')),
            impressions: toInteger(metricValue(r, 1, 'impressions')),
            ctr: toNumber(metricValue(r, 2, 'ctr')),
            position: toNumber(metricValue(r, 3, 'position'))
          }))
          .filter((r) => r.query || r.clicks > 0 || r.impressions > 0);
        if (gscQueries && analytics.topQueries.length === 0) {
          analytics.warnings.push({ label: 'gsc_queries', message: `No Search Console query rows returned for ${publicUrl}` });
        }
      } else {
        analytics.topQueries = [];
        analytics.warnings.push({ label: 'gsc_queries', message: 'No public URL available for Search Console page filtering' });
      }

      const hasUsefulData = !!analytics.last30d || analytics.topCountries.length > 0 || analytics.topSources.length > 0 || analytics.topQueries.length > 0;
      analytics.status = analytics.errors.length && !hasUsefulData
        ? 'failed'
        : analytics.errors.length || analytics.warnings.length ? 'partial' : 'complete';

      existingContentStore.add({ ...article, analytics });
      done++;

      if (win && !win.isDestroyed()) {
        win.webContents.send('analytics:progress', { done, total, articleId: article.id });
      }
    } catch (e) {
      logError('enrichAnalytics:' + article.id, e);
      done++;
    }
  }

  status(`Analytics enrichment complete: ${done}/${total} articles`);
  if (win && !win.isDestroyed()) {
    win.webContents.send('analytics:complete', { done, total });
  }
}

// Generate AI analysis summaries for all existing content
ipcMain.handle('existing:analyze', async () => {
  const s = settingsStore.get();
  const model = (s.models || []).find((m) => m.id === s.defaultModelId);
  if (!model) throw new Error('Set a default model in Settings first.');

  const articles = existingContentStore.list();
  const toAnalyze = articles.filter((a) => !a.analysis);

  if (toAnalyze.length === 0) {
    status('All articles already analyzed');
    return { analyzed: 0, total: articles.length };
  }

  const job = startBackgroundJob(
    'existing:analyze',
    'Article analysis',
    () => analyzeArticlesInBackground(toAnalyze, model)
  );

  status(`Analyzing ${toAnalyze.length} articles... (this will take a while)`);
  return { started: true, jobId: job.id, count: toAnalyze.length };
});

async function analyzeArticlesInBackground(articles, model) {
  let done = 0;
  const total = articles.length;

  for (const article of articles) {
    try {
      status(`Analyzing article ${done + 1}/${total}: ${article.title.slice(0, 50)}...`);

      // Truncate body to keep prompt reasonable
      const bodyText = (article.body || article.excerpt || '').slice(0, 4000);

      const response = await chatCompletion(model, [
        { role: 'system', content: 'You are analyzing a blog post to create a concise summary. Write 2-3 sentences that capture the post\'s specific topic, core argument, and key conclusion. Focus on what makes THIS post unique - the angle, the insight, the specific advice given. Do NOT write a generic description. Write as if explaining to another content strategist what this article covers. Return ONLY the summary text, no preamble.' },
        { role: 'user', content: `Title: ${article.title}\n\nTags: ${(article.tags || []).join(', ')}\n\nBody:\n${bodyText}` }
      ], 256);

      // Clean and save
      const analysis = response.trim().replace(/^["']|["']$/g, '');
      existingContentStore.add({
        ...article,
        analysis
      });
      done++;
    } catch (e) {
      logError('existing:analyze:' + article.id, e);
      done++;
    }
  }

  status(`Analysis complete: ${done}/${total} articles summarized`);
  if (win && !win.isDestroyed()) {
    win.webContents.send('existing:analyzed', { done, total });
  }
}

// ── IPC: Topics ──────────────────────────────────────────────────
ipcMain.handle('topics:list', () => topicsStore.list());
ipcMain.handle('topics:add', (_e, topic) => {
  const record = {
    ...topic,
    id: makeId(),
    status: topic.status || 'idea',
    createdAt: new Date().toISOString()
  };
  topicsStore.add(record);
  status('Topic added');
  return record;
});
ipcMain.handle('topics:update', (_e, id, patch) => {
  const existing = topicsStore.get(id);
  if (!existing) throw new Error('Topic not found');
  const merged = { ...existing, ...patch, id };
  topicsStore.add(merged);
  return merged;
});
ipcMain.handle('topics:remove', (_e, id) => {
  topicsStore.remove(id);
  status('Topic removed');
  return topicsStore.list();
});

// Generate topics using multi-source intelligence + default model
ipcMain.handle('topics:generate', async (_e, modelId) => {
  try {
    const s = settingsStore.get();
    const models = s.models || [];
    const model = models.find((m) => m.id === modelId) || models.find((m) => m.id === s.defaultModelId);
    if (!model) throw new Error('No model found. Set a default model in Settings.');

    ensureNoBackgroundJob('topics:generate', 'Topic generation');

    // Clear old topics immediately so UI shows them being replaced
    topicsStore.setAll([]);

    const job = startBackgroundJob(
      'topics:generate',
      'Topic generation',
      () => generateTopicsInBackground(model, s)
    );

    status('Generating 25 ranked topics... (this may take several minutes)');
    return { started: true, jobId: job.id };
  } catch (e) {
    if (e.code === 'JOB_ALREADY_RUNNING') {
      status(e.message);
    } else {
      logError('topics:generate', e);
      status('Topic generation failed: ' + e.message);
    }
    throw e;
  }
});

async function generateTopicsInBackground(model, settings) {
  try {
    status('Gathering content library, GSC, and GA data...');
    const { context, sources } = await gatherAll(
      { existing: existingContentStore, audiences: audiencesStore },
      { mcps: settings.mcps || [] }
    );

    const { sysPrompt, userPrompt } = buildTopicPrompt(context, sources);

    status(`Generating 25 ranked topics via ${model.displayName || model.model}...`);
    const response = await chatCompletion(model, [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userPrompt }
    ], 8192);

    let topics;
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      topics = JSON.parse(jsonMatch ? jsonMatch[0] : response);
    } catch (parseErr) {
      logError('topics:generate:parse', new Error(`Parse failed. Raw response (first 500): ${response.slice(0, 500)}`));
      throw new Error('Model returned unparseable response');
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      throw new Error('Model returned no topics');
    }

    const audiences = audiencesStore.list();
    const created = [];
    for (const t of topics) {
      // Clean target: strip parenthetical force descriptions the model sometimes appends
      const cleanTarget = (t.target || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
      const matchedAudience = audiences.find((a) => a.name === cleanTarget || a.name.startsWith(cleanTarget));
      const record = {
        id: makeId(),
        title: t.title,
        angle: t.angle,
        target: matchedAudience ? matchedAudience.name : cleanTarget,
        targetAudience: matchedAudience?.id || '',
        cmsTags: t.cmsTags || [],
        priority: t.priority || 3,
        scores: t.scores || null,
        rationale: t.rationale || '',
        sources: sources.used,
        status: 'idea',
        createdAt: new Date().toISOString()
      };
      topicsStore.add(record);
      created.push(record);
    }

    status(`Generated ${created.length} ranked topics from: ${sources.used.join(', ')}`);
    if (win && !win.isDestroyed()) {
      win.webContents.send('topics:generated', { count: created.length, sources: sources.used });
    }
  } catch (e) {
    logError('topics:generate:background', e);
    status('Topic generation failed: ' + e.message);
    if (win && !win.isDestroyed()) {
      win.webContents.send('topics:failed', { error: e.message });
    }
  }
}

// ── IPC: Drafts ──────────────────────────────────────────────────
ipcMain.handle('drafts:list', () => draftsStore.list());
ipcMain.handle('drafts:get', (_e, id) => draftsStore.get(id));
ipcMain.handle('drafts:add', (_e, draft) => {
  const record = {
    ...draft,
    id: makeId(),
    conversation: draft.conversation || [],
    status: 'drafting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  draftsStore.add(record);
  status('Draft created');
  return record;
});
ipcMain.handle('drafts:update', (_e, id, patch) => {
  const existing = draftsStore.get(id);
  if (!existing) throw new Error('Draft not found');
  const merged = { ...existing, ...patch, id, updatedAt: new Date().toISOString() };
  draftsStore.add(merged);
  return merged;
});
ipcMain.handle('drafts:remove', (_e, id) => {
  draftsStore.remove(id);
  status('Draft removed');
  return draftsStore.list();
});

// Generate a model-driven summary for a draft's article
ipcMain.handle('drafts:generateSummary', async (_e, draftId) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const s = settingsStore.get();
  const model = (s.models || []).find((m) => m.id === s.defaultModelId);
  if (!model) throw new Error('Set a default model in Settings first.');

  const content = draft.content || '';
  if (!content || content.length < 50) throw new Error('No article content to summarize');

  status('Generating summary...');
  const response = await chatCompletion(model, [
    { role: 'system', content: 'You are analyzing a blog post to create a concise summary. Write 2-3 sentences that capture the post\'s specific topic, core argument, and key conclusion. Focus on what makes THIS post unique - the angle, the insight, the specific advice given. Do NOT write a generic description. Write as if explaining to another content strategist what this article covers. Return ONLY the summary text, no preamble.' },
    { role: 'user', content: content.slice(0, 6000) }
  ], 256);

  const summary = response.trim().replace(/^["']|["']$/g, '');
  const updated = draftsStore.add({ ...draft, summary });
  status('Summary generated');
  return updated;
});

// Generate/continue a platform-specific promotional post conversation
ipcMain.handle('drafts:platformChat', async (_e, draftId, platform, userMessage, modelId) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const s = settingsStore.get();
  const model = (s.models || []).find((m) => m.id === modelId) || (s.models || []).find((m) => m.id === s.defaultModelId);
  if (!model) throw new Error('Set a default model in Settings first.');

  const articleContent = draft.content || '';
  if (!articleContent) throw new Error('No article content. Mark the draft ready first.');

  const platformProfile = platformProfilesStore.list().find((p) => p.isDefault) || platformProfilesStore.list()[0];
  const platformRules = platformProfile?.platforms?.[platform] || {};
  const voice = voiceProfilesStore.list().find((v) => v.isDefault) || voiceProfilesStore.list()[0];

  // Get or create the platform post record
  const platformPosts = draft.platformPosts || {};
  const record = platformPosts[platform] || { conversation: [], publishedAt: null, modelId };

  // Append user message
  record.conversation = [...record.conversation, { role: 'user', content: userMessage }];

  const publicUrl = draft.publicUrl || '';

  const sysPrompt = `You are a content promotion expert writing a ${platform} promotional post for an article.

Article content:
${articleContent}

${publicUrl ? `Public URL of the published article (use this in the post or first comment):\n${publicUrl}\n` : ''}

Platform rules for ${platform}:
${JSON.stringify(platformRules, null, 2)}

Voice: ${voice?.name || 'default'} - ${voice?.identity || ''}

IMPORTANT: Write the actual ${platform} post content NOW. Do not ask questions, do not use placeholders, do not try to look up anything. Just write the complete, ready-to-post message. ${publicUrl ? 'The URL is provided above.' : 'No URL is available yet - write the post without it and the user will add the link manually.'}`;

  status(`Drafting ${platform} post...`);
  const response = await chatCompletion(model, [
    { role: 'system', content: sysPrompt },
    ...record.conversation
  ], 2048, { modelId: model.id, noTools: true });

  record.conversation = [...record.conversation, { role: 'assistant', content: response }];
  record.modelId = modelId;
  platformPosts[platform] = record;
  draftsStore.add({ ...draft, platformPosts });

  status(`${platform} post drafted`);
  return draftsStore.get(draftId);
});

// Parse a model's social post response into clean body + optional first comment
// Strips headers, meta-commentary, separators, and follow-up questions
function parseSocialPost(rawContent) {
  let text = rawContent;

  // Split on common section delimiters
  // Models use patterns like "POST (body):", "FIRST COMMENT:", "BODY:", etc.
  const bodyMatch = text.match(/(?:\*\*)?(?:POST|BODY|MAIN\s*POST|THE\s*POST)(?:\s*\(body\))?\s*:?\s*(?:\*\*)?\s*\n([\s\S]*?)(?=\n\s*(?:---|\*\*\s*(?:FIRST\s*COMMENT|COMMENT)|\n---|$))/i);
  const commentMatch = text.match(/(?:\*\*)?(?:FIRST\s*COMMENT|COMMENT)(?:\s*\(body\))?\s*:?\s*(?:\*\*)?\s*\n([\s\S]*?)(?=\n\s*(?:---|$))/i);

  let body = null;
  let firstComment = null;

  if (bodyMatch) {
    body = bodyMatch[1].trim();
  } else {
    // No explicit "POST:" header - take everything before "FIRST COMMENT" or first ---
    const beforeComment = text.split(/\n\s*(?:\*\*\s*)?(?:FIRST\s*COMMENT|COMMENT)\s*:?/i)[0];
    const beforeSeparator = beforeComment.split(/\n\s*---\s*\n/i)[0];
    body = beforeSeparator.trim();
    // Strip leading meta lines like "Here's the Facebook post..."
    const lines = body.split('\n');
    // Find the first line that looks like actual post content (not meta-commentary)
    const metaPatterns = /^(here'?s|sure|absolutely|i'?ve|i\s+wrote|let me|this is|want me|the (?:post|hook)|note:)/i;
    let startIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !metaPatterns.test(line) && line.length > 10) {
        startIdx = i;
        break;
      }
    }
    body = lines.slice(startIdx).join('\n').trim();
  }

  if (commentMatch) {
    firstComment = commentMatch[1].trim();
  }

  // Clean up: remove trailing separators and follow-up questions
  body = body.replace(/\n\s*---+\s*$/g, '').trim();
  firstComment = firstComment ? firstComment.replace(/\n\s*---+\s*$/g, '').trim() : null;

  // Strip trailing "Want me to..." or "Curious..." questions from body
  body = body.replace(/\n+(?:Want me to|Curious|Should I|Let me know|Hope this)[^\n]*\.?\s*$/i, '').trim();

  return { body, firstComment };
}

// Publish a platform post via ContentStudio MCP
ipcMain.handle('drafts:publishPlatform', async (_e, draftId, platform, content) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const s = settingsStore.get();
  const csMcp = (s.mcps || []).find((m) => m.connected && /contentstudio/i.test(m.name));
  if (!csMcp) throw new Error('ContentStudio MCP not connected. Add it in Settings > MCPs first.');

  // Map our platform IDs to ContentStudio platform names
  const csPlatform = { facebook: 'facebook', twitter: 'twitter', linkedin: 'linkedin' }[platform] || platform;

  // Parse the model output into clean body + first comment
  const parsed = parseSocialPost(content);
  if (!parsed.body) throw new Error('Could not extract post content from the model response.');

  // Step 1: Get workspace ID
  status(`Finding workspace...`);
  let workspaceId = null;
  try {
    const wsResult = await callTool(csMcp, 'fetch_workspaces', {});
    let wsData;
    try { wsData = JSON.parse(wsResult); } catch { wsData = wsResult; }
    const workspaces = wsData?.data || wsData || [];
    if (Array.isArray(workspaces) && workspaces.length > 0) {
      workspaceId = workspaces[0]._id || workspaces[0].id;
    }
  } catch (e) {
    throw new Error(`Could not fetch ContentStudio workspace: ${e.message}`);
  }
  if (!workspaceId) throw new Error('No ContentStudio workspace found.');

  // Step 2: Find the social account for this platform
  status(`Finding ${csPlatform} account...`);
  let accountId = null;
  try {
    const accountsResult = await callTool(csMcp, 'fetch_social_accounts', { workspace_id: workspaceId, platform: csPlatform });
    let accountsData;
    try {
      accountsData = JSON.parse(accountsResult);
    } catch {
      accountsData = accountsResult;
    }
    const accounts = accountsData?.data || accountsData || [];
    if (Array.isArray(accounts) && accounts.length > 0) {
      accountId = accounts[0]._id || accounts[0].id;
    }
  } catch (e) {
    throw new Error(`Could not fetch ${csPlatform} accounts: ${e.message}`);
  }

  if (!accountId) throw new Error(`No ${csPlatform} account found in ContentStudio. Connect one first.`);

  // Step 3: Create the post with parsed body
  // Note: ContentStudio MCP uses text_content (not content), accounts as JSON string,
  // publish_type at top level, and scheduled_at is required even for drafts
  status(`Publishing to ${csPlatform}...`);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const postData = {
    workspace_id: workspaceId,
    text_content: parsed.body,
    accounts: JSON.stringify([accountId]),
    publish_type: 'draft',
    scheduled_at: now
  };

  const createResult = await callTool(csMcp, 'create_post', postData);

  // Mark as published on the draft
  const platformPosts = draft.platformPosts || {};
  platformPosts[platform] = {
    ...(platformPosts[platform] || {}),
    content: parsed.body,
    firstComment: parsed.firstComment,
    publishedAt: new Date().toISOString(),
    csResult: createResult.slice(0, 500)
  };
  const updated = draftsStore.add({ ...draft, platformPosts });
  status(`Published to ${platform} via ContentStudio${parsed.firstComment ? ' (with first comment)' : ''}`);
  return updated;
});

// Chat about publishing to site - Claude (via CLI) plans with the user
ipcMain.handle('drafts:siteChat', async (_e, draftId, message, modelId) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const s = settingsStore.get();
  const model = (s.models || []).find((m) => m.id === modelId) || (s.models || []).find((m) => m.id === s.defaultModelId);
  if (!model) throw new Error('Set a default model in Settings first.');

  const payloadMcp = (s.mcps || []).find((m) => m.connected && m.name && m.name.toLowerCase().includes('payload'));

  const articleContent = draft.content || '';
  const title = articleContent.match(/^#\s+(.+)$/m)?.[1]?.trim() || draft.title;
  const summary = draft.summary || '';

  // Discover MCP tools so Claude knows what it can call
  let toolsContext = 'Payload CMS MCP is not connected. The user will need to connect it in Settings.';
  if (payloadMcp) {
    try {
      const toolListResult = await connectMcp(payloadMcp);
      const tools = toolListResult.tools || [];
      toolsContext = `Payload CMS MCP is connected with ${tools.length} tools:\n${tools.map((t) => `- ${t.name}: ${t.description}`).join('\n')}`;
    } catch (e) {
      toolsContext = `Payload CMS MCP connection error: ${e.message}`;
    }
  }

  // Get or create site conversation
  const siteConversation = draft.siteConversation || [];
  const updatedConv = [...siteConversation, { role: 'user', content: message }];

  const isFirst = siteConversation.length === 0;
  const sysPrompt = `You are helping the user publish a blog post to their Payload CMS site.

Article title: ${title}
Summary: ${summary}

Article (markdown):
${articleContent.slice(0, 5000)}

${toolsContext}

You have direct access to the Payload CMS MCP tools. Use them freely during this conversation:
- Call find_posts to inspect existing posts and understand the field schema (content format, how tags are stored, meta/SEO fields, etc.)
- Discuss what you find with the user
- When the user confirms, call create_posts to publish the article

After creating the post, ALWAYS report the public URL on its own line in this exact format:
PUBLIC_URL: https://chrislema.com/<slug>

Do NOT produce a JSON plan for someone else to execute. You execute the tools yourself during this chat. Talk through what you're doing in plain language as you go, so the user can follow along and adjust.`;

  status('Chatting with model about site publish...');
  const siteMcps = (s.mcps || []).filter((m) => m.connected && /payload|cms/i.test(m.name));
  const response = await chatCompletion(model, [
    { role: 'system', content: sysPrompt },
    ...updatedConv
  ], 4096, { modelId: model.id, enableTools: true, mcps: siteMcps });

  const finalConv = [...updatedConv, { role: 'assistant', content: response }];
  draftsStore.add({ ...draft, siteConversation: finalConv, siteModelId: modelId });

  status('Ready');
  return draftsStore.get(draftId);
});

// Mark the draft as published to site (Claude does the actual publish during chat via CLI+MCP)
ipcMain.handle('drafts:siteExecute', async (_e, draftId) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  // Extract the public URL from the conversation
  let publicUrl = draft.publicUrl || null;
  const conv = draft.siteConversation || [];
  for (let i = conv.length - 1; i >= 0; i--) {
    const msg = conv[i];
    if (msg.role !== 'assistant') continue;
    const match = msg.content.match(/PUBLIC_URL:\s*(https?:\/\/\S+)/i);
    if (match) {
      publicUrl = match[1].trim();
      break;
    }
  }

  const patch = {
    ...draft,
    sitePublishedAt: new Date().toISOString()
  };
  if (publicUrl) patch.publicUrl = publicUrl;

  const updated = draftsStore.add(patch);
  status(publicUrl ? `Marked published to site. URL: ${publicUrl}` : 'Marked published to site');
  return { success: true, publicUrl };
});

// Chat about sending newsletter via Kit MCP
ipcMain.handle('drafts:newsletterChat', async (_e, draftId, message, modelId) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const s = settingsStore.get();
  const model = (s.models || []).find((m) => m.id === modelId) || (s.models || []).find((m) => m.id === s.defaultModelId);
  if (!model) throw new Error('Set a default model in Settings first.');

  const kitMcp = (s.mcps || []).find((m) => m.connected && /kit/i.test(m.name));

  const articleContent = draft.content || '';
  const title = articleContent.match(/^#\s+(.+)$/m)?.[1]?.trim() || draft.title;
  const summary = draft.summary || '';

  let toolsContext = 'Kit MCP is not connected. The user will need to connect it in Settings.';
  if (kitMcp) {
    try {
      const toolListResult = await connectMcp(kitMcp);
      const tools = toolListResult.tools || [];
      toolsContext = `Kit MCP is connected with ${tools.length} tools:\n${tools.map((t) => `- ${t.name}: ${t.description}`).join('\n')}`;
    } catch (e) {
      toolsContext = `Kit MCP connection error: ${e.message}`;
    }
  }

  const newsletterConversation = draft.newsletterConversation || [];
  const updatedConv = [...newsletterConversation, { role: 'user', content: message }];

  const sysPrompt = `You are helping the user send a newsletter broadcast via Kit (ConvertKit) about a new blog post.

Article title: ${title}
Summary: ${summary}
${draft.publicUrl ? `\nPublic URL: ${draft.publicUrl}\n` : ''}
Article (markdown):
${articleContent.slice(0, 5000)}

${toolsContext}

You have direct access to the Kit MCP tools. Use them freely during this conversation:
- List broadcasts, tags, subscribers to understand the account
- Create a broadcast with subject, preview text, and email content${draft.publicUrl ? ' (link to the article at ' + draft.publicUrl + ')' : ''}
- Discuss the plan with the user before sending

Talk through what you're doing in plain language as you go, so the user can follow along and adjust.`;

  status('Chatting with model about newsletter...');
  const newsletterMcps = (s.mcps || []).filter((m) => m.connected && /kit/i.test(m.name));
  const response = await chatCompletion(model, [
    { role: 'system', content: sysPrompt },
    ...updatedConv
  ], 4096, { modelId: model.id, enableTools: true, mcps: newsletterMcps });

  const finalConv = [...updatedConv, { role: 'assistant', content: response }];
  draftsStore.add({ ...draft, newsletterConversation: finalConv, newsletterModelId: modelId });

  status('Ready');
  return draftsStore.get(draftId);
});

// Mark the draft as newsletter sent
ipcMain.handle('drafts:newsletterExecute', async (_e, draftId) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const updated = draftsStore.add({
    ...draft,
    newsletterPublishedAt: new Date().toISOString()
  });

  status('Marked newsletter sent');
  return { success: true };
});

// Generate/continue a draft using the model
ipcMain.handle('drafts:generate', async (_e, draftId, userMessage) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const s = settingsStore.get();
  const models = s.models || [];
  const model = models.find((m) => m.id === draft.modelId);
  if (!model) throw new Error('Model not configured for this draft');

  // Load context
  const segment = draft.segmentId
    ? audiencesStore.get(draft.segmentId)
    : null;

  const frameworkIds = draft.frameworkIds || [];
  const frameworks = frameworkIds.map((id) => frameworksStore.get(id)).filter(Boolean);
  const voice = voiceProfilesStore.list().find((v) => v.id === draft.voiceProfileId) || voiceProfilesStore.list().find((v) => v.isDefault);
  const antiAi = antiAiStore.list();

  // Build messages
  const topic = topicsStore.get(draft.topicId);
  const topicContext = topic ? `Topic: ${topic.title}\nAngle: ${topic.angle}\nTarget: ${topic.target}` : `Title: ${draft.title}`;

  // Generate context files for CLI models, fall back to inline system prompt for API models
  let contextOptions = {};
  let systemPrompt;

  if (model.connectionType === 'oauth-cli') {
    // CLI model: use context files + --add-dir
    const { generateContextFiles } = require('./lib/contextFiles');
    const ctx = generateContextFiles(draft.id, { voiceProfile: voice, segment, frameworks, antiAiRules: antiAi });
    contextOptions = { contextDir: ctx.dir, instruction: ctx.instruction };
    systemPrompt = ctx.instruction;
  } else {
    // API model: inline system prompt (files don't apply)
    systemPrompt = buildDraftSystemPrompt({ voiceProfile: voice, segment, frameworks, antiAiRules: antiAi });
  }

  const messages = [{ role: 'system', content: systemPrompt }];

  // Add existing conversation
  for (const msg of (draft.conversation || [])) {
    messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content });
  }

  // Add the new user message
  const isFirst = !draft.conversation || draft.conversation.length === 0;
  const userContent = isFirst
    ? `${topicContext}\n\n${userMessage || 'Generate a first draft of this content.'}`
    : userMessage;

  messages.push({ role: 'user', content: userContent });

  status('Drafting...');
  const response = await chatCompletion(model, messages, undefined, contextOptions);
  status('Draft updated');

  // Save conversation
  const conversation = [...(draft.conversation || [])];
  conversation.push({ role: 'user', content: userContent, timestamp: new Date().toISOString() });
  conversation.push({ role: 'assistant', content: response, timestamp: new Date().toISOString() });

  const updated = { ...draft, conversation, content: response, updatedAt: new Date().toISOString() };
  draftsStore.add(updated);
  return updated;
});

// ── IPC: Distributions ───────────────────────────────────────────
ipcMain.handle('distributions:list', () => distributionsStore.list());
ipcMain.handle('distributions:add', (_e, dist) => {
  const record = { ...dist, id: makeId(), createdAt: new Date().toISOString() };
  distributionsStore.add(record);
  status('Distribution saved');
  return record;
});
ipcMain.handle('distributions:update', (_e, id, patch) => {
  const existing = distributionsStore.get(id);
  if (!existing) throw new Error('Distribution not found');
  const merged = { ...existing, ...patch, id };
  distributionsStore.add(merged);
  return merged;
});
ipcMain.handle('distributions:remove', (_e, id) => {
  distributionsStore.remove(id);
  return distributionsStore.list();
});

// Generate platform-specific promotional posts
ipcMain.handle('distributions:generate', async (_e, draftId, platforms, modelId) => {
  const draft = draftsStore.get(draftId);
  if (!draft) throw new Error('Draft not found');

  const s = settingsStore.get();
  const model = (s.models || []).find((m) => m.id === modelId) || (s.models || []).find((m) => m.id === s.defaultModelId);
  if (!model) throw new Error('Model not found');

  // Get clean article content - last assistant message or content field
  const articleContent = draft.content
    || [...(draft.conversation || [])].reverse().find((m) => m.role === 'assistant')?.content
    || '';

  const platformProfile = platformProfilesStore.list().find((p) => p.isDefault) || platformProfilesStore.list()[0];
  const voice = voiceProfilesStore.list().find((v) => v.isDefault) || voiceProfilesStore.list()[0];

  const platformRules = {};
  if (platformProfile) {
    for (const p of platforms) {
      if (platformProfile.platforms[p]) {
        platformRules[p] = platformProfile.platforms[p];
      }
    }
  }

  const sysPrompt = `You are a content promotion expert. Adapt this article into platform-native promotional posts.

Article content:
${articleContent}

Platform rules:
${JSON.stringify(platformRules, null, 2)}

Voice profile: ${voice?.name || 'default'}
${voice?.identity || ''}

Generate one promotional post per platform as JSON: {"platforms": [{"platform": "...", "content": "..."}]}
Return ONLY valid JSON.`;

  status('Generating promotional posts...');
  const response = await chatCompletion(model, [
    { role: 'system', content: sysPrompt },
    { role: 'user', content: `Create promotional posts for: ${platforms.join(', ')}` }
  ], 4096);
  status('Promotional posts generated');

  let result;
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    result = JSON.parse(jsonMatch ? jsonMatch[0] : response);
  } catch {
    throw new Error('Failed to parse model response');
  }

  // Save distribution record
  const dist = {
    id: makeId(),
    draftId,
    title: draft.title,
    platformPosts: result.platforms || [],
    status: 'generated',
    createdAt: new Date().toISOString()
  };
  distributionsStore.add(dist);

  // Mark draft as published
  draftsStore.add({ ...draft, status: 'published', updatedAt: new Date().toISOString() });

  return dist;
});

// ── IPC: Status listener ─────────────────────────────────────────
ipcMain.handle('app:getState', () => ({
  hasModels: ((settingsStore.get().models || []).length > 0),
  hasAudiences: audiencesStore.list().length > 0,
  hasFrameworks: frameworksStore.list().filter((f) => f.active).length > 0,
  hasExisting: existingContentStore.list().length > 0
}));

// ── IPC: Utilities (Export / Import) ─────────────────────────────

const EXPORTABLE = {
  settings: { label: 'Models, MCPs & Profile', type: 'document', store: () => settingsStore },
  frameworks: { label: 'Frameworks', type: 'collection', store: () => frameworksStore },
  antiAi: { label: 'Anti-AI Rules', type: 'collection', store: () => antiAiStore },
  voiceProfiles: { label: 'Voice Profiles', type: 'collection', store: () => voiceProfilesStore },
  platformProfiles: { label: 'Platform Profiles', type: 'collection', store: () => platformProfilesStore },
  audiences: { label: 'Audiences', type: 'collection', store: () => audiencesStore },
  topics: { label: 'Topics', type: 'collection', store: () => topicsStore },
  drafts: { label: 'Drafts', type: 'collection', store: () => draftsStore },
  distributions: { label: 'Distributions', type: 'collection', store: () => distributionsStore },
  existingContent: { label: 'Existing Content', type: 'collection', store: () => existingContentStore }
};

const SENSITIVE_ENV_KEY = /(api[_-]?key|bearer|token|secret|password|passwd|authorization)/i;

function stripModelSecrets(model) {
  const { apiKey, ...safeModel } = model || {};
  return safeModel;
}

function stripMcpEnvSecrets(env = {}) {
  return Object.fromEntries(
    Object.entries(env).filter(([key]) => !SENSITIVE_ENV_KEY.test(key))
  );
}

function stripMcpSecrets(mcp) {
  const portableMcp = { ...(mcp || {}) };
  delete portableMcp.token;
  delete portableMcp.connected;
  delete portableMcp.toolCount;
  delete portableMcp.tools;
  delete portableMcp.lastConnected;
  delete portableMcp.lastError;

  if (portableMcp.oauth) {
    const { accessToken, refreshToken, expiresAt, ...safeOauth } = portableMcp.oauth;
    if (Object.keys(safeOauth).length > 0) portableMcp.oauth = safeOauth;
    else delete portableMcp.oauth;
  }

  if (portableMcp.env) {
    const safeEnv = stripMcpEnvSecrets(portableMcp.env);
    if (Object.keys(safeEnv).length > 0) portableMcp.env = safeEnv;
    else delete portableMcp.env;
  }

  return { ...portableMcp, connected: false, toolCount: 0, tools: [] };
}

function sanitizeSettingsForExport(settings = {}) {
  const safeSettings = { ...settings };
  if (Array.isArray(safeSettings.models)) {
    safeSettings.models = safeSettings.models.map(stripModelSecrets);
  }
  if (Array.isArray(safeSettings.mcps)) {
    safeSettings.mcps = safeSettings.mcps.map(stripMcpSecrets);
  }
  return safeSettings;
}

function findExistingById(records = [], id) {
  if (!id) return null;
  return records.find((record) => record.id === id) || null;
}

function restoreLocalModelSecrets(model, existingSettings = {}) {
  const existingModel = findExistingById(existingSettings.models || [], model.id);
  if (!existingModel?.apiKey) return model;
  return { ...model, apiKey: existingModel.apiKey };
}

function restoreLocalMcpSecrets(mcp, existingSettings = {}) {
  const existingMcp = findExistingById(existingSettings.mcps || [], mcp.id);
  if (!existingMcp) return mcp;

  const restored = { ...mcp };
  if (existingMcp.token) restored.token = existingMcp.token;
  if (existingMcp.oauth) restored.oauth = { ...(restored.oauth || {}), ...existingMcp.oauth };

  const incomingEnv = restored.env || {};
  const existingSecretEnv = Object.fromEntries(
    Object.entries(existingMcp.env || {}).filter(([key]) => SENSITIVE_ENV_KEY.test(key))
  );
  if (Object.keys(existingSecretEnv).length > 0) {
    restored.env = { ...incomingEnv, ...existingSecretEnv };
  }

  return restored;
}

function sanitizeSettingsForImport(settings = {}, existingSettings = {}) {
  const safeSettings = sanitizeSettingsForExport(settings);
  if (Array.isArray(safeSettings.models)) {
    safeSettings.models = safeSettings.models.map((model) => restoreLocalModelSecrets(model, existingSettings));
  }
  if (Array.isArray(safeSettings.mcps)) {
    safeSettings.mcps = safeSettings.mcps.map((mcp) => restoreLocalMcpSecrets(mcp, existingSettings));
  }
  return safeSettings;
}

ipcMain.handle('utilities:export', async (_e, sections) => {
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Export ContentCreator Data',
    defaultPath: `contentcreator-export-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (canceled || !filePath) return { canceled: true };

  const data = {
    _meta: {
      app: 'ContentCreator',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      sections: Object.keys(sections).filter((k) => sections[k])
    }
  };

  for (const [key, selected] of Object.entries(sections)) {
    if (!selected) continue;
    const spec = EXPORTABLE[key];
    if (!spec) continue;
    if (spec.type === 'document') {
      const value = spec.store().get();
      data[key] = key === 'settings' ? sanitizeSettingsForExport(value) : value;
    } else {
      data[key] = spec.store().list();
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  status(`Exported to ${filePath}`);
  return { success: true, path: filePath };
});

ipcMain.handle('utilities:import', async (_e) => {
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import ContentCreator Data',
    filters: [{ name: 'JSON', extensions: ['json'] }],
    properties: ['openFile']
  });
  if (canceled || !filePaths || filePaths.length === 0) return { canceled: true };

  const raw = fs.readFileSync(filePaths[0], 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('Invalid JSON file');
  }

  const imported = [];
  for (const [key, spec] of Object.entries(EXPORTABLE)) {
    if (!data[key]) continue;
    if (spec.type === 'document') {
      const value = key === 'settings'
        ? sanitizeSettingsForImport(data[key], spec.store().get())
        : data[key];
      spec.store().set(value);
    } else {
      spec.store().setAll(data[key]);
    }
    imported.push(spec.label);
  }

  status(`Imported: ${imported.join(', ')}`);
  return { success: true, imported };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
