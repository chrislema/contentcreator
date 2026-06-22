const crypto = require('crypto');

function makeId() {
  return crypto.randomBytes(6).toString('hex');
}

// Parse a markdown file into an audience segment profile
function parseAudienceMarkdown(text, filename) {
  const lines = text.split('\n');
  const profile = {
    id: makeId(),
    name: '',
    description: '',
    howToUse: '',
    microSegments: []
  };

  // Extract name from first H1
  const h1Match = text.match(/^#\s+(.+)$/m);
  if (h1Match) profile.name = h1Match[1].replace(/Audience Segment Profile:?/i, '').trim() || filename.replace(/\.md$/, '');

  // Extract how to use section
  const howToMatch = text.match(/## How to Use[^\n]*\n([\s\S]*?)(?=\n##\s)/i);
  if (howToMatch) profile.howToUse = howToMatch[1].trim().slice(0, 2000);

  // Extract description from first paragraph after title
  const descMatch = text.match(/^#[^\n]*\n\n([\s\S]*?)(?=\n##\s|\n###\s)/m);
  if (descMatch) profile.description = descMatch[1].trim().slice(0, 500);

  // Parse micro-segments from ## Micro-Segment N: or ### Micro-Segment N: headers
  const segRegex = /#{2,3}\s+(?:Micro-Segment\s+\d+:\s*)?(.+?)(?:\n|\r)/g;
  const segHeaders = [];
  let m;
  while ((m = segRegex.exec(text)) !== null) {
    const header = m[1].trim();
    // Skip non-segment headers
    if (/^(How to Use|Audience Landscape|Cross-Segment|Scoring Template|Appendix|Goal Pyramid|Inverted Pain|Four Forces|Hiring Moments|Description|Core Description)/i.test(header)) continue;
    segHeaders.push({ name: header, index: m.index });
  }

  for (let i = 0; i < segHeaders.length; i++) {
    const seg = segHeaders[i];
    const start = seg.index;
    const end = i + 1 < segHeaders.length ? segHeaders[i + 1].index : text.length;
    const section = text.slice(start, end);

    const ms = {
      id: makeId(),
      name: seg.name,
      description: '',
      dominantForce: '',
      goalPyramid: { level1: '', level2: '', level3: '', level4: '' },
      invertedPainPyramid: [],
      fourForces: { push: '', magnetism: '', anxiety: '', habit: '', netForce: '' },
      hiringMoments: []
    };

    // Description
    const descM = section.match(/### Description\s*\n([\s\S]*?)(?=\n###|\n##)/i);
    if (descM) ms.description = descM[1].trim().slice(0, 1000);

    // Goal Pyramid
    const pyramidM = section.match(/Level 1[^:]*:\s*(.+?)(?:\n|$)/);
    if (pyramidM) ms.goalPyramid.level1 = pyramidM[1].trim();
    const pyramid2 = section.match(/Level 2[^:]*:\s*(.+?)(?:\n|$)/);
    if (pyramid2) ms.goalPyramid.level2 = pyramid2[1].trim();
    const pyramid3 = section.match(/Level 3[^:]*:\s*(.+?)(?:\n|$)/);
    if (pyramid3) ms.goalPyramid.level3 = pyramid3[1].trim();
    const pyramid4 = section.match(/Level 4[^:]*:\s*(.+?)(?:\n|$)/);
    if (pyramid4) ms.goalPyramid.level4 = pyramid4[1].trim();

    // Inverted Pain Pyramid - parse table rows
    const painSection = section.match(/Inverted Pain Pyramid[\s\S]*?(?=\n###|\n##)/i);
    if (painSection) {
      const rows = painSection[0].match(/\|\s*["|]?(.+?)\s*\|\s*(.+?)\s*\|/g);
      if (rows) {
        for (const row of rows.slice(1)) { // skip header
          const cells = row.match(/\|\s*(.+?)\s*\|\s*(.+?)\s*\|/);
          if (cells && !cells[1].includes('---') && !cells[1].toLowerCase().includes('pain')) {
            ms.invertedPainPyramid.push({
              pain: cells[1].replace(/["]/g, '').trim(),
              invertedGoal: cells[2].replace(/["]/g, '').trim()
            });
          }
        }
      }
    }

    // Four Forces
    const pushM = section.match(/Push[^:]*:\s*\*?\*?([^*\n]+)/i);
    if (pushM) ms.fourForces.push = pushM[1].trim().slice(0, 50);
    const magM = section.match(/Magnetism[^:]*:\s*\*?\*?([^*\n]+)/i);
    if (magM) ms.fourForces.magnetism = magM[1].trim().slice(0, 50);
    const anxM = section.match(/Anxiety[^:]*:\s*\*?\*?([^*\n]+)/i);
    if (anxM) ms.fourForces.anxiety = anxM[1].trim().slice(0, 50);
    const habM = section.match(/Habit[^:]*:\s*\*?\*?([^*\n]+)/i);
    if (habM) ms.fourForces.habit = habM[1].trim().slice(0, 50);
    const netM = section.match(/Net Force[^:]*:\s*(.+?)(?=\n###|\n##|\n#)/is);
    if (netM) ms.fourForces.netForce = netM[1].trim().slice(0, 1000);

    // Hiring Moments
    const hireM = section.match(/Hiring Moments\s*\n([\s\S]*?)(?=\n###|\n##|\n# )/i);
    if (hireM) {
      const moments = hireM[1].match(/\*\*([^*]+)\*\*/g);
      if (moments) {
        ms.hiringMoments = moments.map((mom) => mom.replace(/\*\*/g, '').trim());
      }
    }

    if (ms.description || ms.goalPyramid.level1) {
      profile.microSegments.push(ms);
    }
  }

  // Fallback: if no micro-segments found via headers, try landscape table
  if (profile.microSegments.length === 0) {
    const landscapeM = text.match(/Audience Landscape[\s\S]*?\|[\s\S]*?(?=\n##)/i);
    if (landscapeM) {
      const rows = landscapeM[0].match(/\|\s*\d+\s*\|[^|]+\|[^|]+\|[^|]+\|[^|]+\|/g);
      if (rows) {
        for (const row of rows) {
          const cells = row.split('|').map((c) => c.trim()).filter(Boolean);
          if (cells.length >= 3) {
            profile.microSegments.push({
              id: makeId(),
              name: cells[1].replace(/^The\s+/, 'The '),
              description: cells[2] || '',
              dominantForce: cells[3] || '',
              goalPyramid: { level1: '', level2: '', level3: '', level4: '' },
              invertedPainPyramid: [],
              fourForces: { push: '', magnetism: '', anxiety: '', habit: '', netForce: '' },
              hiringMoments: []
            });
          }
        }
      }
    }
  }

  return profile;
}

// Parse a voice profile markdown file
function parseVoiceProfileMarkdown(text) {
  const profile = {
    id: makeId(),
    name: 'Imported Voice Profile',
    isDefault: false,
    active: true
  };

  const nameM = text.match(/Voice Profile:?\s*(.+)$/im) || text.match(/^#\s+(.+)$/m);
  if (nameM) profile.name = nameM[1].trim();

  const fields = [
    ['identity', /Voice Identity\s*\n([\s\S]*?)(?=\n##)/i],
    ['tone', /Tone & Energy[\s\S]*?Energy Level:\s*(.+?)(?:\n|$)/i],
    ['humorStyle', /Humor Style:\s*(.+?)(?:\n|$)/i],
    ['sentenceStructure', /Sentence Structure\s*\n([\s\S]*?)(?=\n###|\n##)/i],
    ['vocabularyTendencies', /Vocabulary Tendencies\s*\n([\s\S]*?)(?=\n###|\n##)/i],
    ['contentPhilosophy', /Content Philosophy\s*\n([\s\S]*?)(?=\n##)/i],
    ['credibility', /Credibility.*?\n([\s\S]*?)(?=\n##)/i],
    ['audienceRelationship', /Audience Relationship\s*\n([\s\S]*?)(?=\n##)/i]
  ];

  for (const [key, regex] of fields) {
    const m = text.match(regex);
    if (m) profile[key] = m[1].trim().slice(0, 2000);
  }

  return profile;
}

// Parse a platform profile markdown file
function parsePlatformProfileMarkdown(text) {
  const profile = {
    id: makeId(),
    name: 'Imported Platform Profile',
    platforms: {},
    isDefault: false,
    active: true
  };

  const nameM = text.match(/^#\s+(.+)$/m);
  if (nameM) profile.name = nameM[1].replace(/Platform Profile/i, '').trim() || 'Imported Platform Profile';

  const platforms = ['linkedin', 'facebook', 'twitter', 'email'];
  for (const p of platforms) {
    const regex = new RegExp(`###\\s+${p}[\\s\\S]*?(?=\\n###\\s+|\\n##\\s|$)`, 'i');
    // Try case-insensitive platform matching
    const altNames = { linkedin: 'LinkedIn', facebook: 'Facebook', twitter: 'Twitter|Twitter/X', email: 'Email' };
    const altRegex = new RegExp(`${altNames[p]}[\\s\\S]*?(?=\\n#{2,3}\\s+(?:LinkedIn|Facebook|Twitter|Email|Promotion)|$)`, 'i');

    const sectionM = text.match(regex) || text.match(altRegex);
    if (sectionM) {
      const section = sectionM[0];
      const hookM = section.match(/Hook Patterns\s*\n([\s\S]*?)(?=\n###|\n##)/i);
      const structM = section.match(/Structure Rules\s*\n([\s\S]*?)(?=\n###|\n##)/i);
      const lenM = section.match(/Length Guidance\s*\n([\s\S]*?)(?=\n###|\n##)/i);
      const ctaM = section.match(/CTA Conventions\s*\n([\s\S]*?)(?=\n###|\n##)/i);
      const linkM = section.match(/Link Strategy\s*\n([\s\S]*?)(?=\n###|\n##)/i);

      profile.platforms[p] = {
        hookPatterns: hookM ? hookM[1].trim().slice(0, 1000) : '',
        structureRules: structM ? structM[1].trim().slice(0, 1000) : '',
        lengthGuidance: lenM ? lenM[1].trim().slice(0, 500) : '',
        ctaConventions: ctaM ? ctaM[1].trim().slice(0, 500) : '',
        linkStrategy: linkM ? linkM[1].trim().slice(0, 500) : ''
      };
    }
  }

  return profile;
}

module.exports = {
  parseAudienceMarkdown,
  parseVoiceProfileMarkdown,
  parsePlatformProfileMarkdown,
  makeId
};
