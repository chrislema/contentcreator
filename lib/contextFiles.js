// Context File Generator
// Writes structured context files per draft for model consumption

const fs = require('fs');
const path = require('path');

function buildVoiceProfile(voice) {
  if (!voice) return null;

  const parts = [`# Voice Profile: ${voice.name}`];

  if (voice.identity) parts.push(`\n## Identity\n${voice.identity}`);
  if (voice.tone) parts.push(`\n## Tone\n${voice.tone}`);
  if (voice.humorStyle) parts.push(`\n## Humor Style\n${voice.humorStyle}`);
  if (voice.sentenceStructure) parts.push(`\n## Sentence Structure\n${voice.sentenceStructure}`);
  if (voice.vocabularyTendencies) parts.push(`\n## Vocabulary Tendencies\n${voice.vocabularyTendencies}`);
  if (voice.contentPhilosophy) parts.push(`\n## Content Philosophy\n${voice.contentPhilosophy}`);
  if (voice.openingMoves) parts.push(`\n## Opening Moves\n${voice.openingMoves}`);
  if (voice.closingMoves) parts.push(`\n## Closing Moves\n${voice.closingMoves}`);
  if (voice.contractions) parts.push(`\n## Contractions\n${voice.contractions}`);
  if (voice.punctuation) parts.push(`\n## Punctuation\n${voice.punctuation}`);
  if (voice.credibility) parts.push(`\n## Credibility\n${voice.credibility}`);
  if (voice.audienceRelationship) parts.push(`\n## Audience Relationship\n${voice.audienceRelationship}`);
  if (voice.antiPatterns) parts.push(`\n## Anti-Patterns\n${voice.antiPatterns}`);

  return parts.join('\n');
}

function buildAudience(segment) {
  if (!segment) return null;

  const parts = [`# Target Audience Segment: ${segment.name}`];

  if (segment.description) parts.push(`\n## Description\n${segment.description}`);
  if (segment.dominantForce) parts.push(`\n## Dominant Force\n${segment.dominantForce}`);

  if (segment.goalPyramid) {
    parts.push('\n## Goal Pyramid');
    if (segment.goalPyramid.level1) parts.push(`- Level 1 (Base): ${segment.goalPyramid.level1}`);
    if (segment.goalPyramid.level2) parts.push(`- Level 2: ${segment.goalPyramid.level2}`);
    if (segment.goalPyramid.level3) parts.push(`- Level 3: ${segment.goalPyramid.level3}`);
    if (segment.goalPyramid.level4) parts.push(`- Level 4 (Top): ${segment.goalPyramid.level4}`);
  }

  if (segment.invertedPainPyramid && segment.invertedPainPyramid.length) {
    parts.push('\n## Pain Points -> Inverted Goals');
    for (const p of segment.invertedPainPyramid) {
      parts.push(`- Pain: "${p.pain}" -> They want: "${p.invertedGoal}"`);
    }
  }

  if (segment.fourForces) {
    const f = segment.fourForces;
    parts.push('\n## Four Forces');
    if (f.push) parts.push(`- Push: ${f.push}`);
    if (f.magnetism) parts.push(`- Magnetism: ${f.magnetism}`);
    if (f.anxiety) parts.push(`- Anxiety: ${f.anxiety}`);
    if (f.habit) parts.push(`- Habit: ${f.habit}`);
    if (f.netForce) parts.push(`- Net Force: ${f.netForce}`);
  }

  if (segment.hiringMoments && segment.hiringMoments.length) {
    parts.push('\n## Hiring Moments');
    for (const h of segment.hiringMoments) {
      parts.push(`- ${h}`);
    }
  }

  return parts.join('\n');
}

function buildFrameworks(frameworks) {
  if (!frameworks || frameworks.length === 0) return null;

  // Group by category
  const byCat = {};
  for (const fw of frameworks) {
    const cat = fw.category || fw.type || 'General';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(fw);
  }

  const parts = ['# Active Frameworks'];

  for (const [cat, items] of Object.entries(byCat)) {
    parts.push(`\n## ${cat} (${items.length})`);
    for (const fw of items) {
      parts.push(`### ${fw.name}`);
      if (fw.description) parts.push(`${fw.description}`);
      if (fw.pairsWellWith && fw.pairsWellWith.length) {
        parts.push(`Pairs well with: ${fw.pairsWellWith.join(', ')}`);
      }
      parts.push('');
    }
  }

  return parts.join('\n');
}

function buildAntiAi(rules) {
  if (!rules || rules.length === 0) return null;

  const active = rules.filter((r) => r.active);
  if (active.length === 0) return null;

  const byCat = {};
  for (const r of active) {
    const cat = r.category || 'general';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(r.rule);
  }

  const catLabels = {
    'banned-words': 'Banned Words (never use)',
    'banned-phrases': 'Banned Phrases (never use)',
    'structural-patterns': 'Structural Patterns (never use)',
    'general': 'General Rules'
  };

  const parts = ['# Anti-AI Rules (never violate these)'];

  for (const [cat, rules] of Object.entries(byCat)) {
    const label = catLabels[cat] || cat;
    parts.push(`\n## ${label}`);
    for (const rule of rules) {
      parts.push(`- ${rule}`);
    }
  }

  return parts.join('\n');
}

// Generate context files for a draft, returns the directory path
function generateContextFiles(draftId, { voiceProfile, segment, frameworks, antiAiRules }) {
  const dir = path.join(require('os').tmpdir(), 'contentcreator-context', draftId);
  fs.mkdirSync(dir, { recursive: true });

  const files = {};

  // Voice
  const voiceContent = buildVoiceProfile(voiceProfile);
  if (voiceContent) {
    fs.writeFileSync(path.join(dir, '_voice.md'), voiceContent);
    files.voice = path.join(dir, '_voice.md');
  }

  // Audience
  const audienceContent = buildAudience(segment);
  if (audienceContent) {
    fs.writeFileSync(path.join(dir, '_audience.md'), audienceContent);
    files.audience = path.join(dir, '_audience.md');
  }

  // Frameworks
  const frameworksContent = buildFrameworks(frameworks);
  if (frameworksContent) {
    fs.writeFileSync(path.join(dir, '_frameworks.md'), frameworksContent);
    files.frameworks = path.join(dir, '_frameworks.md');
  }

  // Anti-AI
  const antiAiContent = buildAntiAi(antiAiRules);
  if (antiAiContent) {
    fs.writeFileSync(path.join(dir, '_anti-ai.md'), antiAiContent);
    files.antiAi = path.join(dir, '_anti-ai.md');
  }

  // Combined instruction (short system prompt)
  const instruction = `You are a content creation assistant helping draft articles and blog posts for ${voiceProfile?.name || 'the author'}.

Context files have been provided. Study them carefully:
- _voice.md: Your writing voice. Match it exactly. This is how you sound, not how an AI sounds.
- _audience.md: The specific audience segment you are writing for. Speak to their pains and goals.
- _frameworks.md: Structural frameworks to inform how you organize the content.
- _anti-ai.md: Rules you must NEVER violate. These prevent AI-sounding output.

Write in first person as the voice profile describes. Target the audience segment directly. Use frameworks to structure. Never sound like AI-generated content.

When the user provides a story, example, case study, or different take, weave it into the draft naturally. Let their material transform the piece.`;

  return { dir, files, instruction };
}

module.exports = { generateContextFiles, buildVoiceProfile, buildAudience, buildFrameworks, buildAntiAi };
