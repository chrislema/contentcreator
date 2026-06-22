# ContentCreator - Product Vision

## What It Is

ContentCreator is a desktop application (Electron) for creating, managing, and distributing text content: articles, blog posts, and social posts. It serves as a personal content engine that connects AI models, audience research, frameworks, and publishing platforms into a single workflow.

## Who It's For

Chris Lema, a trusted mentor and experienced coach who produces content across blogs, newsletters, and social platforms. The tool is designed around his voice, his audiences, and his content philosophy of challenging conventional wisdom through deliberate, experience-backed contrast.

## The Problem

Creating consistent, high-quality content that sounds authentic (not AI-generated), targets specific audience segments, and gets distributed across multiple platforms is a full-time job. Existing tools handle pieces (writing, scheduling, analytics) but none connect the full pipeline from research through publication with the controls needed to protect voice and authenticity.

## The Five Sections

### Settings

Five sub-sections that configure how the app operates:

1. **Profile** - Personal identity: name, email, bio, social links. Also manages Voice Profiles (importable .md files that encode writing voice, tone, sentence patterns, content philosophy, and anti-patterns) and Platform Profiles (importable .md files that encode per-platform adaptation rules for hooks, structure, length, CTAs, link strategy, and promotion strategies).

2. **Models** - AI model connections. Two connection types:
   - **API Key** - Direct HTTP calls with a provider + model + API key (Anthropic, OpenAI, GLM/Zhipu, or custom OpenAI-compatible endpoints)
   - **OAuth/CLI** - Leverages locally-installed CLI tools that already hold an OAuth session (e.g., Claude Code subscription, OpenAI Codex), no API key needed

