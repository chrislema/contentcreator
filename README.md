# ContentCreator

An Electron desktop app for creating, managing, and distributing content through a single intelligent pipeline. Connect AI models, audience research, content frameworks, MCP-powered tools (CMS, email, social media), and publishing platforms to go from idea to published article without switching contexts.

## What It Does

ContentCreator brings together the pieces a content creator needs into one workflow:

1. **Topics** - Rank and manage content ideas using a multi-source intelligence engine that combines Google Search Console data, Google Analytics, existing content, and audience segments. Each topic is scored on five criteria and distributed across audience segments to avoid overlap.

2. **Drafts** - Write articles with AI models through a chat interface. Supports multiple models (OpenAI-compatible, Anthropic, Claude Code CLI), voice profiles, audience targeting, and content frameworks. A smart article extractor picks the right version from the conversation and strips chatter.

3. **Distributions** - Push finished articles to your website (via Payload CMS MCP), email newsletter (via Kit MCP), and social media (via ContentStudio MCP). Each platform gets its own chat panel where you instruct the model, it calls the MCP tools directly, and you review before anything goes live.

4. **Audiences** - Define micro-segments with goal pyramids, pain pyramids, four forces analysis, and hiring moments so every piece of content targets a specific reader.

5. **Existing Content** - Import and analyze your content library (75+ articles) to prevent topic overlap and give the model context on what you've already written.

## Key Features

- **Multi-model support**: OpenAI-compatible APIs (GPT, GLM), Anthropic, and Claude Code CLI with permission-bypassed tool access
- **MCP integration**: HTTP (with OAuth 2.1), SSE, and stdio transports. Register any MCP and let the model use it during chat
- **Topic intelligence**: 5-criteria ranking rubric, distribution rules across segments, deduplication against existing content
- **Model-driven summaries**: Generated once at mark-ready time, reusable across distribution cards, CMS push, and content library
- **Bring-your-own tools**: No hardcoded integrations. Each user registers their own models, MCPs, voice profiles, and frameworks

## Supported MCPs

The app works with any MCP-compliant server. Tested with:

- **Payload CMS** (HTTP) - publish articles, inspect post schema
- **Kit / ConvertKit** (HTTP + OAuth) - create newsletter broadcasts, manage subscribers
- **ContentStudio** (stdio) - schedule social posts to Facebook, X, LinkedIn
- **Google Analytics & Search Console** - topic intelligence data sources

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
git clone https://github.com/chrislema/contentcreator.git
cd contentcreator
npm install
npm start
```

### First Run Setup

1. **Settings > Models** - Add your AI models (API key or CLI path). Set a default model.
2. **Settings > MCPs** - Register your CMS, email, and social media MCPs.
3. **Settings > Frameworks** - Add or import content frameworks.
4. **Settings > Profile** - Set your voice profile and platform profiles.
5. **Audiences** - Define your micro-segments.
6. **Topics > Generate** - Run the topic intelligence engine.
7. **Drafts** - Write, mark ready, distribute.

## Architecture

```
main.js              - Electron main process, IPC handlers, background generation
preload.js           - Secure IPC bridge to renderer
lib/
  modelClient.js     - Multi-provider model calls (API, Anthropic, CLI)
  mcpClient.js       - MCP client (HTTP + stdio transports)
  mcpOAuth.js        - OAuth 2.1 flow (PKCE, dynamic registration, token refresh)
  topicIntelligence.js - Multi-source ranking + distribution rules
  contextFiles.js    - Voice/audience/framework context files for CLI models
  store.js           - JSON file-based data store
renderer/
  views/             - UI for each section (settings, topics, drafts, distributions)
  styles.css         - All styling (CSS variables, card patterns, layout)
```

## Data Storage

All runtime data (models, MCPs, drafts, topics, audiences) is stored locally in:
- macOS: `~/Library/Application Support/ContentCreator/data/`
- The repo contains no private data, API keys, or user content

## Tech Stack

- **Electron** - desktop app framework
- **Vanilla JS** - no frontend framework, no build step
- **Model Context Protocol** - for tool integrations
- **Claude Code CLI** - for permission-bypassed MCP tool use during chat

## License

[MIT](LICENSE) - open source, free to use, modify, and distribute.
