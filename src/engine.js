import { listPalettes, getPalette } from './catalog.js';
import { parseIntent, colorMatcher } from './intent.js';
import { contrast, readableText, adaptForeground, mix, normalizeHex } from './color.js';
import { themeOptionsSchema, checkSchema } from './schema.js';

const defaultPairs = [
  ['text', 'background', 4.5], ['text', 'surface', 4.5], ['mutedText', 'surface', 4.5],
  ['mutedText', 'background', 4.5], ['onPrimary', 'primary', 4.5], ['onPrimaryHover', 'primaryHover', 4.5],
  ['onAccent', 'accent', 4.5], ['link', 'background', 4.5], ['link', 'surface', 4.5],
  ['focus', 'background', 3], ['focus', 'surface', 3],
  ['inputBorder', 'surface', 3], ['inputBorder', 'background', 3],
].map(([foreground, background, minimum]) => ({ foreground, background, minimum }));

export function checkTheme(input) {
  const { tokens, pairs = defaultPairs } = checkSchema.parse(input);
  const checks = pairs.map(pair => {
    if (!(pair.foreground in tokens) || !(pair.background in tokens)) throw new TypeError(`Missing color token for ${pair.foreground}/${pair.background}.`);
    const ratio = contrast(tokens[pair.foreground], tokens[pair.background]);
    return { ...pair, ratio, passes: ratio >= pair.minimum };
  });
  return { passes: checks.every(c => c.passes), checks,
    scope: 'Specified opaque sRGB token pairs only. Rendered layouts, images, opacity, focus geometry and complete WCAG compliance require separate review.' };
}

export function buildTheme(input) {
  const options = themeOptionsSchema.parse(input);
  const palette = getPalette(options.paletteId);
  const { appearance, mode } = options;
  const dark = appearance === 'dark';
  const neutral = { background: dark ? '#151515' : '#ffffff', surface: dark ? '#202020' : '#f6f6f6',
    text: dark ? '#f6f6f6' : '#111111', mutedText: dark ? '#bbbbbb' : '#555555',
    border: dark ? '#484848' : '#dddddd' };
  const provenance = Object.fromEntries(Object.keys(neutral).map(k => [k, { kind: 'supporting-neutral' }]));
  const tokens = { ...neutral };
  const originalPrimary = options.primaryColor ? normalizeHex(options.primaryColor) : palette.hexes[0];
  if (!palette.hexes.includes(originalPrimary)) throw new TypeError('primaryColor must be an original color in the selected palette.');
  const accent = palette.hexes.find(h => h !== originalPrimary);
  const backgrounds = [tokens.background, tokens.surface];
  const put = (role, hex, origin) => { tokens[role] = hex; provenance[role] = origin; };
  const original = hex => ({ kind: 'original', sourceHex: hex, paletteId: palette.id });
  const derived = (hex, sourceHex, purpose) => hex === sourceHex ? original(hex) : { kind: 'derived', sourceHex, method: 'linear-srgb-mix', purpose };
  put('primary', originalPrimary, original(originalPrimary));
  put('onPrimary', readableText(tokens.primary), { kind: 'supporting-neutral' });
  put('accent', accent, original(accent));
  put('onAccent', readableText(accent), { kind: 'supporting-neutral' });
  palette.hexes.forEach((hex, i) => put(`palette${i + 1}`, hex, original(hex)));
  if (mode === 'adapted') {
    put('background', mix(originalPrimary, dark ? '#000000' : '#ffffff', dark ? 0.94 : 0.96), { kind: 'derived', sourceHex: originalPrimary, method: 'linear-srgb-mix', purpose: 'subtle page tint' });
    put('surface', mix(accent, dark ? '#000000' : '#ffffff', dark ? 0.90 : 0.98), { kind: 'derived', sourceHex: accent, method: 'linear-srgb-mix', purpose: 'subtle surface tint' });
    backgrounds.splice(0, 2, tokens.background, tokens.surface);
  }
  const eligible = palette.hexes.filter(h => backgrounds.every(bg => contrast(h, bg) >= 4.5));
  if (eligible.length) put('link', eligible[0], original(eligible[0]));
  else if (mode === 'adapted') {
    const value = adaptForeground(originalPrimary, backgrounds);
    put('link', value, derived(value, originalPrimary, 'readable link'));
  } else put('link', neutral.text, { kind: 'supporting-neutral' });
  const focusCandidates = palette.hexes.filter(h => backgrounds.every(bg => contrast(h, bg) >= 3));
  put('focus', focusCandidates[0] ?? neutral.text, focusCandidates.length ? original(focusCandidates[0]) : { kind: 'supporting-neutral' });
  put('inputBorder', dark ? '#999999' : '#777777', { kind: 'supporting-neutral' });
  const hover = mode === 'adapted' ? mix(originalPrimary, dark ? '#ffffff' : '#000000', 0.10) : originalPrimary;
  put('primaryHover', hover, derived(hover, originalPrimary, 'button hover'));
  put('onPrimaryHover', readableText(hover), { kind: 'supporting-neutral' });
  // Very saturated adapted surfaces can require a slightly different neutral foreground.
  for (const role of ['text', 'mutedText', 'inputBorder']) {
    const minimum = role === 'inputBorder' ? 3 : 4.5;
    if (!backgrounds.every(bg => contrast(tokens[role], bg) >= minimum)) {
      put(role, adaptForeground(tokens[role], backgrounds, minimum), { kind: 'supporting-neutral' });
    }
  }
  const validation = checkTheme({ tokens });
  if (!validation.passes) throw new Error('Unable to construct a theme satisfying the checked token pairs.');
  return { schemaVersion: 1, paletteId: palette.id, appearance, mode,
    originalColors: palette.hexes, tokens, provenance, validation,
    guidance: [
      'Use primary and accent for emphasis; neutral surfaces keep the original colors distinct.',
      'Underline links. Use a 2px focus outline with a 3px offset so it contrasts with the page surface.',
      'Faithful hover may use an underline or inset outline; it keeps the original color.',
      'Preserve existing success, warning and error semantics; this theme does not assign status colors.',
      'Keep the page layout, typography, images and logos unless the user requests changes.',
    ], source: palette.source };
}

