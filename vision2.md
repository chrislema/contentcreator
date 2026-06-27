# ContentCreator — Product Vision 2

## The Big Idea

ContentCreator is a **content operating system disguised as a desktop app**. It is deliberately a *shell* — it ships with almost no opinions of its own about who you are, what you write, who you write for, or where you publish. Instead, it gives you a structured place to install all of that: your voice, your audiences, your frameworks, your tools, and your publishing pipeline.

That design choice is the whole thesis. Every "AI content tool" on the market is a smarter pen — a prompt box wrapped around a model. ContentCreator is the opposite. The intelligence does not live in the model. It lives in everything the app assembles and feeds the model *before* it writes a word, and everything it does to distribute and learn *after*. A commodity model, given world-class context, produces non-commodity content. This app is a machine for assembling that context.

It runs as an Electron desktop app so that your voice, your data, and your credentials stay on your machine — not in someone else's SaaS.

## Who It's For

A serious content creator — a coach, consultant, founder, or operator — who produces content across a blog, a newsletter, and social platforms, and who refuses to let it sound AI-generated. The tool is built to protect an authentic voice, to target specific audience segments, and to run the full pipeline from research to publication without context-switching across a dozen tabs.

The reference user is Chris Lema, but nothing about the app is hardcoded to him. Every profile, audience, framework, model, and integration is data the user supplies.

## The Problem It Solves

Producing consistent, high-quality, authentic content is a full-time job split across disconnected tools: one app to research, one to write, one to schedule, one to check analytics. None of them talk to each other, and none of them protect *voice*. The result is either burnout from manual work, or generic AI output that erodes trust. ContentCreator connects the full pipeline and puts voice protection and audience precision at the center of it.

---

## The Core Principle: Bring Your Own Everything

ContentCreator hardcodes **no** integrations, **no** voice, **no** audience, **no** model. You install all of it. This is what makes it a shell — and what makes it powerful.

| You bring | The app provides |
|---|---|
| **Your AI models** (API key or local CLI) | A unified client that speaks to all of them |
| **Your voice profile** (markdown) | Enforcement of it on every draft |
| **Your audience segments** (markdown or manual) | Psychological targeting on every piece |
| **Your content frameworks** | A composable craft system |
| **Your MCPs** (CMS, email, analytics, social) | Direct, model-driven tool use during chat |
| **Your existing content library** | A learning loop and a duplication guard |

Because nothing is hardcoded, the app never goes stale, never locks you into a vendor, and never imposes someone else's taste on your work. It bends to the user instead of the reverse.

---

## The Five Sections

### 1. Settings — Configure how the app thinks

Six sub-sections that install your operating context:

- **Profile** — Personal identity (name, email, bio, links). Manages **Voice Profiles** (importable `.md` files encoding identity, tone, sentence structure, opening/closing moves, punctuation habits, contractions, content philosophy, and anti-patterns) and **Platform Profiles** (per-platform adaptation rules for hooks, structure, length, CTAs, and link strategy).
- **Models** — AI connections of two kinds:
  - **API Key** — direct HTTP to Anthropic, OpenAI (including GPT-5.x token handling), GLM/Zhipu, or any OpenAI-compatible endpoint.
  - **OAuth/CLI** — drives a locally installed CLI (Claude Code, Codex) that already holds an OAuth session, so no API key is needed and tool use runs with permissions bypassed.
- **Frameworks** — 62 pre-loaded, toggleable framework cards across six categories, each assigned to a stage of the writing process and carrying *pairs-well-with* affinity relationships:
  - **Insight Prompts** (11) — cognitive lenses that extract non-obvious insights
  - **Content Formats** (14) — structural templates
  - **Headline Formulas** (13) — hook patterns
  - **Messaging Frameworks** (8) — persuasive logic structures
  - **Story Shapes** (5) — narrative patterns
  - **Psychological Triggers** (11) — brain mechanisms placed at specific beats
- **MCPs** — External services via Model Context Protocol. HTTP (with OAuth 2.1), SSE, and stdio transports. Register any compliant server with bearer-token, API-key, or OAuth auth; activate, deactivate, and disconnect.
- **Anti-AI** — A rule-based QA gate of 39 seeded rules (banned words, banned phrases, structural tells) that prevents content from sounding machine-made. Toggleable and extensible.

### 2. Audiences — Model the reader's psychology

Each profile holds micro-segments, and each micro-segment carries a full psychological model:

- **Goal Pyramid** (Base → Operational → Strategic → Aspirational)
- **Inverted Pain Pyramid** (each pain paired with the inverted goal the reader actually wants)
- **Four Forces** (Push, Magnetism, Anxiety, Habit, and net balance)
- **Hiring Moments** (the scenario-based triggers that make them seek you out)
- **Dominant Force** identification

Profiles can be imported from markdown (a parser reads the structure), created manually, edited at the micro-segment level, or deleted. The point: every piece of content is written *to one specific human*, not "about a topic."

### 3. Topics — A data-grounded idea engine

A research engine that synthesizes your **own cached analytics** with your audience data to rank ideas. It reads:

- **Existing content summaries + tag distribution** — to avoid duplication and spot over-covered themes
- **Google Search Console data** (cached per article) — top queries by impressions, and crucially the *high-impression / low-CTR* queries that reveal real demand you're failing to capture
- **Google Analytics data** (cached per article) — your best-performing pages, so the engine writes more of what already works
- **Audience micro-segments** — so each idea targets a specific persona

