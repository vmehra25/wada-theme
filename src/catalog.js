import { readFileSync } from 'node:fs';
import { describeColor, contrast } from './color.js';

const combinations = JSON.parse(readFileSync(new URL('../data/combinations.json', import.meta.url), 'utf8'));
const names = JSON.parse(readFileSync(new URL('../data/color_names.json', import.meta.url), 'utf8'));
const clamp = n => Math.max(0, Math.min(1, n));
const mean = xs => xs.reduce((a, b) => a + b, 0) / xs.length;

export const categories = [
  { id: 'cheerful', description: 'Bright, lively colors with a welcoming emphasis.', aliases: ['happy', 'joyful', 'sunny', 'welcoming', 'friendly', 'optimistic'] },
  { id: 'professional', description: 'Restrained color use and clear visual hierarchy.', aliases: ['business', 'corporate', 'trustworthy', 'serious', 'credible'] },
  { id: 'calm', description: 'Gentle colors with subdued energy.', aliases: ['peaceful', 'serene', 'relaxing', 'quiet', 'tranquil'] },
  { id: 'earthy', description: 'Muted greens, browns and warm natural colors.', aliases: ['natural', 'organic', 'rustic', 'autumn', 'botanical'] },
  { id: 'elegant', description: 'Restrained accents with depth and subtlety.', aliases: ['luxury', 'refined', 'sophisticated', 'premium'] },
  { id: 'playful', description: 'Expressive hue variety and lively contrasts.', aliases: ['fun', 'creative', 'whimsical', 'quirky'] },
  { id: 'soft', description: 'Pale, gentle colors and lower chroma.', aliases: ['romantic', 'pastel', 'delicate', 'dreamy'] },
  { id: 'dramatic', description: 'Deep colors, stronger accents and pronounced contrast.', aliases: ['bold', 'moody', 'striking', 'intense'] },
];

function annotate(hexes, index) {
  const colors = hexes.map(h => describeColor(h, names[h]));
  const L = mean(colors.map(c => c.lightness));
  const vividness = clamp(mean(colors.map(c => c.chroma)) / 0.25);
  const warmth = mean(colors.map(c => c.warmth));
  const spread = Math.max(...colors.map(c => c.lightness)) - Math.min(...colors.map(c => c.lightness));
  const depth = 1 - Math.min(...colors.map(c => c.lightness));
  const variety = new Set(colors.filter(c => c.chroma >= 0.035).map(c => c.family)).size / 4;
  const earth = colors.filter(c => ['brown', 'green', 'yellow', 'orange'].includes(c.family) && c.chroma < 0.16).length / colors.length;
  const scores = {
    cheerful: clamp(0.40 * vividness + 0.40 * L + 0.20 * warmth),
    professional: clamp(0.50 * (1 - vividness) + 0.30 * spread + 0.20 * depth),
    calm: clamp(0.60 * (1 - vividness) + 0.25 * L + 0.15 * (1 - spread)),
    earthy: clamp(0.65 * earth + 0.25 * (1 - vividness) + 0.10 * warmth),
    elegant: clamp(0.45 * (1 - vividness) + 0.35 * depth + 0.20 * spread),
    playful: clamp(0.55 * vividness + 0.30 * variety + 0.15 * L),
    soft: clamp(0.55 * L + 0.35 * (1 - vividness) + 0.10 * (1 - spread)),
    dramatic: clamp(0.45 * depth + 0.35 * spread + 0.20 * vividness),
  };
  const ratios = hexes.flatMap((a, i) => hexes.slice(i + 1).map(b => contrast(a, b)));
  const tags = Object.entries(scores).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
  return { id: index + 1, hexes, colors, tags, moodScores: scores,
    annotation: { method: 'heuristic-v1', reviewed: false, note: 'Editorial interpretations, not historical labels or psychological guarantees.' },
    features: { lightness: L, vividness, warmth, lightnessSpread: spread, hueVariety: variety,
      maxInternalContrast: Math.max(...ratios), hasInternalBodyTextPair: ratios.some(r => r >= 4.5) },
    source: { title: 'A Dictionary of Color Combinations', author: 'Sanzo Wada',
      url: 'https://colors.elwyn.co/', combination: index + 1 },
  };
}

const catalog = combinations.map(annotate);
export function getPalette(id) {
  if (!Number.isInteger(id) || id < 1 || id > catalog.length) throw new RangeError('Palette ID must be an integer from 1 to 348.');
  return structuredClone(catalog[id - 1]);
}
export function listPalettes() { return structuredClone(catalog); }
export function getColorNames() { return { ...names }; }
