import test from 'node:test';
import assert from 'node:assert/strict';
import { listPalettes, getColorNames, getPalette, parseIntent, recommendPalettes, buildTheme, checkTheme, exportCss, exportTailwind, contrast, renderPreview } from '../src/index.js';
import { colorMatcher } from '../src/intent.js';

test('the original 348 combinations and 159 color names are preserved', () => {
  const palettes = listPalettes(), names = getColorNames();
  assert.equal(palettes.length, 348); assert.equal(Object.keys(names).length, 159);
  assert.deepEqual(palettes.map(p => p.id), Array.from({ length: 348 }, (_, i) => i + 1));
  assert.deepEqual(palettes.reduce((m, p) => { m[p.hexes.length] = (m[p.hexes.length] ?? 0) + 1; return m; }, {}), { 2: 120, 3: 120, 4: 108 });
  assert.deepEqual(getPalette(1).hexes, ['#d96629', '#0093a5']);
  assert.deepEqual(getPalette(348).hexes, ['#c1c494', '#437742', '#253122', '#501345']);
  for (const p of palettes) for (const c of p.colors) assert.equal(c.name, names[c.hex]);
  palettes[0].hexes[0] = '#000000'; assert.equal(getPalette(1).hexes[0], '#d96629');
});

test('color exclusions are absent by default; positive pink requests retain pink', () => {
  assert.deepEqual(parseIntent('cheerful and professional').avoid, []);
  const pink = parseIntent('a cheerful pink website');
  assert.deepEqual(pink.avoid, []); assert.deepEqual(pink.prefer, ['pink']);
  assert.deepEqual(parseIntent('cheerful without bright pink').avoid, ['bright pink']);
  assert.deepEqual(parseIntent('cheerful without bright pink').prefer, []);
  assert.deepEqual(parseIntent({ intent: 'avoid pink', avoid: [] }).avoid, []);
  assert.deepEqual(parseIntent({ intent: 'professional pink', moods: ['playful'], prefer: [] }).moods, ['playful']);
  assert.deepEqual(parseIntent('not playful, professional').moods, ['professional']);
  assert.equal(parseIntent('less saturated, warmer').intensity, 'subtle');
  assert.equal(parseIntent('less saturated, warmer').warmth, 'warm');
  assert.equal(parseIntent('a dark pink accent').appearance, 'light');
  assert.equal(parseIntent('a professional dark theme').appearance, 'dark');
});

test('exclusions are enforced and impossible constraints return an empty result', () => {
  const result = recommendPalettes({ moods: ['cheerful'], avoid: ['pink'], limit: 20 });
  for (const r of result.recommendations) assert.ok(!r.palette.colors.some(colorMatcher('pink')));
  const bright = recommendPalettes('cheerful, avoid bright pink');
  for (const r of bright.recommendations) assert.ok(!r.palette.colors.some(colorMatcher('bright pink')));
  const empty = recommendPalettes({ avoid: ['pink', 'red', 'orange', 'yellow', 'green', 'teal', 'blue', 'purple', 'brown', 'neutral'] });
  assert.equal(empty.totalMatches, 0); assert.deepEqual(empty.recommendations, []);
  assert.throws(() => recommendPalettes({ avoid: ['chartreuse-ish'] }), /Unknown color preference/);
});

test('ranking is deterministic and preference matches influence results', () => {
  assert.deepEqual(recommendPalettes('calm and earthy'), recommendPalettes('calm and earthy'));
  const names = recommendPalettes({ moods: ['cheerful'], prefer: ['pink'], limit: 3 }).recommendations;
  assert.ok(names.some(r => r.palette.colors.some(colorMatcher('pink'))));
  assert.equal(new Set(names.map(r => r.palette.id)).size, names.length);
});

test('all 1,392 themes pass required token pairs, with faithful provenance', () => {
  for (const p of listPalettes()) for (const appearance of ['light', 'dark']) for (const mode of ['faithful', 'adapted']) {
    const theme = buildTheme({ paletteId: p.id, appearance, mode });
    assert.equal(theme.validation.passes, true, `${p.id}/${appearance}/${mode}`);
    for (const c of theme.validation.checks) assert.ok(contrast(theme.tokens[c.foreground], theme.tokens[c.background]) >= c.minimum);
    assert.deepEqual(theme.originalColors, p.hexes);
    for (const [role, origin] of Object.entries(theme.provenance)) {
      if (origin.kind === 'original') assert.ok(p.hexes.includes(theme.tokens[role]));
      if (mode === 'faithful') assert.notEqual(origin.kind, 'derived');
    }
  }
});

test('custom primary colors must be original; adapted shades carry their source', () => {
  const theme = buildTheme({ paletteId: 14, primaryColor: '#FBE6A0', mode: 'adapted' });
  assert.equal(theme.tokens.primary, '#fbe6a0');
  assert.equal(theme.provenance.background.kind, 'derived');
  assert.equal(theme.provenance.background.sourceHex, '#fbe6a0');
  assert.throws(() => buildTheme({ paletteId: 14, primaryColor: '#000000' }), /original color/);
});

test('contrast validation detects failures and rejects malformed or missing tokens', () => {
  assert.equal(contrast('#000000', '#FFFFFF'), 21);
  assert.equal(contrast('#ffffff', '#ffffff'), 1);
  assert.equal(checkTheme({ tokens: { text: '#777777', bg: '#ffffff' }, pairs: [{ foreground: 'text', background: 'bg' }] }).passes, false);
  assert.throws(() => checkTheme({ tokens: { text: '#fff' } }));
  assert.throws(() => checkTheme({ tokens: { text: '#000000' }, pairs: [{ foreground: 'text', background: 'missing' }] }), /Missing/);
  assert.throws(() => checkTheme({ tokens: { 'x; color:red': '#000000' } }));
  assert.throws(() => getPalette(349)); assert.throws(() => getPalette(1.5));
});

test('exports are scoped and offline previews escape external text', () => {
  const theme = buildTheme({ paletteId: 14 });
  assert.match(exportCss(theme), /--wada-on-primary:/);
  assert.match(exportTailwind(theme), /@theme inline/);
  assert.throws(() => exportCss(theme, { selector: 'body;}' }));
  const result = recommendPalettes({ moods: ['calm'] });
  const html = renderPreview(result, { title: '</title><script>alert(1)</script>' });
  assert.ok(!html.includes('<script>alert(1)</script>'));
  assert.ok(!html.includes('src="https://'));
});
