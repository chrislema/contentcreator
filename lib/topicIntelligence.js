// Topic Intelligence Layer
// Gathers data from all available sources and formats it for the model

const { callTool } = require('./mcpClient');

// ── Existing Content Analysis ────────────────────────────────────

function gatherContent(contentStore) {
  const articles = contentStore.list();
  if (!articles || articles.length === 0) return null;

  // Build summaries: title + description for each article
  const summaries = articles.map((a) => ({
    title: a.title,
    description: a.description || a.excerpt || '',
    tags: a.tags || [],
    date: a.date || ''
  }));

  // Tag frequency for theme analysis
  const tagMap = {};
  for (const a of articles) {
    for (const tag of (a.tags || [])) {
      tagMap[tag] = (tagMap[tag] || 0) + 1;
    }
  }
  const tagFrequency = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);

  return {
    count: articles.length,
    summaries,
    tagFrequency
  };
}

function formatContentForPrompt(content) {
  if (!content) return 'No existing content library available.';

  const parts = [`EXISTING CONTENT LIBRARY (${content.count} articles):`];

  parts.push('\nPublished articles (title + description). Do NOT suggest duplicates or near-duplicates:');
  for (const s of content.summaries) {
    parts.push(`- ${s.title}`);
    if (s.description) parts.push(`  Summary: ${s.description}`);
  }

  parts.push('\nTag distribution (shows dominant themes):');
  parts.push(content.tagFrequency.map((t) => `- ${t.tag}: ${t.count} articles`).join('\n'));

  return parts.join('\n');
}

// ── Google Search Console ────────────────────────────────────────

async function gatherGSC(mcp) {
  if (!mcp || !mcp.connected) return null;

  const result = await callTool(mcp, 'gsc_search_analytics', {
    dimensions: ['query'],
    startDate: '90daysAgo',
    endDate: 'today',
    rowLimit: 30
  });

  const data = JSON.parse(result);
  const rows = data.data?.rows || data.rows || [];

  if (!rows.length) return null;

  // Sort by impressions to find demand
  const sorted = [...rows].sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

  // Identify opportunities: high impressions, low CTR (< 3%)
  const opportunities = sorted
    .filter((r) => (r.impressions || 0) > 500 && (r.ctr || 0) < 0.03)
    .sort((a, b) => (b.impressions || 0) - (a.impressions || 0));

  return {
    totalQueries: rows.length,
    topQueries: sorted.slice(0, 20),
    opportunities
  };
}

function formatGSCForPrompt(gsc) {
  if (!gsc) return 'No Google Search Console data available (MCP not connected).';

  const parts = ['GOOGLE SEARCH CONSOLE DATA (last 90 days):'];

  parts.push('\nTop search queries by impressions (shows what people search to find you):');
  parts.push(gsc.topQueries.map((r) =>
    `- "${r.query}": ${r.impressions} impressions, ${r.clicks} clicks, ${(r.ctr * 100).toFixed(1)}% CTR, position ${r.position.toFixed(1)}`
  ).join('\n'));

  if (gsc.opportunities.length) {
    parts.push('\nHigh-opportunity queries (many impressions but low click-through - content gap):');
    parts.push(gsc.opportunities.map((r) =>
      `- "${r.query}": ${r.impressions} impressions but only ${(r.ctr * 100).toFixed(1)}% CTR`
    ).join('\n'));
  }

  return parts.join('\n');
}

// ── Google Analytics 4 ───────────────────────────────────────────

