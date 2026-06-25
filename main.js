const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const { createCollection, createDocument } = require('./lib/store');
const seed = require('./lib/seedData');
const { parseAudienceMarkdown, parseVoiceProfileMarkdown, parsePlatformProfileMarkdown, makeId } = require('./lib/parser');
const { buildDraftSystemPrompt, chatCompletion } = require('./lib/modelClient');
const { connectMcp, queryMcp, callTool } = require('./lib/mcpClient');
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
  const mcp = (s.mcps || []).find((m) => m.id === id);
  if (!mcp) throw new Error('MCP not found');

  status(`Connecting to ${mcp.name}...`);
  try {
    const result = await connectMcp(mcp);
    // Update MCP record with connection status and tools
    const mcps = (s.mcps || []).map((m) =>
      m.id === id ? { ...m, connected: true, toolCount: result.toolCount, tools: result.tools, lastConnected: new Date().toISOString() } : m
    );
    settingsStore.patch({ mcps });
    status(`Connected to ${mcp.name}: ${result.toolCount} tools available`);
    return result;
  } catch (e) {
    // Mark as disconnected
    const mcps = (s.mcps || []).map((m) =>
      m.id === id ? { ...m, connected: false, toolCount: 0, tools: [], lastError: e.message } : m
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

  // Start in background
  analyzeArticlesInBackground(toAnalyze, model);

  status(`Analyzing ${toAnalyze.length} articles... (this will take a while)`);
  return { started: true, count: toAnalyze.length };
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

    // Clear old topics immediately so UI shows them being replaced
    topicsStore.setAll([]);

    // Start generation in background - return immediately
    generateTopicsInBackground(model, s);

    status('Generating 25 ranked topics... (this may take several minutes)');
    return { started: true };
  } catch (e) {
    logError('topics:generate', e);
    status('Topic generation failed: ' + e.message);
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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
