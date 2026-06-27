function normalizeText(text = '') {
  return String(text)
    .replace(/\0/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function trimDocsForPrompt(docs, totalLimit = 65000) {
  const usable = docs.filter((doc) => doc.text && doc.text.trim());
  if (usable.length === 0) return [];

  const perDocLimit = Math.max(6000, Math.floor(totalLimit / usable.length));
  let remaining = totalLimit;

  return usable.map((doc) => {
    const text = normalizeText(doc.text);
    const citationHint = normalizeText(doc.firstPageText || text).slice(0, 2500);
    const limit = Math.min(perDocLimit, remaining);
    remaining = Math.max(0, remaining - limit);
    return {
      fileName: doc.fileName,
      pageCount: doc.pageCount || 0,
      charCount: doc.charCount || text.length,
      citationHint,
      text: text.slice(0, limit)
    };
  });
}

function formatDocsForPrompt(docs) {
  return trimDocsForPrompt(docs)
    .map((doc, index) => [
      `PAPER ${index + 1}: ${doc.fileName}`,
      `Pages: ${doc.pageCount || 'unknown'}`,
      `Extracted characters: ${doc.charCount}`,
      '',
      'Citation candidate text from the PDF title/citation area:',
      doc.citationHint || 'No citation candidate text found.',
      '',
      doc.text
    ].join('\n'))
    .join('\n\n---\n\n');
}

function buildResearchPrompt(docs, context, sources) {
  const paperText = formatDocsForPrompt(docs);
  const sysPrompt = `You are an elite research-to-content strategist for Chris Lema, who writes about AI adoption, coding, and business strategy.

You are analyzing one peer-reviewed journal paper PDF and turning the strongest practical insight into one content idea.

Use the research carefully:
- Identify the paper's real finding, not just the abstract's topic.
- Translate the finding into a practical "aha" for operators, builders, leaders, or AI adopters.
- Preserve caveats and limitations so the content does not overclaim.
- Prefer surprising, useful, evidence-backed angles over generic summaries.
- Extract citation metadata from the PDF text itself, especially title pages, headers, footers, and citation blocks.
- Use only citation details present in the PDF text; if the PDF only says "et al.", preserve that rather than inventing names.
- Return one idea for this paper, not a synthesis across unrelated papers.

You also have local content intelligence:

${context}

SCORING RUBRIC - Score the research-backed idea against these criteria (0-10 each, total 0-50):
1. SEARCH DEMAND: Related GSC query demand or likely demand from audience pain.
2. PERFORMANCE POTENTIAL: Fit with proven GA/content themes.
3. CONTENT GAP: How clearly this avoids duplicating existing content.
4. AUDIENCE FIT: Strength of fit for one specific audience segment.
5. UNIQUENESS: How non-obvious, evidence-backed, or contrarian the angle is.

Return ONLY one valid JSON object:
{
  "title": "Specific content title or subject",
  "subject": "Short subject label",
  "angle": "1-2 sentences describing the content angle",
  "concept": "The core concept in plain English",
  "aha": "The surprising research-backed insight",
  "finding": "What the paper(s) actually found",
  "whyItMatters": "Why this matters to the target audience",
  "evidence": ["2-4 concise evidence points from the paper(s)"],
  "caveats": ["1-3 caveats, limits, or overclaim warnings"],
  "citations": [
    {
      "sourceFile": "Exact uploaded PDF filename",
      "articleTitle": "Journal article title exactly as shown in the PDF",
      "authors": ["Author names exactly as shown in the PDF"],
      "journal": "Journal or publication name",
      "publicationDate": "Full publication date if shown, otherwise month/year or year",
      "year": "Publication year",
      "volume": "Volume if shown",
      "issue": "Issue if shown",
      "pages": "Page range or page count if shown",
      "articleNumber": "Article number if shown",
      "doi": "DOI if shown",
      "url": "Source URL if shown",
      "rawCitation": "The citation text from the PDF, if present"
    }
  ],
  "target": "Exact audience segment name from the audience list",
  "cmsTags": ["tag1", "tag2", "tag3"],
  "priority": 1-5,
  "scores": {
    "searchDemand": 0-10,
    "performancePotential": 0-10,
    "contentGap": 0-10,
    "audienceFit": 0-10,
    "uniqueness": 0-10,
    "total": 0-50
  },
  "rationale": "1-2 sentences citing research and data sources behind the recommendation"
}`;

  const userPrompt = `Analyze this uploaded research PDF and produce one research-backed content card for this paper.

Data sources available for scoring: ${sources.used.join(', ') || 'none'}.

PDF TEXT:

${paperText}`;

  return { sysPrompt, userPrompt };
}

function parseResearchResponse(response) {
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  return JSON.parse(jsonMatch ? jsonMatch[0] : response);
}

module.exports = { buildResearchPrompt, parseResearchResponse };
