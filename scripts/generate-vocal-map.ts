/**
 * Generates a Rhubarb-compatible vocal map JSON for "The Real Slim Shady" by Eminem.
 *
 * Mouth shapes (Preston Blair phoneme set):
 * A = Closed mouth (M, B, P, silence)
 * B = Slightly open (schwa, neutral)
 * C = Open (EH, AH)
 * D = Wide open (AA)
 * E = Rounded (OH, OO)
 * F = Upper teeth on lower lip (F, V)
 * G = Teeth together, wide (EE, S, Z)
 * H = Tongue visible (L, TH)
 * X = Silence / mouth closed
 */

interface MouthCue {
  start: number;
  end: number;
  value: string;
}

// Rapid mouth shape patterns for rap delivery (~4-6 shapes per second)
const rapPatterns = [
  ['B', 'C', 'D', 'B', 'G', 'C', 'A', 'D', 'B', 'C'],
  ['C', 'D', 'B', 'G', 'C', 'B', 'D', 'C', 'F', 'B'],
  ['D', 'B', 'C', 'G', 'B', 'D', 'C', 'B', 'A', 'C'],
  ['B', 'G', 'C', 'D', 'B', 'C', 'A', 'G', 'D', 'B'],
  ['C', 'B', 'D', 'C', 'G', 'B', 'F', 'C', 'D', 'B'],
];

// Chorus pattern - more rhythmic, slightly slower
const chorusPatterns = [
  ['C', 'D', 'B', 'A', 'C', 'D', 'G', 'B'],
  ['D', 'C', 'B', 'D', 'C', 'A', 'B', 'C'],
];

// Spoken/slow pattern
const spokenPatterns = [
  ['B', 'C', 'A', 'B', 'D', 'A'],
  ['C', 'B', 'A', 'D', 'B', 'A'],
];

type SectionType = 'silence' | 'spoken' | 'rap' | 'chorus' | 'shout';

interface Section {
  start: number;
  end: number;
  type: SectionType;
  intensity: number; // 0-1, affects speed of mouth movement
}

