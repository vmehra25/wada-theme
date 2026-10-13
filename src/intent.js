import { categories } from './catalog.js';
import { preferencesSchema } from './schema.js';
import { describeColor, normalizeHex } from './color.js';

const families = ['pink', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'brown', 'neutral'];
const aliases = { magenta: 'pink', rose: 'pink', violet: 'purple', lavender: 'purple', indigo: 'blue', cyan: 'teal', turquoise: 'teal', gray: 'neutral', grey: 'neutral' };
const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (s, word) => new RegExp(`\\b${escape(word)}\\b`, 'i').test(s);

// Simple phrases are convenience input. Agents should send structured preferences for nuanced requests.
export function parseIntent(input = {}) {
  if (typeof input === 'string') input = { intent: input };
  const options = preferencesSchema.parse(input);
  let positive = options.intent.toLowerCase();
  const exclusions = [];
  positive = positive.replace(/\b(?:avoid|without|exclude|no)\s+((?:(?:bright|vivid|pale|dark|light)\s+)?(?:#[\da-f]{6}|pink|red|orange|yellow|green|teal|blue|purple|brown|neutral|magenta|violet|lavender|indigo|cyan|turquoise|gr[ae]y))\b/gi,
    (_, term) => { exclusions.push(term.toLowerCase()); return ' '; });
  const inferred = categories.filter(c => [c.id, ...c.aliases].some(a => has(positive, a))).map(c => c.id);
  const negativeMood = /\b(?:not|less|avoid|without|no)\s+(?:too\s+)?(cheerful|professional|calm|earthy|elegant|playful|soft|dramatic|bold|bright|vivid)\b/gi;
  positive = positive.replace(negativeMood, ' ');
  const moods = options.moods ?? inferred.filter(m => !new RegExp(`\\b(?:not|less|avoid|without|no)\\s+(?:too\\s+)?(?:${[m, ...categories.find(c => c.id === m).aliases].join('|')})\\b`, 'i').test(options.intent));
  const preferredColors = [...new Set([...families, ...Object.keys(aliases)]
    .filter(f => has(positive, f)).map(f => aliases[f] ?? f))];
  preferredColors.push(...(positive.match(/#[\da-f]{6}\b/gi) ?? []));
  const result = { ...options, moods: [...new Set(moods)],
    avoid: [...new Set(options.avoid ?? exclusions)],
    prefer: options.prefer ?? preferredColors,
    intensity: options.intensity ?? ( /\b(subtle|muted|restrained|less saturated|quiet)\b/.test(positive) ? 'subtle' : /\b(vivid|vibrant|bright|saturated)\b/.test(positive) ? 'vivid' : 'moderate'),
    warmth: options.warmth ?? (/\b(warm|warmer)\b/.test(positive) ? 'warm' : /\b(cool|cooler)\b/.test(positive) ? 'cool' : 'balanced'),
    appearance: options.appearance ?? (/\bdark\s+(?:mode|theme|background|page|website|site)\b/.test(positive) || positive.trim() === 'dark' ? 'dark' : 'light'),
    interpretation: 'keyword-v1; explicit fields override inferred preferences',
    notes: [],
  };
  if (!result.moods.length) result.notes.push('No supported mood was recognized; ranking uses color properties. Send structured moods for complex intentions.');
  result.avoid.forEach(colorMatcher);
  result.prefer.forEach(colorMatcher);
  return result;
}

export function colorMatcher(term) {
  const t = term.toLowerCase().trim();
  if (t.startsWith('#')) { const h = normalizeHex(t); return c => c.hex === h; }
  const match = /^(?:(bright|vivid|pale|light|dark)\s+)?(.+)$/.exec(t);
  const modifier = match[1], name = aliases[match[2]] ?? match[2];
  if (!families.includes(name)) throw new TypeError(`Unknown color preference "${term}". Use a hex code or a color family (${families.join(', ')}), optionally bright, pale, light or dark.`);
  return value => {
    const c = typeof value === 'string' ? describeColor(value) : value;
    return c.family === name && (!modifier ||
      (['bright', 'vivid'].includes(modifier) && c.chroma >= 0.14) ||
      (['pale', 'light'].includes(modifier) && c.lightness >= 0.75) ||
      (modifier === 'dark' && c.lightness < 0.5));
  };
}