export function exportCss(theme, { selector = ':root' } = {}) {
  if (![':root', '[data-wada-theme]'].includes(selector)) throw new TypeError('Supported CSS selectors: :root or [data-wada-theme].');
  checkTheme({ tokens: theme.tokens });
  return `/* Sanzo Wada combination #${theme.paletteId}; ${theme.mode}; ${theme.appearance} */\n${selector} {\n` +
    Object.entries(theme.tokens).map(([key, value]) => `  --wada-${key.replace(/[A-Z]/g, c => '-' + c.toLowerCase())}: ${normalizeHex(value)};`).join('\n') + '\n}\n';
}

export function exportTailwind(theme) {
  return `/* Tailwind v4: import the generated theme.css before this file. */\n@theme inline {\n` +
    Object.keys(theme.tokens).map(key => {
      const kebab = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
      return `  --color-wada-${kebab}: var(--wada-${kebab});`;
    }).join('\n') + '\n}\n';
}

export function recommendPalettes(input = {}) {
  const preferences = parseIntent(input);
  const avoid = preferences.avoid.map(colorMatcher), prefer = preferences.prefer.map(colorMatcher);
  const targetVividness = { subtle: 0.25, moderate: 0.50, vivid: 0.80 }[preferences.intensity];
  const candidates = listPalettes().filter(p => !avoid.some(match => p.colors.some(match))).map(p => {
    const mood = preferences.moods.length ? preferences.moods.reduce((s, m) => s + p.moodScores[m], 0) / preferences.moods.length : 0.5;
    const intensity = 1 - Math.abs(p.features.vividness - targetVividness);
    const warmth = 1 - Math.abs(p.features.warmth - { warm: 1, cool: 0, balanced: 0.5 }[preferences.warmth]);
    const preferred = prefer.length ? prefer.filter(match => p.colors.some(match)).length / prefer.length : 0.5;
    const baseScore = 0.6 * mood + 0.2 * intensity + 0.1 * warmth + 0.1 * preferred;
    return { palette: p, score: baseScore, baseScore,
      reasons: [...preferences.moods.map(m => `${m}: ${Math.round(p.moodScores[m] * 100)}/100 editorial match`),
        `${preferences.intensity} intensity; ${Math.round(p.features.vividness * 100)}/100 measured vividness`,
        ...(prefer.length ? [`${Math.round(preferred * 100)}% of preferred color families present`] : []),
        ...(p.features.hasInternalBodyTextPair ? ['Contains a readable original-color text pair.'] : ['Supporting text colors are needed for body-text contrast.'])] };
  });
  const selected = [];
  while (selected.length < preferences.limit && candidates.length) {
    for (const c of candidates) {
      const overlap = selected.length ? Math.max(...selected.map(s => {
        const intersection = c.palette.hexes.filter(h => s.palette.hexes.includes(h)).length;
        return intersection / new Set([...c.palette.hexes, ...s.palette.hexes]).size;
      })) : 0;
      c.score = c.baseScore - 0.15 * overlap;
    }
    candidates.sort((a, b) => b.score - a.score || a.palette.id - b.palette.id);
    const best = candidates.shift();
    selected.push({ ...best, theme: buildTheme({ paletteId: best.palette.id, mode: preferences.mode, appearance: preferences.appearance }) });
  }
  return { preferences, totalMatches: selected.length + candidates.length, recommendations: selected,
    notes: selected.length ? ['Mood labels are heuristic and unreviewed; visual preference remains subjective.'] : ['No palette matches the exclusions. Relax a constraint; excluded colors were not silently reintroduced.'] };
}
