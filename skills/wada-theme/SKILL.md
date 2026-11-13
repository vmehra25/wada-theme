---
name: wada-theme
description: Create or recolor a website using Sanzo Wada color combinations, guided by the user's mood and preferences. Use the bundled local CLI to select palettes, apply semantic color tokens, and verify the rendered page.
---

Use Wada Theme to select original combinations and translate them into usable page colors. The host coding agent owns website inspection and edits. The bundled engine returns data, CSS and preview HTML through a local CLI.

## Self-contained Agensi ZIP

Distribute one `wada-theme/` folder with these contents at the same level. Paths in this section are relative to the repository root when assembling the archive.

```text
wada-theme/
  SKILL.md
  src/                      All source files, including gallery-client.js
  data/
    combinations.json       All 348 original combinations
    color_names.json        159 hex/name mappings
  bin/
    wada-theme.js
  package.json
  package-lock.json
  LICENSE
  licenses/
    dataset-MIT.txt
    website-MIT.txt
  NOTICE.md
```

Keep `src/`, `data/` and `bin/` intact. Include the project MIT `LICENSE` and upstream notices with the distribution. The bundled digital colors can differ from printed swatches. Mood annotations, generated shades and semantic assignments are Wada Theme contributions. Retain attribution to Sanzo Wada, Matt DesLauriers, Dain M. Blodorn Kim and Benjamin Elwyn as recorded in `NOTICE.md` and `licenses/`.

Assemble from a reviewed repository revision with Python 3, using a fresh output directory. This copies the skill entry point and its runtime resources into one folder and creates the marketplace ZIP.

```sh
python3 - <<'PYZIP'
from pathlib import Path
import shutil

repo = Path.cwd()
stage = repo / 'dist' / 'agensi'
bundle = stage / 'wada-theme'
bundle.mkdir(parents=True, exist_ok=False)
shutil.copy2(repo / 'skills/wada-theme/SKILL.md', bundle / 'SKILL.md')
for name in ('src', 'data', 'bin', 'licenses'):
    shutil.copytree(repo / name, bundle / name)
for name in ('package.json', 'package-lock.json', 'LICENSE', 'NOTICE.md'):
    shutil.copy2(repo / name, bundle / name)
shutil.make_archive(str(stage / 'wada-theme'), 'zip', stage, 'wada-theme')
PYZIP
```

Upload `dist/agensi/wada-theme.zip`. Exclude `node_modules`, credentials and unrelated checkout files. A repository source ZIP or `npm pack` archive has a different layout. Assemble this bundle explicitly so the entry point and lockfile are included together.

## Local setup

Requires Node.js >=20, npm and a host agent able to execute local commands. After extraction, locate the folder containing this `SKILL.md` and `package.json`. Set `SKILL_ROOT` to that folder's absolute path, including when the host installs it in a skill directory. Set `PROJECT_ROOT` to the absolute path of the website being edited. Replace both example paths before running commands.

```sh
SKILL_ROOT='/absolute/path/to/wada-theme'
PROJECT_ROOT='/absolute/path/to/website'
node --version
(cd "$SKILL_ROOT" && npm ci --omit=dev)
node "$SKILL_ROOT/bin/wada-theme.js" --help
```

Reuse these variables in subsequent shell sessions or set them again. Install dependencies inside the extracted skill folder. Initial installation needs access to the npm registry or a populated cache. Once installed, palette selection, theme exports and preview generation run locally. An external checkout, API key, hosted service and configured MCP connection are unnecessary for this workflow. The package includes MCP dependencies, but the CLI loads its server only for the `mcp` command.

The engine resolves `data/` and `src/gallery-client.js` through `import.meta.url`, relative to bundled source files. CLI `--file` and `--out` paths resolve from the process working directory. Use absolute project paths as shown below to keep inputs and outputs in the intended project. Inspect outputs before overwriting existing files. If installation or local command execution is unavailable, report the limitation and avoid claiming that the bundled engine ran.

## Interpret the request

Use CLI `categories` to discover moods. With an existing MCP connection, the equivalent tool is `list_categories`. Translate free-form intent into structured preferences where useful: moods, intensity, warmth, appearance, prefer and avoid. Several moods may coexist. **Leave avoid empty unless the user explicitly excludes colors.** Pink and every other dataset color are available. `prefer` boosts a color; it is not a hard requirement. Explain conflicts rather than silently changing constraints.

The keyword parser is basic English; interpret nuanced, negative or multilingual requests yourself and send explicit structured fields. Mood scores are heuristics, not original Wada labels or validated emotional effects.

## Select and apply

Inspect the existing theme variables, CSS, component styling, light/dark setup and status semantics. Run CLI `recommend` for a small shortlist, then `theme --palette ID` for the selected combination. MCP equivalents are `recommend_palettes` and `build_theme`. Use CLI `--primary` (MCP `primaryColor`) when the first original color should not be the dominant accent. Default to faithful (original colors plus neutrals); use adapted for identified tints/shades when requested or appropriate to the user's intended outcome. Honor a specified palette or mode.

When the user authorizes applying a theme, choose a reasonable match and proceed. Do not require a palette-selection confirmation unless a material ambiguity needs resolving. CLI `preview` (MCP `preview_themes`) returns offline HTML. Save and open it if comparison would help. CLI `gallery` exports an offline browser for all 348 combinations.

Map the returned tokens into the project's existing roles. Replace colors by meaning, not by blind global hex replacement. Preserve layout, typography, content, logos, images and functional behavior unless requested. Preserve success/error/warning meanings. Variables alone do not recolor a page; update relevant component references too.