async function gatherGA(mcp) {
  if (!mcp || !mcp.connected) return null;

  const result = await callTool(mcp, 'ga4_run_report', {
    dimensions: ['pagePath'],
    metrics: ['screenPageViews', 'engagementRate', 'activeUsers'],
    startDate: '90daysAgo',
    endDate: 'today',
    rowLimit: 20
  });

  const data = JSON.parse(result);
  const rows = data.data?.rows || data.rows || [];

  if (!rows.length) return null;

  // Filter out non-article pages, sort by views
  const articles = rows
    .filter((r) => {
      const p = r.pagePath || '';
      return p !== '/' && p !== '/blog' && p !== '/blog/' && !p.startsWith('/contact') && !p.startsWith('/about') && p.length > 3;
    })
    .map((r) => ({
      path: r.pagePath,
      views: parseInt(r.screenPageViews || r['Screen Page Views'] || '0'),
      engagementRate: parseFloat(r.engagementRate || r['Engagement rate'] || '0'),
      activeUsers: parseInt(r.activeUsers || r['Active users'] || '0')
    }))
    .sort((a, b) => b.views - a.views);

  return { topPages: articles.slice(0, 15) };
}

function formatGAForPrompt(ga) {
  if (!ga) return 'No Google Analytics data available (MCP not connected).';

  const parts = ['GOOGLE ANALYTICS DATA (last 90 days - top performing pages):'];

  parts.push('\nBest performing articles by page views (shows what resonates):');
  parts.push(ga.topPages.map((r) =>
    `- ${r.path}: ${r.views} views, ${(r.engagementRate * 100).toFixed(0)}% engagement, ${r.activeUsers} users`
  ).join('\n'));

  return parts.join('\n');
}

// ── Audience Segments ────────────────────────────────────────────

function gatherAudiences(audienceStore) {
  const audiences = audienceStore.list();
  if (!audiences || audiences.length === 0) return null;

  return audiences.map((a) => ({
    name: a.name,
    dominantForce: a.dominantForce || '',
    pains: (a.invertedPainPyramid || []).map((p) => p.pain),
    goals: a.goalPyramid || {}
  }));
}

function formatAudiencesForPrompt(audiences) {
  if (!audiences || !audiences.length) return 'No audience segments available.';

  const parts = [`TARGET AUDIENCE MICRO-SEGMENTS (${audiences.length} segments):`];

  parts.push('\nEach topic should target ONE specific segment. Generic topics that fit all segments equally are too broad.');

  for (const a of audiences) {
    parts.push(`\n- ${a.name} (${a.dominantForce})`);
    parts.push(`  Key pains: ${a.pains.join('; ')}`);
    if (a.goals && a.goals.level1) {
      parts.push(`  Base goal: ${a.goals.level1}`);
    }
  }

  return parts.join('\n');
}

// ── Ranking Framework ────────────────────────────────────────────

const RANKING_RUBRIC = `
RANKING ALGORITHM - Score every topic candidate against these 5 criteria (0-10 each, total 0-50):

1. SEARCH DEMAND (0-10): Is there real search volume for this topic based on GSC data? High impressions on related queries = higher score. No search data = moderate score if audience demand is strong.

2. PERFORMANCE POTENTIAL (0-10): Does this topic align with proven GA traffic patterns? Similar to top-performing pages = higher score.

3. CONTENT GAP (0-10): Is this topic NOT already covered in the existing content library? Completely new angle on an existing topic = moderate score. Brand new topic = higher score. Duplicate of existing = 0.

4. AUDIENCE FIT (0-10): How strongly does this topic address a specific segment's pain or goal? Must name which segment it targets. Generic appeal to all segments = lower score.

5. UNIQUENESS (0-10): Is the angle contrarian, non-obvious, or experience-backed? Generic "how to" = lower score. Surprising insight or contrarian take = higher score.

Sort all 25 topics by total score, highest first.`;

const DISTRIBUTION_RULES = `
DISTRIBUTION REQUIREMENTS (CRITICAL - apply these before scoring):

1. SEGMENT SPREAD: Distribute topics across AT LEAST 6 of the 9 audience segments. No single segment should account for more than 25% of topics (max 6 topics per segment). Track which segments you've assigned and consciously diversify.

2. TOPIC DIVERSITY: No more than 3 topics should cover the same core theme (e.g., "Claude Skills", "AI agents", "prompt engineering"). If GSC shows heavy demand for one topic, spread it across different segments and angles rather than generating 10 variations of the same article.

3. CONTENT ECOSYSTEM: Look at the existing content tags. If one tag already has many articles, that theme is well-covered. Prioritize themes that are underrepresented relative to their search demand or audience need.

4. SEARCH DEMAND BALANCE: Some topics will have obvious high search demand (easy picks). Include those, but also include topics that serve underserved segments even if search volume is lower. Balance SEO opportunity with strategic positioning.`;

