# Wada Theme

Turn an intention such as “cheerful and professional” into website colors drawn from **348 Sanzo Wada combinations**. Use the same local engine through JavaScript, a command-line interface, or an MCP-enabled coding agent. No API key or remote service is required at runtime.

The engine recommends palettes, assigns semantic roles, checks contrast and exports CSS. The companion skill guides a coding agent through inspecting and recoloring a real project. The MCP server itself does not read or modify website files.

## Install from this checkout

Requires Node.js 20 or newer. Clone the repository and install:

```sh
git clone https://github.com/vmehra25/wada-theme.git
cd wada-theme
npm ci
node bin/wada-theme.js --help
npm test
```

For a command available elsewhere, run `npm link` inside the checkout. This version has not been published to npm; do not assume an npm package with this name is this project.

## Get a theme

```sh
node bin/wada-theme.js recommend "cheerful and professional"
node bin/wada-theme.js recommend "a cheerful pink website" --prefer pink
node bin/wada-theme.js theme --palette 14 --format css --out theme.css
node bin/wada-theme.js theme --palette 14 --out wada-theme.json
node bin/wada-theme.js preview "calm and earthy" --out preview.html
node bin/wada-theme.js gallery --out gallery.html
```

Open the HTML files directly in a browser. The gallery compares all 348 combinations, supports mood ranking and color-name/hex/number searches, switches light/dark and faithful/adapted modes, and downloads theme JSON, CSS, or Tailwind mappings. It works offline.

**Every color, including bright pink, is available.** Exclusions are empty by default and only follow explicit requests. `--avoid pink` removes pink palettes; `--prefer pink` boosts them. Preferences are soft ranking signals; exclusions are hard constraints. No match returns an empty result instead of relaxing exclusions.

For nuanced or multilingual intentions, let your coding agent interpret the request into structured preferences, or pass `--file preferences.json`:

```json
{
  "moods": ["cheerful", "professional"],
  "intensity": "moderate",
  "warmth": "balanced",
  "appearance": "light",
  "mode": "faithful",
  "prefer": ["pink"],
  "avoid": [],
  "limit": 3
}
```

Structured fields override the convenience English keyword parser. It recognizes simple explicit color exclusions such as “avoid bright pink”; it is not a general language model. Use structured `avoid` for complex lists or negations.

## Apply to a page

Import the generated CSS and map existing color roles to variables:

```css
body { background: var(--wada-background); color: var(--wada-text); }
.card { background: var(--wada-surface); border: 1px solid var(--wada-border); }
.muted { color: var(--wada-muted-text); }
a { color: var(--wada-link); text-decoration: underline; }
.button { background: var(--wada-primary); color: var(--wada-on-primary); }
.button:hover { background: var(--wada-primary-hover); color: var(--wada-on-primary-hover); text-decoration: underline; }
input { background: var(--wada-surface); color: var(--wada-text); border: 1px solid var(--wada-input-border); }
:focus-visible { outline: 2px solid var(--wada-focus); outline-offset: 3px; }
```

Variables alone do not recolor existing components. Replace their role-specific references; do not globally replace matching hex strings. Preserve status meanings, logos, images and unrelated design decisions.

See `examples/before.html` and `examples/after.html` for the same page before and after recoloring. Save the palette ID, preferences, mode, appearance and project token mapping to retain context for later refinements.

For Tailwind v4, generate `--format tailwind` and import it after `theme.css`; use `bg-wada-background`, `text-wada-text`, `bg-wada-primary` and `text-wada-on-primary`. For Tailwind v3, see `examples/tailwind-v3.config.cjs`. Component libraries with HSL-only tokens need conversion rather than direct hex substitution.

## MCP setup

Add the following to your harness's MCP server configuration, replacing the path with this checkout's **absolute** path. Configuration file locations depend on the harness.