For plain CSS use `--wada-background`, `--wada-surface`, `--wada-text`, `--wada-muted-text`, `--wada-primary`, `--wada-on-primary`, `--wada-primary-hover`, `--wada-on-primary-hover`, `--wada-link`, `--wada-accent`, `--wada-on-accent`, `--wada-border`, `--wada-input-border` and `--wada-focus`. Underline links. Put focus outlines outside controls with an offset so the surrounding background is the checked surface. In faithful mode retain color on hover and add a non-color cue.

Tailwind v4 can use the returned `@theme inline` mappings after importing theme CSS. In Tailwind v3 extend `theme.colors` with these CSS variables; do not insert v4 syntax into a v3 project. Adapt component-library token formats, including HSL-only variables, rather than assuming hex can be substituted unchanged.

## Verify and refine

Run CLI `check --file` (MCP `check_theme`) for actual foreground/background pairs. Open the changed page when browser tooling is available; inspect navigation, buttons, forms, cards, links, focus states and responsive layouts. Contrast checks cover opaque sRGB tokens only, not gradients, images, opacity, focus geometry or full accessibility. Report when visual verification is unavailable.

Save palette ID, mode, appearance, original preferences and token mapping in a project file such as `wada-theme.json` so later refinements retain context. For “warmer” or “less saturated,” update the previous preferences and rerank; keep the selected palette if the user asks to retain it. Identify generated shades through provenance.

## CLI workflow and fallback

Use the bundled CLI directly. It also provides the fallback when an optional MCP connection is unavailable.

```sh
node "$SKILL_ROOT/bin/wada-theme.js" categories
node "$SKILL_ROOT/bin/wada-theme.js" recommend "cheerful and professional" --limit 3
node "$SKILL_ROOT/bin/wada-theme.js" palette --palette 14
node "$SKILL_ROOT/bin/wada-theme.js" theme --palette 14 --format css --out "$PROJECT_ROOT/theme.css"
node "$SKILL_ROOT/bin/wada-theme.js" theme --palette 14 --format json --out "$PROJECT_ROOT/wada-theme.json"
node "$SKILL_ROOT/bin/wada-theme.js" theme --palette 14 --format tailwind --out "$PROJECT_ROOT/wada-tailwind.css"
node "$SKILL_ROOT/bin/wada-theme.js" preview "calm and earthy" --out "$PROJECT_ROOT/wada-preview.html"
node "$SKILL_ROOT/bin/wada-theme.js" gallery --out "$PROJECT_ROOT/wada-gallery.html"
node "$SKILL_ROOT/bin/wada-theme.js" check --file "$PROJECT_ROOT/wada-theme.json"
```

Palette 14 is an example. Use the selected ID and consistent `--appearance light|dark`, `--mode faithful|adapted` and optional `--primary '#f27291'` when exporting each format. `--primary` must be an original color of the selected combination. Theme JSON includes tokens, pairs, provenance and validation. Preserve those fields when adding project preferences and token mapping for later refinement. CSS output alone cannot be passed to `check`.

For structured preferences, save a JSON file in the project, for example the following.

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

```sh
node "$SKILL_ROOT/bin/wada-theme.js" recommend --file "$PROJECT_ROOT/preferences.json"
node "$SKILL_ROOT/bin/wada-theme.js" preview --file "$PROJECT_ROOT/preferences.json" --out "$PROJECT_ROOT/wada-preview.html"
```

`--file` supplies preferences for `recommend` and `preview`. The `theme` command takes its palette and options from flags. For custom contrast checks, `check --file` accepts `{ "tokens": { "text": "#000000", "background": "#ffffff" }, "pairs": [{ "foreground": "text", "background": "background", "minimum": 4.5 }] }`. Pair values name tokens. Use the actual rendered color roles and surfaces when choosing pairs. A failed contrast check exits with status 1. Invalid input also exits nonzero, with a diagnostic on stderr.

Exclusions are hard constraints. An empty recommendation list requires reporting the conflict before changing the user's exclusions. `prefer` is a soft ranking signal. Run `--help` for supported flags. An explicitly linked or installed local package can expose `wada-theme` on PATH. Avoid unverified remote package execution.

## Distribution verification

Before listing, extract the ZIP into a fresh directory outside the checkout, preferably with spaces in its path. Set `SKILL_ROOT` to the extracted `wada-theme/` folder and `PROJECT_ROOT` to an existing temporary output directory. Run local setup, then run the CLI workflow above from that output directory. Confirm categories, recommendations and both boundary palette IDs, CSS/JSON/Tailwind exports, preview/gallery HTML and a passing `check` without a configured MCP connection.

```sh
node "$SKILL_ROOT/bin/wada-theme.js" palette --palette 1
node "$SKILL_ROOT/bin/wada-theme.js" palette --palette 348
node --input-type=module - "$SKILL_ROOT" <<'JS'
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = pathToFileURL(process.argv[2] + '/');
const data = JSON.parse(readFileSync(new URL('data/combinations.json', root), 'utf8'));
const names = JSON.parse(readFileSync(new URL('data/color_names.json', root), 'utf8'));
assert.equal(data.length, 348);
assert.equal(Object.keys(names).length, 159);
console.log('Verified 348 combinations and 159 color names');
JS
```

For repository development, run `npm ci` followed by `npm test` from the repository root. The suite covers the catalog, intent/exclusions, all 1,392 palette/appearance/mode themes, CLI exports/errors and MCP tools. The minimal marketplace bundle omits `test/` and development dependencies. Running `npm test` there does not establish repository test coverage. Use the extraction checks above to verify the shipped runtime. Report test failures and unavailable browser verification accurately.