// The Real Slim Shady - Eminem (~5:23 = 323 seconds)
// Detailed section breakdown
const sections: Section[] = [
  // Intro
  { start: 0.0, end: 1.5, type: 'silence', intensity: 0 },
  { start: 1.5, end: 4.0, type: 'spoken', intensity: 0.6 }, // "May I have your attention please?"
  { start: 4.0, end: 5.0, type: 'silence', intensity: 0 },
  { start: 5.0, end: 8.0, type: 'spoken', intensity: 0.7 }, // "May I have your attention please?"
  { start: 8.0, end: 9.0, type: 'silence', intensity: 0 },
  { start: 9.0, end: 14.5, type: 'spoken', intensity: 0.8 }, // "Will the real Slim Shady please stand up?"
  { start: 14.5, end: 15.5, type: 'silence', intensity: 0 },
  { start: 15.5, end: 21.0, type: 'spoken', intensity: 0.8 }, // "I repeat, will the real Slim Shady..."
  { start: 21.0, end: 25.0, type: 'spoken', intensity: 0.9 }, // "We're gonna have a problem here"
  { start: 25.0, end: 26.0, type: 'silence', intensity: 0 },

  // Verse 1
  { start: 26.0, end: 28.5, type: 'rap', intensity: 0.8 }, // "Y'all act like you never seen a white person before"
  { start: 28.5, end: 29.0, type: 'silence', intensity: 0 },
  { start: 29.0, end: 32.0, type: 'rap', intensity: 0.85 }, // "Jaws all on the floor..."
  { start: 32.0, end: 35.0, type: 'rap', intensity: 0.85 },
  { start: 35.0, end: 38.0, type: 'rap', intensity: 0.9 },
  { start: 38.0, end: 38.5, type: 'silence', intensity: 0 },
  { start: 38.5, end: 42.0, type: 'rap', intensity: 0.85 },
  { start: 42.0, end: 45.0, type: 'rap', intensity: 0.9 },
  { start: 45.0, end: 48.0, type: 'rap', intensity: 0.85 },
  { start: 48.0, end: 48.5, type: 'silence', intensity: 0 },
  { start: 48.5, end: 52.0, type: 'rap', intensity: 0.9 },
  { start: 52.0, end: 55.0, type: 'rap', intensity: 0.85 },
  { start: 55.0, end: 58.0, type: 'rap', intensity: 0.9 },
  { start: 58.0, end: 58.5, type: 'silence', intensity: 0 },
  { start: 58.5, end: 62.0, type: 'rap', intensity: 0.85 },
  { start: 62.0, end: 65.0, type: 'rap', intensity: 0.9 },
  { start: 65.0, end: 68.0, type: 'rap', intensity: 0.85 },
  { start: 68.0, end: 68.5, type: 'silence', intensity: 0 },
  { start: 68.5, end: 72.0, type: 'rap', intensity: 0.9 },
  { start: 72.0, end: 75.0, type: 'rap', intensity: 0.85 },
  { start: 75.0, end: 78.0, type: 'rap', intensity: 0.9 },
  { start: 78.0, end: 79.0, type: 'silence', intensity: 0 },

  // Chorus 1
  { start: 79.0, end: 83.0, type: 'chorus', intensity: 0.95 }, // "I'm Slim Shady, yes I'm the real Shady"
  { start: 83.0, end: 87.0, type: 'chorus', intensity: 0.95 }, // "All you other Slim Shadys are just imitating"
  { start: 87.0, end: 91.0, type: 'chorus', intensity: 1.0 }, // "So won't the real Slim Shady please stand up"
  { start: 91.0, end: 95.0, type: 'chorus', intensity: 1.0 }, // "Please stand up, please stand up"
  { start: 95.0, end: 97.0, type: 'silence', intensity: 0 },

  // Verse 2
  { start: 97.0, end: 100.0, type: 'rap', intensity: 0.85 },
  { start: 100.0, end: 103.0, type: 'rap', intensity: 0.9 },
  { start: 103.0, end: 103.5, type: 'silence', intensity: 0 },
  { start: 103.5, end: 107.0, type: 'rap', intensity: 0.85 },
  { start: 107.0, end: 110.0, type: 'rap', intensity: 0.9 },
  { start: 110.0, end: 113.0, type: 'rap', intensity: 0.85 },
  { start: 113.0, end: 113.5, type: 'silence', intensity: 0 },
  { start: 113.5, end: 117.0, type: 'rap', intensity: 0.9 },
  { start: 117.0, end: 120.0, type: 'rap', intensity: 0.85 },
  { start: 120.0, end: 123.0, type: 'rap', intensity: 0.9 },
  { start: 123.0, end: 123.5, type: 'silence', intensity: 0 },
  { start: 123.5, end: 127.0, type: 'rap', intensity: 0.85 },
  { start: 127.0, end: 130.0, type: 'rap', intensity: 0.9 },
  { start: 130.0, end: 133.0, type: 'rap', intensity: 0.85 },
  { start: 133.0, end: 133.5, type: 'silence', intensity: 0 },
  { start: 133.5, end: 137.0, type: 'rap', intensity: 0.9 },
  { start: 137.0, end: 140.0, type: 'rap', intensity: 0.85 },
  { start: 140.0, end: 143.0, type: 'rap', intensity: 0.9 },
  { start: 143.0, end: 143.5, type: 'silence', intensity: 0 },
  { start: 143.5, end: 147.0, type: 'rap', intensity: 0.85 },
  { start: 147.0, end: 150.0, type: 'rap', intensity: 0.9 },
  { start: 150.0, end: 151.0, type: 'silence', intensity: 0 },

  // Chorus 2
  { start: 151.0, end: 155.0, type: 'chorus', intensity: 0.95 },
  { start: 155.0, end: 159.0, type: 'chorus', intensity: 0.95 },
  { start: 159.0, end: 163.0, type: 'chorus', intensity: 1.0 },
  { start: 163.0, end: 167.0, type: 'chorus', intensity: 1.0 },
  { start: 167.0, end: 169.0, type: 'silence', intensity: 0 },

  // Verse 3
  { start: 169.0, end: 172.0, type: 'rap', intensity: 0.85 },
  { start: 172.0, end: 175.0, type: 'rap', intensity: 0.9 },
  { start: 175.0, end: 175.5, type: 'silence', intensity: 0 },
  { start: 175.5, end: 179.0, type: 'rap', intensity: 0.85 },
  { start: 179.0, end: 182.0, type: 'rap', intensity: 0.9 },
  { start: 182.0, end: 185.0, type: 'rap', intensity: 0.85 },
  { start: 185.0, end: 185.5, type: 'silence', intensity: 0 },
  { start: 185.5, end: 189.0, type: 'rap', intensity: 0.9 },
  { start: 189.0, end: 192.0, type: 'rap', intensity: 0.85 },
  { start: 192.0, end: 195.0, type: 'rap', intensity: 0.9 },
  { start: 195.0, end: 195.5, type: 'silence', intensity: 0 },
  { start: 195.5, end: 199.0, type: 'rap', intensity: 0.85 },
  { start: 199.0, end: 202.0, type: 'rap', intensity: 0.9 },
  { start: 202.0, end: 205.0, type: 'rap', intensity: 0.85 },
  { start: 205.0, end: 205.5, type: 'silence', intensity: 0 },
  { start: 205.5, end: 209.0, type: 'rap', intensity: 0.9 },
  { start: 209.0, end: 212.0, type: 'rap', intensity: 0.85 },
  { start: 212.0, end: 215.0, type: 'rap', intensity: 0.9 },
  { start: 215.0, end: 215.5, type: 'silence', intensity: 0 },
  { start: 215.5, end: 219.0, type: 'rap', intensity: 0.85 },
  { start: 219.0, end: 222.0, type: 'rap', intensity: 0.9 },
  { start: 222.0, end: 223.0, type: 'silence', intensity: 0 },

  // Chorus 3
  { start: 223.0, end: 227.0, type: 'chorus', intensity: 0.95 },
  { start: 227.0, end: 231.0, type: 'chorus', intensity: 0.95 },
  { start: 231.0, end: 235.0, type: 'chorus', intensity: 1.0 },
  { start: 235.0, end: 239.0, type: 'chorus', intensity: 1.0 },
  { start: 239.0, end: 241.0, type: 'silence', intensity: 0 },

  // Verse 4 / Bridge
  { start: 241.0, end: 243.5, type: 'rap', intensity: 0.85 },
  { start: 243.5, end: 246.0, type: 'rap', intensity: 0.9 },
  { start: 246.0, end: 248.5, type: 'rap', intensity: 0.85 },
  { start: 248.5, end: 249.0, type: 'silence', intensity: 0 },
  { start: 249.0, end: 252.0, type: 'rap', intensity: 0.9 },
  { start: 252.0, end: 255.0, type: 'rap', intensity: 0.85 },
  { start: 255.0, end: 256.0, type: 'silence', intensity: 0 },

  // Final Chorus
  { start: 256.0, end: 260.0, type: 'chorus', intensity: 0.95 },
  { start: 260.0, end: 264.0, type: 'chorus', intensity: 0.95 },
  { start: 264.0, end: 268.0, type: 'chorus', intensity: 1.0 },
  { start: 268.0, end: 272.0, type: 'chorus', intensity: 1.0 },
  { start: 272.0, end: 273.0, type: 'silence', intensity: 0 },

  // Outro
  { start: 273.0, end: 276.0, type: 'spoken', intensity: 0.7 }, // "Guess there's a Slim Shady in all of us"
  { start: 276.0, end: 279.0, type: 'spoken', intensity: 0.6 }, // "Fuck it, let's all stand up"
  { start: 279.0, end: 283.0, type: 'silence', intensity: 0 }, // Fade out
];

