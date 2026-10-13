export function normalizeHex(hex) {
  if (typeof hex !== 'string' || !/^#[\da-f]{6}$/i.test(hex)) {
    throw new TypeError('Expected a six-digit hex color such as #f27291.');
  }
  return hex.toLowerCase();
}

const linear = v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const encoded = v => v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
export function rgb(hex) {
  hex = normalizeHex(hex);
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
}
export function luminance(hex) {
  const [r, g, b] = rgb(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

// OKLab/OKLCH from linear sRGB. Lightness and chroma inform the editorial mood heuristics.
export function describeColor(hex, name = '') {
  const [r, g, b] = rgb(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb);
  const h = (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360;
  let family = C < 0.035 ? 'neutral'
    : h < 50 || h >= 350 ? 'red'
    : h < 85 ? 'orange' : h < 115 ? 'yellow'
    : h < 170 ? 'green' : h < 220 ? 'teal'
    : h < 285 ? 'blue' : h < 325 ? 'purple' : 'pink';
  if (/pink/i.test(name) || (family === 'red' && L > 0.72)) family = 'pink';
  if (/brown|sienna|umber|russet|sepia/i.test(name)) family = 'brown';
  return { hex: normalizeHex(hex), name, lightness: L, chroma: C, hue: h, family,
    warmth: ['red', 'orange', 'yellow', 'pink', 'brown'].includes(family) ? 1 : family === 'neutral' ? 0.5 : 0 };
}

export function mix(a, b, amount) {
  if (!Number.isFinite(amount) || amount < 0 || amount > 1) throw new RangeError('Mix amount must be between 0 and 1.');
  const aa = rgb(a).map(linear), bb = rgb(b).map(linear);
  return '#' + aa.map((v, i) => Math.round(Math.max(0, Math.min(1, encoded(v * (1 - amount) + bb[i] * amount))) * 255)
    .toString(16).padStart(2, '0')).join('');
}

export function readableText(background) {
  return contrast('#000000', background) >= contrast('#ffffff', background) ? '#000000' : '#ffffff';
}

export function adaptForeground(source, backgrounds, threshold = 4.5) {
  if (backgrounds.every(bg => contrast(source, bg) >= threshold)) return source;
  // Select the smallest tested linear-sRGB mix that clears all required pairs.
  for (let step = 1; step <= 100; step++) {
    for (const target of ['#000000', '#ffffff']) {
      const candidate = mix(source, target, step / 100);
      if (backgrounds.every(bg => contrast(candidate, bg) >= threshold)) return candidate;
    }
  }
  throw new Error('No foreground can meet the requested contrast against all backgrounds.');
}