3. **Frameworks** - 62 pre-loaded framework cards across 6 categories, each toggleable on/off, plus the ability to add custom frameworks or delete existing ones:
   - **Insight Prompts** (11, Stage 1) - Cognitive lenses that extract non-obvious insights (Belief Archaeology, Contrarian's Truth, Failure Autopsy, etc.)
   - **Content Formats** (14, Stage 1/3) - Structural templates for organizing content (Myth Killer, Prediction Engine, Framework Builder, etc.)
   - **Headline Formulas** (13, Stage 2) - Hook patterns that trigger engagement (Desire-Obstacle Elimination, Authority Proof, Myth-Busting Hook, etc.)
   - **Messaging Frameworks** (8, Stage 3) - Persuasive structures for underlying logic (Great Paradox, Unique Method, Enemy Identification, etc.)
   - **Story Shapes** (5, Stage 3) - Narrative patterns (Chronological Arc, In Medias Res, Contrast Reveal, Nested Story, Parallel Track)
   - **Psychological Triggers** (11, Stage 4) - Brain mechanisms deployed at specific beats (Biology Is King, Cost of Inaction, Identity Consistency, etc.)
   - Each framework has pairs-well-with relationships that encode affinity patterns across categories

4. **MCPs** - External service connections via Model Context Protocol. Add by URL with auth (bearer token, API key, or OAuth). Used to connect to:
   - CMS (e.g., Payload CMS at cms.chrislema.com)
   - Email/newsletter platforms (e.g., ConvertKit/KIT)
   - Analytics (e.g., Google Analytics, Google Search Console)
   - Can be activated/deactivated and disconnected

5. **Anti-AI** - Rule-based QA gate that detects and flags AI-generated patterns ("AI tells") before content is finalized. Pre-loaded with 39 rules from the voice profile:
   - Banned words (delve, landscape, leverage, transformative, seamless, etc.)
   - Banned phrases ("at its core...", "in today's fast-paced world...", "let's dive in", etc.)
   - Structural patterns (uniform sentence lengths, compressed two-sentence contrast tics, em dashes for clarifying info, etc.)
   - Rules are toggleable, and users can add custom rules or delete existing ones

### Audiences

Manages audience segment profiles, each containing multiple micro-segments. Each micro-segment carries:
- Name and description
- Goal Pyramid (4 levels: Base, Operational, Strategic, Aspirational)
- Inverted Pain Pyramid (pain-to-inverted-goal pairs)
- Four Forces Profile (Push, Magnetism, Anxiety, Habit, Net Force Balance)
- Hiring Moments (scenario-based triggers)
- Dominant Force identification

Profiles can be:
- Imported from markdown files (parser reads the structure and loads it)
- Created manually
- Edited (individual micro-segments can be deleted without removing the whole profile)
- Deleted entirely

Currently seeded with two audience profiles:
1. **AI Strategy & Adoption** (4 micro-segments: The Urgent Transformer, The Transitioning Specialist, The Non-Technical Visionary, The Expertise-to-Audience Builder)
2. **AI-for-Experts Audience** (5 micro-segments: The Voice-Protective Creator, The Deck-Reaching Executive, The Speed-Drunk Founder, The Trick-Hunting Engineer, The Commoditization-Fearing Consultant)

### Topics

A research and brainstorming engine that synthesizes inputs from connected MCPs (Google Search Console, Google Analytics, Payload CMS) and audience data to generate topic suggestions. Each topic card has:
- **Title** - the topic
- **Angle** - the take or perspective
- **Target** - aligned audience micro-segment
- **CMS tags** - pre-tagged for eventual CMS push
- **Priority** - ranking/score (1-5)

Features:
- Generate topics using AI model + audience segment data + existing content awareness
- Sort by priority, date, or title
- Filter by segment or status
- Search across title, angle, target, tags
- Add, edit, delete topics manually
- "Draft" button creates a new draft from a topic card

### Drafts

Collaborative drafting workspace where the AI model generates first passes and the user iteratively refines through conversation. Key characteristics:
- Multiple concurrent drafts supported, each its own workspace
- Each draft selects a model, topic, target audience segment, active frameworks, and voice profile
- The model generates an initial draft using all that context
- The user responds by injecting personal material: stories, examples, client case studies, different takes, research
- The model reshapes the draft based on what the user adds, potentially shifting it significantly
- This back-and-forth is what makes the content authentic and "mine"
- Voice profile defaults to the user's default but can be swapped per draft

### Distributions

Where content crosses the finish line. Uses the Platform Profile to adapt content per platform:
- Mark a draft as published
- Select target platforms (LinkedIn, Facebook, Twitter/X, Email)
- Model generates platform-native promotional posts that drive traffic to the source article
- Each platform has its own hook patterns, structure rules, length guidance, CTA conventions, and link strategy
- Push the article to CMS or email via connected MCPs
- Generated promotional posts can be copied to clipboard

## The Full Pipeline

```
Settings (configure models, frameworks, audiences, voice, MCPs, anti-AI rules)
    |
    v
Audiences (import/create segment profiles with micro-segments)
    |
    v
Topics (AI generates topic ideas from MCP data + audience alignment)
    |
    v
Drafts (collaborative drafting with AI, injecting personal stories/examples)
    |
    v
Distributions (platform adaptation, promotional posts, publish to CMS/email)
```

## Technical Architecture

- **Electron** desktop app (macOS)
- **Main process** (main.js): IPC handlers for all CRUD operations, model API calls, file import/parsing, topic generation, draft generation, distribution generation
- **Preload** (preload.js): Context-isolated IPC bridge exposing the full API surface to the renderer
- **Renderer**: Vanilla JS with a lightweight view system (CC.views namespace), no framework
- **Data layer** (lib/): JSON file-based collections and documents stored in Electron's userData directory
  - store.js - Generic collection/document stores
  - seedData.js - Pre-loaded frameworks, anti-AI rules, voice profile, platform profile, audiences
  - parser.js - Markdown import parsers for audience profiles, voice profiles, platform profiles
  - modelClient.js - Model API client supporting OpenAI-compatible, Anthropic, and CLI-backed calls
- **Styling**: Cream and beige palette with dark orange accent (#c2410c). Collapsible sidebar. No brown.

## Design Principles

1. **Voice protection** - The Anti-AI rules and voice profiles exist to ensure content never sounds AI-generated
2. **Audience-first** - Every piece of content targets a specific micro-segment, scored against their goal pyramid and pain points
3. **Framework-driven** - Content structure is informed by selectable, composable frameworks across 6 categories
4. **Iterative refinement** - Drafts are not one-shot generation; they're collaborative conversations where user-injected material transforms the output
5. **Platform-native distribution** - Each platform gets content adapted to its specific rules, not generic cross-posting
6. **Importable intelligence** - All profiles (voice, platform, audience) are markdown files that can be imported, parsed, and loaded into the system