function generateCuesForSection(section: Section): MouthCue[] {
  if (section.type === 'silence') {
    return [{ start: section.start, end: section.end, value: 'X' }];
  }

  const cues: MouthCue[] = [];
  let patterns: string[][];
  let cuesPerSecond: number;

  switch (section.type) {
    case 'rap':
      patterns = rapPatterns;
      cuesPerSecond = 5 + section.intensity * 3; // 5-8 cues/sec for rap
      break;
    case 'chorus':
      patterns = chorusPatterns;
      cuesPerSecond = 4 + section.intensity * 2; // 4-6 cues/sec for chorus
      break;
    case 'spoken':
      patterns = spokenPatterns;
      cuesPerSecond = 3 + section.intensity * 2; // 3-5 cues/sec for spoken
      break;
    case 'shout':
      patterns = [['D', 'D', 'C', 'D', 'D', 'C']];
      cuesPerSecond = 3;
      break;
    default:
      patterns = rapPatterns;
      cuesPerSecond = 5;
  }

  const duration = section.end - section.start;
  const totalCues = Math.floor(duration * cuesPerSecond);
  const cueLength = duration / totalCues;

  // Pick a random pattern based on section start time (deterministic)
  const patternIndex = Math.floor(section.start * 7) % patterns.length;
  const pattern = patterns[patternIndex];

  for (let i = 0; i < totalCues; i++) {
    const shapeIndex = i % pattern.length;
    cues.push({
      start: Math.round((section.start + i * cueLength) * 100) / 100,
      end: Math.round((section.start + (i + 1) * cueLength) * 100) / 100,
      value: pattern[shapeIndex],
    });
  }

  return cues;
}

// Generate all cues
const allCues: MouthCue[] = [];
for (const section of sections) {
  allCues.push(...generateCuesForSection(section));
}

const output = {
  metadata: {
    soundFile: 'the-real-slim-shady.mp3',
    duration: 283.0,
    title: 'The Real Slim Shady',
    artist: 'Eminem',
    bpm: 104,
    generatedBy: 'manual-mapping',
    note: 'Approximate vocal map based on song structure. Mouth shapes follow Preston Blair phoneme set (Rhubarb Lip Sync compatible).',
  },
  mouthCues: allCues,
};

const json = JSON.stringify(output, null, 2);
console.log(json);
