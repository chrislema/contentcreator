// Topic Intelligence Layer
// Reads cached analytics data from existing content (pre-enriched via Utilities)
// No live API calls during generation - all data comes from local stores

// ── Existing Content Analysis ────────────────────────────────────

function gatherContent(contentStore) {
  const articles = contentStore.list();
  if (!articles || articles.length === 0) return null;

  // Build summaries: title + analysis (or description fallback)
  const summaries = articles.map((a) => ({
    title: a.title,
    analysis: a.analysis || '',
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

  parts.push('\nPublished articles with summaries. CRITICAL: Do NOT suggest topics that overlap with these. Compare your candidates against these summaries before scoring Content Gap:');
  for (const s of content.summaries) {
    parts.push(`- ${s.title}`);
    const summary = s.analysis || s.description || '';
    if (summary) parts.push(`  Summary: ${summary}`);
  }

  parts.push('\nTag distribution (shows dominant themes):');
  parts.push(content.tagFrequency.map((t) => `- ${t.tag}: ${t.count} articles`).join('\n'));

  return parts.join('\n');
}

// ── Cached Analytics (from existing content, no live API calls) ──

// Aggregate cached GSC queries from all articles
function gatherCachedGSC(contentStore) {
  const articles = contentStore.list();
  if (!articles || articles.length === 0) return null;

  const queryMap = {};
  for (const a of articles) {
    const queries = a.analytics?.topQueries || [];
    for (const q of queries) {
      if (!q.query) continue;
      if (!queryMap[q.query]) {
        queryMap[q.query] = { query: q.query, clicks: 0, impressions: 0, position_sum: 0, position_count: 0 };
      }
      queryMap[q.query].clicks += q.clicks || 0;
      queryMap[q.query].impressions += q.impressions || 0;
      queryMap[q.query].position_sum += q.position || 0;
      queryMap[q.query].position_count += 1;
    }
  }

  const rows = Object.values(queryMap).map((q) => ({
    query: q.query,
    clicks: q.clicks,
    impressions: q.impressions,
    ctr: q.impressions > 0 ? q.clicks / q.impressions : 0,
    position: q.position_count > 0 ? q.position_sum / q.position_count : 0
  }));

  if (rows.length === 0) return null;

  const sorted = rows.sort((a, b) => b.impressions - a.impressions);
  const opportunities = sorted
    .filter((r) => r.impressions > 500 && r.ctr < 0.03)
    .slice(0, 10);

  return {
    totalQueries: rows.length,
    topQueries: sorted.slice(0, 20),
    opportunities
  };
}

function formatGSCForPrompt(gsc) {
  if (!gsc) return 'No Google Search Console data available (run Analytics Enrichment in Utilities).';

  const parts = ['GOOGLE SEARCH CONSOLE DATA (cached from article analytics):'];

  parts.push('\nTop search queries by impressions (shows what people search to find your articles):');
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

// Aggregate cached GA4 data from all articles
function gatherCachedGA(contentStore) {
  const articles = contentStore.list();
  if (!articles || articles.length === 0) return null;

  const topPages = articles
    .filter((a) => a.analytics?.last30d && a.pagePath)
    .map((a) => ({
      title: a.title,
      path: a.pagePath,
      views: a.analytics.last30d.pageViews || 0,
      engagementRate: a.analytics.last30d.engagementRate || 0,
      activeUsers: a.analytics.last30d.activeUsers || 0
    }))
    .filter((p) => p.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 15);

  if (topPages.length === 0) return null;

  return { topPages };
}

function formatGAForPrompt(ga) {
  if (!ga) return 'No Google Analytics data available (run Analytics Enrichment in Utilities).';

  const parts = ['GOOGLE ANALYTICS DATA (cached - top performing pages by 30-day traffic):'];

  parts.push('\nBest performing articles by page views (shows what resonates):');
  parts.push(ga.topPages.map((r) =>
    `- ${r.title} (${r.path}): ${r.views} views, ${(r.engagementRate * 100).toFixed(0)}% engagement, ${r.activeUsers} users`
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

  // Cached GSC (from article analytics, no live API call)
  const gsc = gatherCachedGSC(stores.existing);
  if (gsc) sources.used.push('GSC data (cached)');
  else sources.skipped.push('GSC (run Analytics Enrichment in Utilities)');

  // Cached GA4 (from article analytics, no live API call)
  const ga = gatherCachedGA(stores.existing);
  if (ga) sources.used.push('GA data (cached)');
  else sources.skipped.push('GA (run Analytics Enrichment in Utilities)');

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