```json
{
  "mcpServers": {
    "wada-theme": {
      "command": "node",
      "args": ["/absolute/path/to/wada-theme/bin/wada-theme.js", "mcp"]
    }
  }
}
```

Use an absolute Node executable if your harness cannot resolve `node` on PATH. The local stdio server uses the official MCP SDK and supports modern and legacy openings. It writes protocol messages to stdout and diagnostics to stderr.

| Tool | Output |
| --- | --- |
| `list_categories` | Eight moods, descriptions and synonyms |
| `recommend_palettes` | Ranked combinations, interpreted preferences, explanations and themes |
| `get_palette` | Original colors, names, measurements, mood scores and attribution |
| `build_theme` | Semantic tokens, provenance, contrast results, CSS and Tailwind v4 mappings |
| `check_theme` | Contrast results for default or explicitly supplied token pairs |
| `preview_themes` | Standalone HTML comparing recommendations; host saves/opens it |

All tools compute locally and are read-only. No hosted authentication, filesystem access, website crawler or browser extension is included.

### Companion skill

Copy `skills/wada-theme/` into your harness's supported skill directory, or point it at `skills/wada-theme/SKILL.md`. Use the MCP tools when connected; the skill also describes a CLI fallback. This checkout packages the skill but does not automatically install it into an existing harness.

Try: “Use Wada Theme to make this page cheerful and professional. Keep its layout and show me the result.” The host agent inspects the project, selects a theme, applies role-specific changes and checks the actual page.

## Use in code

```js
import { recommendPalettes, buildTheme, exportCss, checkTheme } from './src/index.js';

const result = recommendPalettes({ moods: ['calm', 'earthy'], avoid: [], limit: 3 });
const theme = buildTheme({ paletteId: result.recommendations[0].palette.id });
console.log(exportCss(theme));
console.log(checkTheme({ tokens: theme.tokens }).passes);
```

When installed as a local package dependency, import from `wada-theme`. Its core, CLI and MCP entry points use the same scoring and theme functions.

## Color modes and accessibility

- **Faithful (default):** original combination colors with neutral supporting backgrounds and text. No tints/shades of palette colors are invented. All original colors remain available as `palette1` through `palette4` tokens.
- **Adapted:** original accents plus subtle surface tints and contrast-adjusted shades, with source color and transformation recorded in `provenance`.

Normal text pairs target 4.5:1; focus and input-border pairs target 3:1. The engine validates full-precision ratios, not rounded display values. Checks cover opaque sRGB token pairs only. They do **not** prove full WCAG compliance, rendered contrast over gradients/images, opacity interactions, focus geometry or distinguishable status meaning. Verify the actual page separately.

Default foreground/background pairs are included in exported theme JSON. Custom checks accept `{ tokens, pairs: [{ foreground, background, minimum }] }`, where pair values are token names. `wada-theme check --file theme.json` exits nonzero when pairs fail.

## Mood classification

The eight starting moods are cheerful, professional, calm, earthy, elegant, playful, soft and dramatic. Combinations can score in every category rather than being forced into one bucket. Scoring uses OKLCH lightness/chroma, measured hue families, warmth, hue variety and lightness spread. Requests combine mood, intensity, warmth and color preferences; shortlist selection penalizes overlapping palettes for diversity.

Annotations are **heuristic-v1 and unreviewed**. These are editorial design suggestions, not labels from Wada, universal psychological effects or human-curated classifications. A visual review of the rendered collection is the next design iteration. Formula changes should be versioned and tested against realistic requests.

## Source, license and contribution

MIT for this project's original code. Dataset and source notices are preserved in `licenses/` and `NOTICE.md`; the MCP SDK is Apache-2.0 and Zod is MIT. The scraped names, hex values and membership of all 348 combinations match the credited upstream dataset; website ordering is preserved. These digital colors are conversions, not claims of exact printed reproduction.

See `CONTRIBUTING.md` for development and tests. `npm pack` creates a distributable archive. This project has not yet been published to npm; verify package-name availability before publishing.
