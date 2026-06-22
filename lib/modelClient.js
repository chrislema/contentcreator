const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);

// Build a system prompt for content drafting
function buildDraftSystemPrompt({ voiceProfile, segment, frameworks, antiAiRules }) {
  const parts = [];

  parts.push('You are a content creation assistant helping draft articles, blog posts, and social content.');

  if (voiceProfile) {
    parts.push(`\n## VOICE PROFILE: ${voiceProfile.name}`);
    if (voiceProfile.identity) parts.push(`Identity: ${voiceProfile.identity}`);
    if (voiceProfile.tone) parts.push(`Tone: ${voiceProfile.tone}`);
    if (voiceProfile.sentenceStructure) parts.push(`Sentence structure: ${voiceProfile.sentenceStructure}`);
    if (voiceProfile.vocabularyTendencies) parts.push(`Vocabulary: ${voiceProfile.vocabularyTendencies}`);
    if (voiceProfile.contentPhilosophy) parts.push(`Content philosophy: ${voiceProfile.contentPhilosophy}`);
    if (voiceProfile.openingMoves) parts.push(`Opening moves: ${voiceProfile.openingMoves}`);
    if (voiceProfile.closingMoves) parts.push(`Closing moves: ${voiceProfile.closingMoves}`);
    if (voiceProfile.contractions) parts.push(`Contractions: ${voiceProfile.contractions}`);
    if (voiceProfile.punctuation) parts.push(`Punctuation: ${voiceProfile.punctuation}`);
    if (voiceProfile.audienceRelationship) parts.push(`Audience relationship: ${voiceProfile.audienceRelationship}`);
    if (voiceProfile.antiPatterns) parts.push(`Anti-patterns: ${voiceProfile.antiPatterns}`);
  }

  if (segment) {
    parts.push(`\n## TARGET AUDIENCE MICRO-SEGMENT: ${segment.name}`);
    parts.push(`Description: ${segment.description || ''}`);
    if (segment.goalPyramid) {
      parts.push('Goal Pyramid:');
      if (segment.goalPyramid.level1) parts.push(`  Level 1 (Base): ${segment.goalPyramid.level1}`);
      if (segment.goalPyramid.level2) parts.push(`  Level 2: ${segment.goalPyramid.level2}`);
      if (segment.goalPyramid.level3) parts.push(`  Level 3: ${segment.goalPyramid.level3}`);
      if (segment.goalPyramid.level4) parts.push(`  Level 4: ${segment.goalPyramid.level4}`);
    }
    if (segment.invertedPainPyramid && segment.invertedPainPyramid.length) {
      parts.push('Pain Points:');
      for (const p of segment.invertedPainPyramid) {
        parts.push(`  Pain: "${p.pain}" -> They want: "${p.invertedGoal}"`);
      }
    }
    if (segment.fourForces) {
      const f = segment.fourForces;
      parts.push(`Forces: Push=${f.push}, Magnetism=${f.magnetism}, Anxiety=${f.anxiety}, Habit=${f.habit}`);
    }
    if (segment.hiringMoments && segment.hiringMoments.length) {
      parts.push(`Hiring Moments: ${segment.hiringMoments.join('; ')}`);
    }
  }

  if (frameworks && frameworks.length) {
    parts.push('\n## ACTIVE FRAMEWORKS TO USE:');
    for (const fw of frameworks) {
      parts.push(`- ${fw.name} (${fw.type}, Stage ${fw.stage}): ${fw.description}`);
      if (fw.pairsWellWith && fw.pairsWellWith.length) {
        parts.push(`  Pairs well with: ${fw.pairsWellWith.join(', ')}`);
      }
    }
  }

  if (antiAiRules && antiAiRules.length) {
    const active = antiAiRules.filter((r) => r.active);
    if (active.length) {
      parts.push('\n## ANTI-AI RULES (never violate these):');
      const byCat = {};
      for (const r of active) {
        if (!byCat[r.category]) byCat[r.category] = [];
        byCat[r.category].push(r.rule);
      }
      for (const [cat, rules] of Object.entries(byCat)) {
        parts.push(`${cat}: ${rules.join(', ')}`);
      }
    }
  }

  parts.push('\nWrite in first person as the voice profile describes. Use the frameworks to structure the content. Target the audience segment directly. Never sound like AI-generated content.');
  parts.push('When the user provides a story, example, case study, or different take, weave it into the draft naturally. Let their material transform the piece.');

  return parts.join('\n');
}

// Call an OpenAI-compatible API
async function callOpenAICompatible(config, messages, maxTokens) {
  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
  const body = {
    model: config.model,
    messages,
    max_tokens: maxTokens || config.maxOutputTokens || 8192,
    temperature: 0.7
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

// Call Anthropic API
async function callAnthropic(config, messages, maxTokens) {
  const url = `${config.baseUrl.replace(/\/$/, '')}/v1/messages`;
  const systemMsg = messages.find((m) => m.role === 'system');
  const chatMsgs = messages.filter((m) => m.role !== 'system');

  const body = {
    model: config.model,
    max_tokens: maxTokens || config.maxOutputTokens || 8192,
    messages: chatMsgs.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  return data.content[0].text;
}

// Call a CLI-backed model (e.g., claude code, codex)
async function callCLI(config, messages) {
  const systemMsgs = messages.filter((m) => m.role === 'system');
  const chatMsgs = messages.filter((m) => m.role !== 'system');

  // Build the conversation as a single prompt for the CLI
  const prompt = chatMsgs.map((m) => {
    if (m.role === 'assistant') return `Assistant: ${m.content}`;
    return m.content;
  }).join('\n\n');

  const systemPrompt = systemMsgs.map((m) => m.content).join('\n\n');

  // Resolve the CLI binary - try the configured path, then PATH
  const cliBin = config.cliPath || 'claude';

  // Build args based on which CLI this is
  let args;
  if (cliBin.includes('claude')) {
    // Claude Code CLI: claude -p "prompt" --model <model> --system-prompt <system>
    args = ['-p', prompt];
    if (config.model) args.push('--model', config.model);
    if (systemPrompt) args.push('--system-prompt', systemPrompt);
  } else if (cliBin.includes('codex')) {
    // OpenAI Codex CLI: codex "prompt" --model <model>
    args = [prompt];
    if (config.model) args.push('--model', config.model);
  } else {
    // Generic fallback: pass prompt as positional arg
    args = [prompt];
  }

  const { stdout } = await execFileAsync(cliBin, args, {
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000,
    env: { ...process.env }
  });
  return stdout.trim();
}

// Main entry: call the right backend based on connectionType
async function chatCompletion(modelConfig, messages, maxTokens) {
  if (modelConfig.connectionType === 'oauth-cli') {
    return callCLI(modelConfig, messages);
  }
  if (modelConfig.provider === 'anthropic') {
    return callAnthropic(modelConfig, messages, maxTokens);
  }
  return callOpenAICompatible(modelConfig, messages, maxTokens);
}

module.exports = { buildDraftSystemPrompt, chatCompletion };
