// Inlined into standalone previews by preview.js. `gallery` is supplied by the renderer.
const entries = JSON.parse(document.getElementById('data').textContent);
let mood = '';
let shown = 12;

const esc = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const kebab = key => key.replace(/[A-Z]/g, char => '-' + char.toLowerCase());

function variant(entry) {
  if (!gallery) return entry.theme;
  const appearance = document.getElementById('appearance').value;
  const mode = document.getElementById('mode').value;
  return entry.variants[`${appearance}-${mode}`];
}

function relativeLuminance(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function card(entry) {
  const { palette } = entry;
  const theme = variant(entry);
  const variables = Object.entries(theme.tokens).map(([key, value]) => `--wada-${kebab(key)}:${value}`).join(';');
  const swatches = palette.colors.map(color => `<div class="swatch"
    style="background:${color.hex};color:${relativeLuminance(color.hex) > 0.179 ? '#000000' : '#ffffff'}"
    title="${esc(color.name)}">${color.hex}</div>`).join('');
  return `<article class="card">
    <div class="sample" style="${variables}">
      <nav class="sample-nav" aria-label="Preview navigation"><span class="sample-logo">FIELDNOTES</span><a href="#combination-${palette.id}">Journal</a></nav>
      <small>ROOM TO EXPLORE</small><h2>Good things<br>take their time.</h2>
      <p>Ideas, observations, and small discoveries for a more thoughtful everyday.</p>
      <button type="button" data-example="${palette.id}">Explore the collection ↗</button>
      <div class="mini-card"><span class="mini-color"></span><div><strong>A fresh perspective</strong><p>Small details. Lasting impressions.</p></div></div>
    </div>
    <div class="swatches">${swatches}</div>
    <div class="meta" id="combination-${palette.id}">
      <div class="meta-head"><span class="number">No. ${String(palette.id).padStart(3, '0')}</span><span class="badge">Text pairs checked</span></div>
      <p class="names">${palette.colors.map(c => esc(c.name)).join(' · ')}</p>
      <div class="tags">${esc(palette.tags.join(' / '))}</div>
      <div class="exports">
        <button class="export" data-id="${palette.id}" data-format="css">Save CSS</button>
        <button class="export" data-id="${palette.id}" data-format="json">Save theme</button>
        <button class="export" data-id="${palette.id}" data-format="tailwind">Tailwind</button>
      </div>
    </div>
  </article>`;
}

function draw() {
  const query = gallery ? document.getElementById('search').value.toLowerCase().trim() : '';
  const filtered = entries.filter(({ palette }) => !query || (/^[0-9]+$/.test(query)
    ? String(palette.id) === query
    : palette.colors.some(c => c.name.toLowerCase().includes(query) || c.hex.includes(query))));
  if (mood) filtered.sort((a, b) => b.palette.moodScores[mood] - a.palette.moodScores[mood] || a.palette.id - b.palette.id);
  else if (gallery) filtered.sort((a, b) => a.palette.id - b.palette.id);
  // Recommendation previews retain the engine's ranking rather than sorting by ID.
  document.getElementById('count').textContent = `${filtered.length} combinations${mood ? ' · ranked for ' + mood : ''}`;
  document.getElementById('grid').innerHTML = filtered.slice(0, shown).map(card).join('') ||
    '<p class="empty">No combinations match. Try another color or number.</p>';
  document.getElementById('more').hidden = shown >= filtered.length;
}

function saveTheme(entry, format) {
  const theme = variant(entry);
  let content;
  let extension;
  if (format === 'json') {
    content = JSON.stringify(theme, null, 2);
    extension = 'json';
  } else if (format === 'tailwind') {
    content = '/* Import theme CSS first; Tailwind v4 */\n@theme inline {\n' +
      Object.keys(theme.tokens).map(key => `  --color-wada-${kebab(key)}: var(--wada-${kebab(key)});`).join('\n') + '\n}\n';
    extension = 'css';
  } else {
    content = `/* Wada #${theme.paletteId}; ${theme.mode}; ${theme.appearance} */\n:root {\n` +
      Object.entries(theme.tokens).map(([key, value]) => `  --wada-${kebab(key)}: ${value};`).join('\n') + '\n}\n';
    extension = 'css';
  }
  const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/css' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `wada-${theme.paletteId}-${theme.appearance}-${theme.mode}${format === 'tailwind' ? '-tailwind' : ''}.${extension}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.getElementById('status').textContent = `Saved ${anchor.download}`;
}

document.addEventListener('click', event => {
  const moodButton = event.target.closest('[data-mood]');
  if (moodButton) {
    mood = moodButton.dataset.mood;
    shown = 12;
    document.querySelectorAll('[data-mood]').forEach(button => button.setAttribute('aria-pressed', String(button === moodButton)));
    draw();
  }
  const example = event.target.closest('[data-example]');
  if (example) document.getElementById('status').textContent = `This is a sample button for combination #${example.dataset.example}. Use Save CSS to apply the theme.`;
  const download = event.target.closest('[data-format]');
  if (download) saveTheme(entries.find(e => e.palette.id === Number(download.dataset.id)), download.dataset.format);
});

if (gallery) {
  for (const id of ['search', 'appearance', 'mode']) {
    document.getElementById(id).addEventListener('input', () => { shown = 12; draw(); });
  }
}
document.getElementById('more').addEventListener('click', () => { shown += 12; draw(); });
draw();