It generates 25 topics scored 0–50 against a five-criteria rubric — **Search Demand, Performance Potential, Content Gap, Audience Fit, Uniqueness** — and applies **distribution rules** that spread ideas across at least six segments and cap any single theme. Each card carries a title, angle, target segment, pre-assigned CMS tags, a 1–5 priority, the score breakdown, and a rationale citing which data source drove it. Cards are sortable, filterable, searchable, editable, and one click becomes a draft.

### 4. Research — From peer-reviewed paper to content

Drop in research PDFs and the engine extracts the paper's **actual finding** (not the abstract), translates it into a practical "aha" for your audience, **preserves the caveats so the content never overclaims**, and pulls real citation metadata — authors, journal, DOI, volume, pages — straight from the PDF text rather than inventing it. The result is a research-backed idea card, scored on the same rubric and ready to draft. This is evidence-backed content with receipts.

### 5. Drafts — Collaborative, voice-protected writing

A conversational workspace, not a one-shot generator. Each draft selects a model, a source (topic or research card), a target segment, active frameworks, and a voice profile. The model writes a first pass with **all** of that context assembled into its system prompt — or, for CLI models, written to structured context files exposed via `--add-dir`. Then the real work happens: **you inject your own stories, client cases, and contrarian takes, and the model reshapes the piece around your material.** A smart extractor pulls the clean article out of the messy conversation, stripping "Want me to adjust this?" chatter automatically. A model-driven summary is generated once at mark-ready time and reused everywhere downstream.

### 6. Distributions — Publish everywhere, natively

Where content crosses the finish line. Using your Platform Profile, the app generates platform-native promotional posts — each with its own hooks, structure, length, and link strategy — never the same post blasted everywhere. And through MCP, the model **calls your real tools directly during chat**:

- **Site** → Payload CMS: inspects your post schema, publishes the article, and reports the live public URL.
- **Newsletter** → Kit/ConvertKit: drafts and creates the broadcast, linking the article.
- **Social** → ContentStudio: finds your workspace and account, posts the platform-native body plus an optional first comment.

You review everything before it goes live. Publish state is tracked per channel.

---

## The Full Pipeline

```
Settings  →  install voice, models, frameworks, MCPs, anti-AI rules
   │
Audiences →  model each reader's goals, pains, forces, hiring moments
   │
Existing  →  import library, enrich with GA4 + Search Console, analyze
Content        (the learning loop and duplication guard)
   │
Topics    →  rank 25 data-grounded ideas across segments
Research  →  turn peer-reviewed PDFs into cited idea cards
   │
Drafts    →  collaborative writing; your material transforms the piece
   │
Distrib.  →  platform-native posts + direct publish to CMS/email/social
   │
   └────────►  new analytics flow back into the next round of Topics
```

It is a **closed loop**: what you publish becomes the data that shapes what you write next.

---

## What Makes It a Game Changer

1. **It closes the loop.** Other tools only generate. This one learns from what worked, generates, publishes, and feeds the results back in.
2. **Voice is infrastructure, not a hope.** Voice Profiles plus the Anti-AI gate make "sounds like *you*, not a robot" a configurable, enforced rule.
3. **Every piece targets one real human.** Goal pyramids, pain pyramids, and four-forces analysis make generic output structurally hard.
4. **Craft is composable.** 62 stage-aware frameworks with affinity mapping turn "write something" into "build to intent."
5. **Drafting is collaboration.** Your stories transform the draft; the AI is the partner, you remain the source of truth.
6. **Research with receipts.** Source papers become cited, caveated, audience-ready content.
7. **It owns no lock-in.** Bring your own models, MCPs, and profiles. The moat isn't the AI — it's the structured context only you can supply.

---

## Technical Architecture

- **Electron** desktop app (macOS), so voice, data, and credentials stay local.
- **Main process** (`main.js`) — IPC handlers for all CRUD, model calls, file import/parsing, analytics enrichment, topic/research/draft/distribution generation, and MCP-driven publishing.
- **Preload** (`preload.js`) — context-isolated IPC bridge exposing the API surface to the renderer.
- **Renderer** — vanilla JS, lightweight view system (`CC.views`), no framework.
- **Library** (`lib/`):
  - `store.js` — JSON file-based collections and documents in Electron's userData dir
  - `seedData.js` — pre-loaded frameworks, anti-AI rules, voice/platform profiles, audiences
  - `parser.js` — markdown import parsers for audience, voice, and platform profiles
  - `modelClient.js` — unified client for OpenAI-compatible, Anthropic, and CLI-backed models, plus draft system-prompt assembly
  - `mcpClient.js` / `mcpOAuth.js` — MCP transports (HTTP/SSE/stdio) and OAuth 2.1 flow
  - `topicIntelligence.js` — analytics aggregation, ranking rubric, distribution rules, prompt builder
  - `researchIntelligence.js` — PDF analysis, citation extraction, research prompt builder
  - `contextFiles.js` — structured context-file generation for CLI models
- **Utilities** — export/import of all collections and settings as portable JSON, with secrets stripped on export and restored on import.

## Design Principles

1. **Shell, not silo** — bring your own everything; the app never imposes its taste or locks you in.
2. **Voice protection** — content must never sound AI-generated.
3. **Audience-first** — every piece targets a specific micro-segment.
4. **Framework-driven** — structure is composed from selectable, affinity-aware frameworks.
5. **Iterative refinement** — drafts are conversations transformed by user-injected material.
6. **Platform-native distribution** — adapt per platform, never cross-post generically.
7. **Closed-loop intelligence** — published results feed the next round of ideas.
8. **Local-first** — your voice and credentials live on your machine.