// ── Main Gather Function ─────────────────────────────────────────

async function gatherAll(stores, settings) {
  const sources = { used: [], skipped: [] };

  // Existing content
  const content = gatherContent(stores.existing);
  if (content) sources.used.push(`${content.count} articles`);
  else sources.skipped.push('existing content');

  // GSC
  const googleMcp = (settings.mcps || []).find((m) => m.connected && m.name && m.name.toLowerCase().includes('google'));
  const gsc = await gatherGSC(googleMcp).catch(() => null);
  if (gsc) sources.used.push('GSC data');
  else sources.skipped.push('GSC');

  // GA4
  const ga = await gatherGA(googleMcp).catch(() => null);
  if (ga) sources.used.push('GA data');
  else sources.skipped.push('GA');

  // Audiences
  const audiences = gatherAudiences(stores.audiences);
  if (audiences) sources.used.push(`${audiences.length} audience segments`);
  else sources.skipped.push('audiences');

  // Build combined context
  const context = [
    formatContentForPrompt(content),
    formatGSCForPrompt(gsc),
    formatGAForPrompt(ga),
    formatAudiencesForPrompt(audiences)
  ].join('\n\n---\n\n');

  return { context, sources };
}

// ── Build the Full Prompt ────────────────────────────────────────

function buildTopicPrompt(context, sources) {
  const sysPrompt = `You are an elite content strategist and SEO expert analyzing data for Chris Lema, who writes about AI adoption, coding, and business strategy.

You have access to real data from multiple sources:

${context}

${RANKING_RUBRIC}

${DISTRIBUTION_RULES}

YOUR TASK:
Generate 25 topic ideas based on ALL the data above. Each topic must be strategically grounded in the data, not generic.

- Use GSC data to identify what people are ACTUALLY searching for. High-impression queries signal demand. Low-CTR queries on topics you rank for signal opportunity.
- Use GA data to understand what content formats and themes already perform well. Write more of what works.
- Use the existing content library to AVOID duplicates. If a topic overlaps with an existing article, it must have a genuinely different angle (different segment, contrarian take, new development).
- Use audience segments to ensure each topic targets a specific persona. The angle should speak to their specific pain or goal.

Do NOT suggest:
- Generic "what is X" or "how to X" topics unless there's strong search demand
- Topics that duplicate existing articles without a fresh angle
- Topics so broad they could apply to any audience

Before returning your final list, verify:
- At least 6 different segments are represented
- No single theme has more than 3 topics
- No single segment has more than 6 topics

Return ONLY a valid JSON array of 25 objects, sorted by total score (highest first). Each object:
{
  "title": "Compelling, specific title",
  "angle": "1-2 sentences on the unique take",
  "target": "Exact segment name from the audience list",
  "cmsTags": ["tag1", "tag2", "tag3"],
  "priority": 1-5 (5 = highest priority, mapped from total score: 45-50=5, 38-44=4, 30-37=3, 20-29=2, below 20=1),
  "scores": {
    "searchDemand": 0-10,
    "performancePotential": 0-10,
    "contentGap": 0-10,
    "audienceFit": 0-10,
    "uniqueness": 0-10,
    "total": 0-50
  },
  "rationale": "1-2 sentences citing which data source(s) drove this suggestion"
}

Return ONLY the JSON array. No markdown, no explanation.`;

  const userPrompt = `Based on the data provided, generate 25 strategically ranked topic ideas. Data sources used: ${sources.used.join(', ') || 'none'}.

The existing content library above shows what's already covered. Generate topics that fill gaps, ride proven search demand, and target specific audience segments.`;

  return { sysPrompt, userPrompt };
}

module.exports = { gatherAll, buildTopicPrompt };
