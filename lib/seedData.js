// ── Frameworks (62 across 6 categories) ──────────────────────────
const FRAMEWORKS = [
  // Insight Prompts (11) - Stage 1
  { name: 'Belief Archaeology', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Excavates how your thinking changed over time to build credibility through intellectual honesty.', pairsWellWith: ['Evolution Story', 'Transformation Telescope', 'Great Paradox', 'Chronological Arc', 'Identity Consistency'] },
  { name: "Contrarian's Truth", category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Identifies counter-intuitive truths that challenge mainstream assumptions.', pairsWellWith: ['Myth Killer', 'Contrarian Position', 'Great Paradox', 'Contrast Reveal', 'Breaking False Beliefs'] },
  { name: 'Success Archaeology', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Reverse-engineers the invisible factors behind visible successes.', pairsWellWith: ['Success Dissector', 'Authority Proof', 'Unique Method', 'Chronological Arc', 'Authority Transfer'] },
  { name: 'Leverage Detector', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Identifies the 80/20 activities that produce disproportionate results.', pairsWellWith: ['Framework Builder', 'Specificity Amplifier', 'Linear Roadmap', 'Chronological Arc', 'Speed and Ease'] },
  { name: 'Future Investment Oracle', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Generates predictive insights about where a market or practice is heading.', pairsWellWith: ['Prediction Engine', 'Time-Bound Warning', 'Visual Framework', 'Parallel Track', 'Cost of Inaction'] },
  { name: 'Intersection Discovery', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Finds novel connections between unrelated domains.', pairsWellWith: ['Industry Translator', 'Unexpected Comparison', 'Visual Framework', 'Nested Story', 'Contrast Principle'] },
  { name: 'Breakthrough Archaeology', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Identifies the internal shifts that created external breakthroughs.', pairsWellWith: ['Mistake Confessor', 'Transformation Telescope', 'Accumulation Effect', 'In Medias Res', 'Breaking False Beliefs'] },
  { name: 'Failure Autopsy', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Conducts forensic analysis of failures to extract transferable lessons.', pairsWellWith: ['Single Case Deep Dive', 'Problem Agitation', 'Enemy Identification', 'In Medias Res', 'Cost of Inaction'] },
  { name: 'Uncomfortable Truth', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Surfaces insights the creator has been self-censoring.', pairsWellWith: ['Controversy Creator', 'Contrarian Position', 'Enemy Identification', 'Contrast Reveal', 'Hidden Problem'] },
  { name: 'Pattern Recognition', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Extracts recurring patterns across multiple situations.', pairsWellWith: ['Framework Builder', 'Specificity Amplifier', 'Accumulation Effect', 'Nested Story', 'Authority Transfer'] },
  { name: 'Advice to Past Self', category: 'insight-prompts', type: 'insight-prompt', stage: 1, description: 'Generates concrete, actionable advice for a past version of the creator.', pairsWellWith: ['Day in the Life', 'Permission Giver', 'Linear Roadmap', 'Chronological Arc', 'Identity Consistency'] },

  // Content Formats (14) - Stage 1, 3
  { name: 'Myth Killer', category: 'content-formats', type: 'content-format', stage: 1, description: 'Dismantles widely held beliefs using evidence and alternative practices.', pairsWellWith: ["Contrarian's Truth", 'Myth-Busting Hook', 'Great Paradox', 'Contrast Reveal', 'Breaking False Beliefs'] },
  { name: 'Prediction Engine', category: 'content-formats', type: 'content-format', stage: 1, description: 'Makes time-bound industry predictions with evidence and preparation guides.', pairsWellWith: ['Future Investment Oracle', 'Time-Bound Warning', 'Visual Framework', 'Parallel Track', 'Cost of Inaction'] },
  { name: 'Industry Translator', category: 'content-formats', type: 'content-format', stage: 1, description: 'Makes complex or technical concepts accessible through extended analogy.', pairsWellWith: ['Intersection Discovery', 'Desire-Obstacle Elimination', 'Visual Framework', 'Nested Story', 'Speed and Ease'] },
  { name: 'Problem Solver', category: 'content-formats', type: 'content-format', stage: 1, description: 'Provides diagnostic checklists and actionable fixes for specific problems.', pairsWellWith: ['Leverage Detector', 'Problem Agitation', 'Linear Roadmap', 'Chronological Arc', 'Speed and Ease'] },
  { name: 'Controversy Creator', category: 'content-formats', type: 'content-format', stage: 1, description: 'Takes a defensible provocative position and backs it with evidence.', pairsWellWith: ['Uncomfortable Truth', 'Contrarian Position', 'Enemy Identification', 'Contrast Reveal', 'Breaking False Beliefs'] },
  { name: 'Framework Builder', category: 'content-formats', type: 'content-format', stage: 1, description: 'Presents a named, systematic methodology with clear steps.', pairsWellWith: ['Leverage Detector', 'Specificity Amplifier', 'Unique Method', 'Chronological Arc', 'Speed and Ease'] },
  { name: 'Mistake Confessor', category: 'content-formats', type: 'content-format', stage: 1, description: 'Builds credibility through vulnerable confession of specific mistakes.', pairsWellWith: ['Failure Autopsy', 'Authority Proof', 'Enemy Identification', 'In Medias Res', 'Cost of Inaction'] },
  { name: 'Comparison Master', category: 'content-formats', type: 'content-format', stage: 1, description: 'Provides definitive, fair comparisons between competing options.', pairsWellWith: ['Pattern Recognition', 'Resource Reveal', 'Best of Both Worlds', 'Parallel Track', 'Contrast Principle'] },
  { name: 'Industry Insider', category: 'content-formats', type: 'content-format', stage: 1, description: 'Shares behind-the-scenes knowledge from insider access.', pairsWellWith: ['Uncomfortable Truth', 'Insider Intelligence', 'Enemy Identification', 'Nested Story', 'Authority Transfer'] },
  { name: 'Success Dissector', category: 'content-formats', type: 'content-format', stage: 1, description: 'Reveals hidden factors behind famous or notable successes.', pairsWellWith: ['Success Archaeology', 'Authority Proof', 'Unique Method', 'Nested Story', 'Authority Transfer'] },
  { name: 'Anti-Advice', category: 'content-formats', type: 'content-format', stage: 1, description: 'Provides clarity through prohibition: what NOT to do.', pairsWellWith: ['Leverage Detector', 'Myth-Busting Hook', 'Inversion', 'Contrast Reveal', 'Speed and Ease'] },
  { name: 'Day in the Life', category: 'content-formats', type: 'content-format', stage: 1, description: 'Shows how excellence actually operates through descriptive observation.', pairsWellWith: ['Advice to Past Self', 'Identity Wedge', 'Accumulation Effect', 'Chronological Arc', 'Paint Mental Pictures'] },
  { name: 'Evolution Story', category: 'content-formats', type: 'content-format', stage: 1, description: 'Builds credibility by showing how thinking changed through distinct phases.', pairsWellWith: ['Belief Archaeology', 'Transformation Telescope', 'Accumulation Effect', 'Chronological Arc', 'Identity Consistency'] },
  { name: 'Single Case Deep Dive', category: 'content-formats', type: 'content-format', stage: 1, description: 'Extracts maximum learning from one thoroughly examined story.', pairsWellWith: ['Failure Autopsy', 'Authority Proof', 'Enemy Identification', 'Chronological Arc', 'Paint Mental Pictures'] },

  // Headline Formulas (13) - Stage 2
  { name: 'Desire-Obstacle Elimination', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Promises a desired outcome while removing a perceived barrier.', pairsWellWith: ['Industry Translator', 'Problem Solver', 'Linear Roadmap', 'Chronological Arc', 'Speed and Ease'] },
  { name: 'Authority Proof', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Leads with specific, quantifiable evidence of real results.', pairsWellWith: ['Single Case Deep Dive', 'Mistake Confessor', 'Success Dissector', 'In Medias Res', 'Authority Transfer'] },
  { name: 'Myth-Busting Hook', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Challenges an established belief to create cognitive dissonance.', pairsWellWith: ['Myth Killer', 'Controversy Creator', 'Great Paradox', 'Contrast Reveal', 'Breaking False Beliefs'] },
  { name: 'Specificity Amplifier', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Uses precise numbers and details to signal direct experience.', pairsWellWith: ['Framework Builder', 'Pattern Recognition', 'Unique Method', 'Chronological Arc', 'Authority Transfer'] },
  { name: 'Problem Agitation', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Amplifies a hidden or underestimated problem to create urgency.', pairsWellWith: ['Failure Autopsy', 'Mistake Confessor', 'Enemy Identification', 'In Medias Res', 'Cost of Inaction'] },
  { name: 'Contrarian Position', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Challenges a popular practice or belief with an alternative view.', pairsWellWith: ['Controversy Creator', "Contrarian's Truth", 'Great Paradox', 'Contrast Reveal', 'Breaking False Beliefs'] },
  { name: 'Transformation Telescope', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Uses before/after states to create aspiration and possibility.', pairsWellWith: ['Evolution Story', 'Belief Archaeology', 'Accumulation Effect', 'Chronological Arc', 'Identity Consistency'] },
  { name: 'Insider Intelligence', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Promises exclusive insider knowledge to create FOMO.', pairsWellWith: ['Industry Insider', 'Success Archaeology', 'Enemy Identification', 'Nested Story', 'Authority Transfer'] },
  { name: 'Permission Giver', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Relieves guilt by authorizing what people already want to do.', pairsWellWith: ['Anti-Advice', 'Advice to Past Self', 'Inversion', 'Chronological Arc', 'Identity Consistency'] },
  { name: 'Unexpected Comparison', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Links unrelated domains to create cognitive surprise.', pairsWellWith: ['Industry Translator', 'Intersection Discovery', 'Visual Framework', 'Nested Story', 'Contrast Principle'] },
  { name: 'Time-Bound Warning', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Creates urgency through predictive specificity about the future.', pairsWellWith: ['Prediction Engine', 'Future Investment Oracle', 'Enemy Identification', 'Parallel Track', 'Cost of Inaction'] },
  { name: 'Identity Wedge', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Creates aspiration by splitting current self from desired self.', pairsWellWith: ['Evolution Story', 'Day in the Life', 'Accumulation Effect', 'Parallel Track', 'Identity Consistency'] },
  { name: 'Resource Reveal', category: 'headline-formulas', type: 'headline-formula', stage: 2, description: 'Promises immediate, concrete utility through tangible resources.', pairsWellWith: ['Framework Builder', 'Comparison Master', 'Linear Roadmap', 'Chronological Arc', 'Speed and Ease'] },

  // Messaging Frameworks (8) - Stage 3
  { name: 'Great Paradox', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Structures content around a counter-intuitive insight that contradicts conventional wisdom.', pairsWellWith: ["Contrarian's Truth", 'Myth Killer', 'Myth-Busting Hook', 'Contrast Reveal', 'Breaking False Beliefs'] },
  { name: 'Unique Method', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Presents a named, systematic approach the creator developed from experience.', pairsWellWith: ['Framework Builder', 'Success Archaeology', 'Specificity Amplifier', 'Chronological Arc', 'Speed and Ease'] },
  { name: 'Visual Framework', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Translates abstract concepts into spatial, visual mental models.', pairsWellWith: ['Industry Translator', 'Intersection Discovery', 'Unexpected Comparison', 'Nested Story', 'Paint Mental Pictures'] },
  { name: 'Best of Both Worlds', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Breaks false either/or choices by revealing a synthesis.', pairsWellWith: ['Comparison Master', 'Leverage Detector', 'Desire-Obstacle Elimination', 'Parallel Track', 'Contrast Principle'] },
  { name: 'Linear Roadmap', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Provides step-by-step transformation with justified sequencing.', pairsWellWith: ['Problem Solver', 'Leverage Detector', 'Authority Proof', 'Chronological Arc', 'Speed and Ease'] },
  { name: 'Enemy Identification', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Creates alliance and clarity by naming the real obstacle.', pairsWellWith: ['Controversy Creator', 'Failure Autopsy', 'Problem Agitation', 'In Medias Res', 'Hidden Problem'] },
  { name: 'Accumulation Effect', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Makes the case for consistent small actions over dramatic moves.', pairsWellWith: ['Evolution Story', 'Pattern Recognition', 'Transformation Telescope', 'Chronological Arc', 'Identity Consistency'] },
  { name: 'Inversion', category: 'messaging-frameworks', type: 'messaging-framework', stage: 3, description: 'Reports results from trying the exact opposite of conventional wisdom.', pairsWellWith: ['Anti-Advice', "Contrarian's Truth", 'Contrarian Position', 'Contrast Reveal', 'Breaking False Beliefs'] },

  // Story Shapes (5) - Stage 3
  { name: 'Chronological Arc', category: 'story-shapes', type: 'story-shape', stage: 3, description: 'Follows time sequence from beginning through middle to end.', pairsWellWith: ['Evolution Story', 'Problem Solver', 'Transformation Telescope', 'Linear Roadmap', 'Paint Mental Pictures'] },
  { name: 'In Medias Res', category: 'story-shapes', type: 'story-shape', stage: 3, description: 'Starts at peak tension, rewinds for context, builds back, and resolves forward.', pairsWellWith: ['Mistake Confessor', 'Single Case Deep Dive', 'Failure Autopsy', 'Authority Proof', 'Zeigarnik Effect'] },
  { name: 'Contrast Reveal', category: 'story-shapes', type: 'story-shape', stage: 3, description: 'Presents the common approach, then reveals the better approach through narrative.', pairsWellWith: ['Myth Killer', 'Controversy Creator', 'Great Paradox', 'Contrarian Position', 'Contrast Principle'] },
  { name: 'Nested Story', category: 'story-shapes', type: 'story-shape', stage: 3, description: 'Embeds a complete narrative within a framing narrative for layered insight.', pairsWellWith: ['Industry Insider', 'Insider Intelligence', 'Unexpected Comparison', 'Visual Framework', 'Zeigarnik Effect'] },
  { name: 'Parallel Track', category: 'story-shapes', type: 'story-shape', stage: 3, description: 'Runs two storylines simultaneously until they converge or contrast.', pairsWellWith: ['Prediction Engine', 'Comparison Master', 'Time-Bound Warning', 'Identity Wedge', 'Cost of Inaction'] },

  // Psychological Triggers (11) - Stage 4
  { name: 'Biology Is King', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Connects to hardwired survival, status, and belonging drives.', pairsWellWith: ['Single Case Deep Dive', 'Problem Agitation', 'Enemy Identification', 'In Medias Res', 'Accumulation Effect'] },
  { name: 'Breaking False Beliefs', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Removes psychological barriers by dismantling limiting beliefs.', pairsWellWith: ['Myth Killer', "Contrarian's Truth", 'Myth-Busting Hook', 'Contrast Reveal', 'Great Paradox'] },
  { name: 'Hidden Problem', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Reveals root causes beneath surface symptoms for dopamine-releasing insight.', pairsWellWith: ['Industry Insider', 'Failure Autopsy', 'Problem Agitation', 'Contrast Reveal', 'Enemy Identification'] },
  { name: 'Cost of Inaction', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Leverages loss aversion by showing compounding costs of delay.', pairsWellWith: ['Prediction Engine', 'Failure Autopsy', 'Time-Bound Warning', 'In Medias Res', 'Enemy Identification'] },
  { name: 'Paint Mental Pictures', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: "Controls the reader's internal experience through specific, sensory language.", pairsWellWith: ['Day in the Life', 'Single Case Deep Dive', 'Transformation Telescope', 'Chronological Arc', 'Visual Framework'] },
  { name: 'Speed and Ease', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: "Aligns with the brain's energy conservation bias by showing simpler paths.", pairsWellWith: ['Problem Solver', 'Leverage Detector', 'Desire-Obstacle Elimination', 'Linear Roadmap', 'Chronological Arc'] },
  { name: 'Evoking Desire', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Disrupts homeostasis by amplifying dissatisfaction and visualizing a better future.', pairsWellWith: ['Evolution Story', 'Breakthrough Archaeology', 'Transformation Telescope', 'Parallel Track', 'Accumulation Effect'] },
  { name: 'Identity Consistency', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Drives behavior by framing action as identity expression.', pairsWellWith: ['Evolution Story', 'Day in the Life', 'Identity Wedge', 'Chronological Arc', 'Accumulation Effect'] },
  { name: 'Contrast Principle', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Reshapes perception through strategic comparison and juxtaposition.', pairsWellWith: ['Comparison Master', 'Intersection Discovery', 'Unexpected Comparison', 'Parallel Track', 'Best of Both Worlds'] },
  { name: 'Zeigarnik Effect', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Creates engagement through strategically incomplete patterns that demand closure.', pairsWellWith: ['Prediction Engine', 'Uncomfortable Truth', 'Insider Intelligence', 'In Medias Res', 'Nested Story'] },
  { name: 'Authority Transfer', category: 'psychological-triggers', type: 'psychological-trigger', stage: 4, description: 'Borrows credibility from respected sources and institutions.', pairsWellWith: ['Success Dissector', 'Success Archaeology', 'Authority Proof', 'Nested Story', 'Unique Method'] }
].map((f, i) => ({
  ...f,
  id: `fw-${String(i + 1).padStart(3, '0')}`,
  active: true,
  custom: false
}));

// ── Anti-AI Rules (from voice profile guardrails) ────────────────
const ANTI_AI_RULES = [
  // Banned words
  ...['Delve', 'In the realm of', 'Landscape (digital landscape)', 'Navigate', 'Meticulously', 'Leverage (as generic verb)', 'Transformative', 'Game-changing', 'Ever-evolving', 'Foster', 'Underscore', 'Robust', 'Seamless', 'Seamlessly', 'Unlock', 'Harness', 'Cutting-edge', 'Synergy', 'Holistic', 'Pivotal'].map((w, i) => ({
    id: `aa-word-${i}`,
    category: 'banned-words',
    rule: w,
    description: 'AI tell word/phrase - never use',
    active: true,
    custom: false
  })),
  // Banned phrases
  ...['At its core...', 'In today\'s fast-paced world...', 'It\'s important to note that...', 'This underscores the importance of...', 'That being said...', 'In essence...', 'Let\'s dive in / Let\'s explore', 'In conclusion...', 'Without further ado...', 'Have you ever wondered...', 'Are you struggling with...'].map((p, i) => ({
    id: `aa-phrase-${i}`,
    category: 'banned-phrases',
    rule: p,
    description: 'AI tell phrase - never use',
    active: true,
    custom: false
  })),
  // Structural patterns
  ...['Uniform sentence lengths', 'Every paragraph starting the same way', 'Numbered lists for everything', 'Perfect parallelism repeatedly', 'Conclusions that merely restate introduction', 'Excessive hedging', 'Compressed two-sentence contrast as recurring device', 'Em dashes for clarifying information'].map((s, i) => ({
    id: `aa-struct-${i}`,
    category: 'structural-patterns',
    rule: s,
    description: 'AI structural pattern to avoid',
    active: true,
    custom: false
  }))
];

// ── Voice Profile (from voice-profile-chris-lema-v2.md) ──────────
const VOICE_PROFILE = {
  id: 'voice-default',
  name: 'Chris Lema',
  identity: 'Trusted mentor who combines passionate inspiration with deep business wisdom. Experienced coach who\'s been there, done that.',
  tone: 'Passionate and inspirational, but grounded in reality. Warm and encouraging, but willing to deliver tough truths.',
  humorStyle: 'Self-deprecating when appropriate. Gentle humor to build connection.',
  sentenceStructure: 'Medium-length sentences (10-20 words). Short sentences for emphasis. Deliberate fragments and single-sentence paragraphs.',
  vocabularyTendencies: 'Clear, accessible explanations using relatable metaphors. Avoids academic jargon. Signature phrases: "Here\'s what I know," "Let me," "Think about," "Here\'s the thing," "In my words," "Don\'t get me wrong."',
  contractions: 'Use contractions heavily throughout. Maintain conversational tone.',
  punctuation: 'Never use em dashes. Use parentheticals for personal asides and colons for lists. Limit exclamation points.',
  paragraphStructure: 'Short, scannable paragraphs (1-4 sentences). Single-sentence paragraphs for emphasis.',
  openingMoves: 'Bold, declarative statements. Often begin with the conclusion or key insight.',
  closingMoves: 'Clear call to action or engagement invitation. Forward momentum.',
  contentPhilosophy: 'Contrast-based perspective: acknowledge conventional wisdom, then challenge with experience. One deep contrast per piece. Never use compressed two-sentence contrast as recurring device.',
  credibility: 'Specific stories and detailed case studies. References 20+ years of coaching experience.',
  audienceRelationship: 'Peer-to-peer mentoring. Treats readers as smart people who need guidance, not instruction.',
  antiPatterns: 'Never use: delve, landscape, navigate, leverage, transformative, foster, seamless, unlock, harness, synergy, holistic. Never use compressed contrast tics.',
  isDefault: true,
  active: true
};

// ── Platform Profile (from platform-profile-chris-lema.md) ────────
const PLATFORM_PROFILE = {
  id: 'platform-default',
  name: 'Chris Lema Platform Profile',
  platforms: {
    linkedin: {
      hookPatterns: 'Start with standalone insight creating tension or curiosity. Contrarian take stated as fact, or specific result/number.',
      structureRules: 'Break every 1-3 sentences. Alternate 1-line and 2-3 line paragraphs. Bold sparingly for one key insight.',
      lengthGuidance: 'Short: 300-800 chars. Standard: 800-1,500 chars. Long: 1,500-3,000 chars.',
      ctaConventions: 'Questions inviting experiences or disagreement. Avoid "Like if agree," link CTAs.',
      linkStrategy: 'Minimize external links (~60% less reach). Deliver full value in post (zero-click).'
    },
    facebook: {
      hookPatterns: 'Start with emotional vulnerability or relatable frustration. Personal framing. Avoid professional tone.',
      structureRules: 'Personal: 100-400 chars, conversational, story structure. Business: video/Reels focus.',
      lengthGuidance: 'Personal: 100-400 chars. Business: 40-80 chars. Groups: 200-1,500 chars.',
      ctaConventions: 'Shares as strongest signal. Tag invitations and discussion prompts.',
      linkStrategy: 'Zero-click for max reach. Links in first comment. Link stickers in Reels.'
    },
    twitter: {
      hookPatterns: 'Contrarian statement, specific proof, open loop, pattern interruption, or direct value promise.',
      structureRules: 'Standalone: one idea, one turn, one point. Threads: 3-7 tweets, hook per tweet.',
      lengthGuidance: 'Standalone: 200-280 chars. Threads: 3-7 tweets. Long-form: 500-2,000 chars.',
      ctaConventions: 'Reply invitations, retweet triggers, bookmark requests.',
      linkStrategy: 'Avoid external links in main tweet. Use native features. Links in reply or bio.'
    },
    email: {
      hookPatterns: 'Curiosity with specificity. Personal and direct tone. Numbers with context.',
      structureRules: 'Broadcasts: one idea, hook first 1-2 sentences, short paragraphs. Newsletters: clear sections with mini-hooks.',
      lengthGuidance: 'Subject: 20-40 chars. Preview: 40-100 chars. Broadcasts: 200-500 words. Newsletter: 500-1,500 words.',
      ctaConventions: 'Single clear CTA. Button for commerce, text link for content. P.S. lines can work.',
      linkStrategy: 'Links expected and welcomed. One primary link. Descriptive anchor text.'
    }
  },
  isDefault: true,
  active: true
};

// ── Audience Segments (from the two provided profiles) ───────────
const AUDIENCES = [
  {
    id: 'aud-001',
    name: 'AI Strategy & Adoption',
    description: 'Audience segment profile for AI strategy and adoption content.',
    howToUse: 'Every piece of content should be evaluated against ALL four micro-segments. Strong content resonates deeply with 1-2 segments while remaining accessible to others.',
    microSegments: [
      {
        id: 'ms-001',
        name: 'The Urgent Transformer',
        description: 'CEO or division leader at a mid-sized company facing an inflection point. They have 90-120 days to show credible AI progress. Drowning in information but starving for wisdom.',
        dominantForce: 'Push + Anxiety',
        goalPyramid: {
          level1: 'Avoid making a catastrophic mistake that damages the organization and my credibility',
          level2: 'Identify 2-3 concrete AI use cases that could show ROI within 6 months',
          level3: 'Create and execute a credible AI roadmap positioning us as thoughtful adopters',
          level4: 'Position our organization as an industry leader in AI adoption'
        },
        invertedPainPyramid: [
          { pain: 'Everyone is selling me something but no one is helping me think through what we need', invertedGoal: 'Building independent judgment and strategic thinking capability' },
          { pain: 'My executive team is split between AI believers and skeptics', invertedGoal: 'Creating organizational alignment and shared understanding' },
          { pain: 'I can\'t tell the difference between a genuine opportunity and expensive snake oil', invertedGoal: 'Developing evaluation frameworks and decision-making criteria' }
        ],
        fourForces: { push: 'STRONG', magnetism: 'MODERATE', anxiety: 'STRONG', habit: 'LOW', netForce: 'High motivation for change, but anxiety acts as brake. Reduce anxiety through frameworks and clear thinking.' },
        hiringMoments: ['The Board Meeting Wake-Up', 'The Competitor Announcement', 'The Internal Pressure Point']
      },
      {
        id: 'ms-002',
        name: 'The Transitioning Specialist',
        description: 'Technical professional with 10-15 years of deep expertise watching AI automate parts of their work. At a crossroads: fight, pivot, or evolve.',
        dominantForce: 'Anxiety + Moderate Push',
        goalPyramid: {
          level1: 'Understand what\'s actually happening in my field to make informed career decisions',
          level2: 'Identify which parts of my work AI will replace versus augment',
          level3: 'Develop new skills and positioning to stay valuable as my role evolves',
          level4: 'Redefine my expertise for the AI era and move into a strategic role'
        },
        invertedPainPyramid: [
          { pain: 'I don\'t have time to experiment with AI tools - I have a full-time job', invertedGoal: 'Efficient learning that respects time constraints' },
          { pain: 'I used to be the trusted expert, now I\'m not sure if my experience matters', invertedGoal: 'Maintaining professional identity and value' },
          { pain: 'I see the writing on the wall but don\'t know what my role looks like in 3 years', invertedGoal: 'Concrete vision of evolved role and career path' }
        ],
        fourForces: { push: 'MODERATE', magnetism: 'MODERATE', anxiety: 'STRONG', habit: 'MODERATE', netForce: 'Concerned observation rather than active change. Provide efficient, practical guidance.' },
        hiringMoments: ['The Tool Announcement', 'The Job Posting Shock', 'The Colleague Conversation']
      },
      {
        id: 'ms-003',
        name: 'The Non-Technical Visionary',
        description: 'Product manager, designer, or domain expert with a clear vision but limited coding ability. Needs to validate ideas fast before the market window closes.',
        dominantForce: 'Push + Magnetism',
        goalPyramid: {
          level1: 'Stop being stuck in the idea phase and create something tangible',
          level2: 'Build clickable prototypes that get honest user feedback',
          level3: 'Create demos impressive enough to convince stakeholders',
          level4: 'Validate a concept strong enough to attract co-founders or funding'
        },
        invertedPainPyramid: [
          { pain: 'I have a clear vision but can\'t build it myself', invertedGoal: 'Closing the execution gap between vision and reality' },
          { pain: 'I need to test multiple ideas fast, but every prototype takes forever', invertedGoal: 'Achieving velocity in the validation phase' },
          { pain: 'I\'m spending months playing with tools instead of validating ideas', invertedGoal: 'Moving from exploration to validation before opportunity passes' }
        ],
        fourForces: { push: 'STRONG', magnetism: 'STRONG', anxiety: 'MODERATE', habit: 'LOW', netForce: 'High motivation and energy but can lead to tool-hopping. Help move from exploration to focused building.' },
        hiringMoments: ['The Stakeholder Deadline', 'The Idea Overflow Crisis', 'The Near-Miss Realization']
      },
      {
        id: 'ms-004',
        name: 'The Expertise-to-Audience Builder',
        description: 'Has genuine expertise (books, courses, frameworks) but can\'t create enough promotional content to maintain visibility. Protective of voice and authenticity.',
        dominantForce: 'Anxiety + Moderate Push',
        goalPyramid: {
          level1: 'Stop feeling guilty about inconsistent content creation',
          level2: 'Repurpose existing expertise into multiple formats efficiently',
          level3: 'Drive more conversions through better promotion while maintaining authentic voice',
          level4: 'Build a content engine that runs smoothly enough to focus on new expertise'
        },
        invertedPainPyramid: [
          { pain: 'Every piece of content requires starting with a blank page', invertedGoal: 'Systematic content workflows that don\'t require starting from scratch' },
          { pain: 'I don\'t know which parts AI can safely handle vs. need my personal touch', invertedGoal: 'Understanding boundaries between AI assistance and authentic voice' },
          { pain: 'My competitors are posting 5x more than me and I\'m becoming invisible', invertedGoal: 'Maintaining consistent visibility without sacrificing quality' }
        ],
        fourForces: { push: 'MODERATE_TO_STRONG', magnetism: 'MODERATE', anxiety: 'STRONG', habit: 'MODERATE_TO_STRONG', netForce: 'Interested hesitation. Address authenticity anxiety while showing efficient approaches.' },
        hiringMoments: ['The Launch Overwhelm', 'The Consistency Failure', 'The Competitor Observation']
      }
    ]
  },
  {
    id: 'aud-002',
    name: 'AI-for-Experts Audience',
    description: 'Five micro-segments for the AI-for-experts content practice.',
    howToUse: 'Every piece of content targets ONE micro-segment. Score topics against each segment\'s goal pyramid. If it scores equally well for all five, it\'s too generic. Two are anxiety-driven (Creator, Consultant), three are seduced by a shiny surface (Executive, Founder, Engineer).',
    microSegments: [
      {
        id: 'ms-005',
        name: 'The Voice-Protective Creator',
        description: 'Working creator whose competitive edge is a recognizable voice, feeling it eroded by daily AI use. Fear is self-erosion, not exposure. They don\'t want to quit AI; they want to use it without it using them back.',
        dominantForce: 'Anxiety',
        goalPyramid: {
          level1: 'Keep their own voice and instincts intact while using AI every day',
          level2: 'Notice when the tool is drifting their cadence and pull back on demand',
          level3: 'Use AI as a downstream amplifier with voice encoded upstream',
          level4: 'A practice rooted in their own taste that the tool sharpens instead of replacing'
        },
        invertedPainPyramid: [
          { pain: 'I catch myself writing in AI rhythm when the tool isn\'t even open', invertedGoal: 'Keep the tool out of my own head' },
          { pain: 'I can\'t always tell which sentences are mine and which are its', invertedGoal: 'Stay able to tell my voice apart from the default' },
          { pain: 'My unassisted writing feels rustier - am I losing the muscle?', invertedGoal: 'Keep my craft from atrophying while I lean on AI' }
        ],
        fourForces: { push: 'MODERATE', magnetism: 'MODERATE', anxiety: 'STRONG', habit: 'MODERATE', netForce: 'Anxiety dominates and is internal. Do not sell speed or output. Defend the instrument: encode voice upstream.' },
        hiringMoments: ['The contagion moment (catching AI rhythm in unassisted writing)', 'The "is this even me?" moment', 'The rusty-muscle moment']
      },
      {
        id: 'ms-006',
        name: 'The Deck-Reaching Executive',
        description: 'P&L-owning leader told they need "an AI strategy." Their instinct is to build a deck while AI tools they already bought collect dust. Pattern-matching AI to "major initiative" - exactly the wrong size.',
        dominantForce: 'Push + Habit',
        goalPyramid: {
          level1: 'Have a credible, defensible answer to "what are we doing about AI"',
          level2: 'Get one painful workflow measurably automated and adopted',
          level3: 'Turn one proven workflow into a repeatable pattern others copy',
          level4: 'Build an organization where AI judgment is distributed'
        },
        invertedPainPyramid: [
          { pain: 'We bought the AI tools. They\'re activated and nobody touches them.', invertedGoal: 'Get adoption, not just procurement' },
          { pain: 'The board\'s asking what our AI strategy is and I\'m reaching for a deck', invertedGoal: 'Have a real answer grounded in a working result' },
          { pain: 'Our pilot demoed great and then went absolutely nowhere', invertedGoal: 'Ship something that survives past the novelty phase' }
        ],
        fourForces: { push: 'STRONG', magnetism: 'MODERATE', anxiety: 'STRONG', habit: 'STRONG', netForce: 'Push + Habit + Anxiety all STRONG - paralysis cocktail. Reduce anxiety of where to start by shrinking to one workflow. Strategy emerges from doing.' },
        hiringMoments: ['The renewal-line-item moment', 'The board-question moment', 'The pilot-that-died moment']
      },
      {
        id: 'ms-007',
        name: 'The Speed-Drunk Founder',
        description: 'Early founder who discovered they can ship in a weekend and is high on it. Building because building feels like progress. Half-aware they might still be in the hype.',
        dominantForce: 'Magnetism',
        goalPyramid: {
          level1: 'Get something real in front of users fast (already have this)',
          level2: 'Convert weekend-speed into validated direction',
          level3: 'Use building to learn what NOT to build',
          level4: 'Build a product with real retention and trust'
        },
        invertedPainPyramid: [
          { pain: 'I might still be in the hype from all this traction', invertedGoal: 'Stay clear-headed enough to ship what matters' },
          { pain: 'I keep getting the urge to build more features - every request, I say yes', invertedGoal: 'Resist feature creep; build only what earns its place' },
          { pain: 'Everything\'s kind of working and nothing\'s really working', invertedGoal: 'Get past the deceptive early high into durable traction' }
        ],
        fourForces: { push: 'MODERATE', magnetism: 'STRONG', anxiety: 'LOW-MODERATE', habit: 'MODERATE', netForce: 'Magnetism-dominant. Gently redirect the magnet: reframe building as learning instrument. Don\'t kill momentum; aim it.' },
        hiringMoments: ['The retention-cliff moment', 'The yes-to-everything moment', 'The no-moat moment']
      },
      {
        id: 'ms-008',
        name: 'The Trick-Hunting Engineer',
        description: 'Builder shipping AI-powered systems, deep in tactical weeds. Exhausted by the pace of new models and frameworks. Keeps treating failures as things to chase rather than principles to encode.',
        dominantForce: 'Push + Habit',
        goalPyramid: {
          level1: 'Ship an AI system that doesn\'t silently break in production',
          level2: 'Trust their evals - real signal on whether a change helped',
          level3: 'Encode decision-making so the system behaves predictably',
          level4: 'Stand on principles that outlast any given model or framework'
        },
        invertedPainPyramid: [
          { pain: 'It worked great in the demo and fell apart on real data', invertedGoal: 'Build systems that survive contact with reality' },
          { pain: 'Every week a new model, framework, best practice - I\'m always behind', invertedGoal: 'Stand on something durable so I stop relearning the ground' },
          { pain: 'I\'m basically letting the model grade its own homework', invertedGoal: 'Get evaluation I can actually trust' }
        ],
        fourForces: { push: 'STRONG', magnetism: 'MODERATE-STRONG', anxiety: 'MODERATE-STRONG', habit: 'STRONG', netForce: 'Push + Habit dominate, fused by pace. Moved by principles that convert scar tissue into policy and don\'t expire.' },
        hiringMoments: ['The 2am incident moment', 'The treadmill moment', 'The fake-eval moment']
      },
      {
        id: 'ms-009',
        name: 'The Commoditization-Fearing Consultant',
        description: 'Domain expert selling knowledge, watching AI erode billable expertise. Wrong instinct: hoard methods, guard frameworks. Sitting on real pattern-recognition locked in their head, priced by the hour.',
        dominantForce: 'Anxiety + Habit',
        goalPyramid: {
          level1: 'Stay valuable when clients can do the obvious stuff with AI',
          level2: 'Reframe the moat from what I know (copyable) to patterns I recognize',
          level3: 'Make clients smarter and graduate into bigger conversations',
          level4: 'Sell expertise as a portable product that scales past hours'
        },
        invertedPainPyramid: [
          { pain: 'Why would a client pay me when ChatGPT does most of it for $20?', invertedGoal: 'Be valued for what AI can\'t do' },
          { pain: 'If I give away my frameworks, I give away the only thing keeping me hired', invertedGoal: 'Discover that giving knowledge away raises my value' },
          { pain: 'My whole value is locked in my head and priced by the hour', invertedGoal: 'Make my expertise portable so it earns without me in the room' }
        ],
        fourForces: { push: 'MODERATE-STRONG', magnetism: 'MODERATE', anxiety: 'STRONG', habit: 'STRONG', netForce: 'Anxiety + Habit both STRONG, habit sabotages the fix. Flip the frame: relocate the moat to pattern recognition. Give them a concrete vehicle.' },
        hiringMoments: ['The "my client did it in ChatGPT" moment', 'The lost-bid moment', 'The locked-in-my-head moment']
      }
    ]
  }
];

// ── Default Profile Settings ─────────────────────────────────────
const DEFAULT_PROFILE = {
  name: 'Chris Lema',
  email: '',
  bio: '',
  social: {
    linkedin: '',
    twitter: '',
    facebook: '',
    website: ''
  }
};

module.exports = {
  FRAMEWORKS,
  ANTI_AI_RULES,
  VOICE_PROFILE,
  PLATFORM_PROFILE,
  AUDIENCES,
  DEFAULT_PROFILE
};
