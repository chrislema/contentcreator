const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  onStatus: (cb) => {
    const handler = (_e, text) => cb(text);
    ipcRenderer.on('app:status', handler);
    return () => ipcRenderer.removeListener('app:status', handler);
  },

  onTopicsGenerated: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('topics:generated', handler);
    return () => ipcRenderer.removeListener('topics:generated', handler);
  },

  onTopicsFailed: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('topics:failed', handler);
    return () => ipcRenderer.removeListener('topics:failed', handler);
  },

  onAnalyzed: (cb) => {
    const handler = (_e, data) => cb(data);
    ipcRenderer.on('existing:analyzed', handler);
    return () => ipcRenderer.removeListener('existing:analyzed', handler);
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    patch: (partial) => ipcRenderer.invoke('settings:patch', partial)
  },

  // Models
  models: {
    list: () => ipcRenderer.invoke('models:list'),
    add: (model) => ipcRenderer.invoke('models:add', model),
    update: (id, patch) => ipcRenderer.invoke('models:update', id, patch),
    remove: (id) => ipcRenderer.invoke('models:remove', id),
    test: (modelId, message) => ipcRenderer.invoke('models:test', modelId, message)
  },

  // Frameworks
  frameworks: {
    list: () => ipcRenderer.invoke('frameworks:list'),
    toggle: (id) => ipcRenderer.invoke('frameworks:toggle', id),
    add: (fw) => ipcRenderer.invoke('frameworks:add', fw),
    remove: (id) => ipcRenderer.invoke('frameworks:remove', id)
  },

  // MCPs
  mcps: {
    list: () => ipcRenderer.invoke('mcps:list'),
    add: (mcp) => ipcRenderer.invoke('mcps:add', mcp),
    update: (id, patch) => ipcRenderer.invoke('mcps:update', id, patch),
    remove: (id) => ipcRenderer.invoke('mcps:remove', id),
    connect: (id) => ipcRenderer.invoke('mcps:connect', id),
    disconnect: (id) => ipcRenderer.invoke('mcps:disconnect', id),
    query: (mcpId, query, modelId) => ipcRenderer.invoke('mcps:query', mcpId, query, modelId)
  },

  // Anti-AI
  antiAi: {
    list: () => ipcRenderer.invoke('antiAi:list'),
    toggle: (id) => ipcRenderer.invoke('antiAi:toggle', id),
    add: (rule) => ipcRenderer.invoke('antiAi:add', rule),
    remove: (id) => ipcRenderer.invoke('antiAi:remove', id)
  },

  // Voice Profiles
  voiceProfiles: {
    list: () => ipcRenderer.invoke('voiceProfiles:list'),
    add: (vp) => ipcRenderer.invoke('voiceProfiles:add', vp),
    remove: (id) => ipcRenderer.invoke('voiceProfiles:remove', id)
  },

  // Platform Profiles
  platformProfiles: {
    list: () => ipcRenderer.invoke('platformProfiles:list'),
    add: (pp) => ipcRenderer.invoke('platformProfiles:add', pp),
    remove: (id) => ipcRenderer.invoke('platformProfiles:remove', id)
  },

  // Audiences
  audiences: {
    list: () => ipcRenderer.invoke('audiences:list'),
    get: (id) => ipcRenderer.invoke('audiences:get', id),
    add: (aud) => ipcRenderer.invoke('audiences:add', aud),
    update: (id, patch) => ipcRenderer.invoke('audiences:update', id, patch),
    remove: (id) => ipcRenderer.invoke('audiences:remove', id)
  },

  // Existing Content
  existing: {
    list: () => ipcRenderer.invoke('existing:list'),
    add: (article) => ipcRenderer.invoke('existing:add', article),
    update: (id, patch) => ipcRenderer.invoke('existing:update', id, patch),
    remove: (id) => ipcRenderer.invoke('existing:remove', id),
    importFiles: () => ipcRenderer.invoke('existing:importFiles'),
    syncMcp: () => ipcRenderer.invoke('existing:syncMcp'),
    analyze: () => ipcRenderer.invoke('existing:analyze')
  },

  // Import
  import: {
    file: (type) => ipcRenderer.invoke('import:file', type)
  },

  // Topics
  topics: {
    list: () => ipcRenderer.invoke('topics:list'),
    add: (topic) => ipcRenderer.invoke('topics:add', topic),
    update: (id, patch) => ipcRenderer.invoke('topics:update', id, patch),
    remove: (id) => ipcRenderer.invoke('topics:remove', id),
    generate: (modelId) => ipcRenderer.invoke('topics:generate', modelId)
  },

  // Drafts
  drafts: {
    list: () => ipcRenderer.invoke('drafts:list'),
    get: (id) => ipcRenderer.invoke('drafts:get', id),
    add: (draft) => ipcRenderer.invoke('drafts:add', draft),
    update: (id, patch) => ipcRenderer.invoke('drafts:update', id, patch),
    remove: (id) => ipcRenderer.invoke('drafts:remove', id),
    generate: (draftId, userMessage) => ipcRenderer.invoke('drafts:generate', draftId, userMessage)
  },

  // Distributions
  distributions: {
    list: () => ipcRenderer.invoke('distributions:list'),
    add: (dist) => ipcRenderer.invoke('distributions:add', dist),
    update: (id, patch) => ipcRenderer.invoke('distributions:update', id, patch),
    remove: (id) => ipcRenderer.invoke('distributions:remove', id),
    generate: (draftId, platforms, modelId) => ipcRenderer.invoke('distributions:generate', draftId, platforms, modelId)
  },

  // App state
  getState: () => ipcRenderer.invoke('app:getState')
});
