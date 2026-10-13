---
name: wada-theme
description: Create or recolor a website using Sanzo Wada color combinations, guided by the user's mood and preferences. Use with the wada-theme MCP server or local CLI to select palettes, apply semantic color tokens, and verify the rendered page.
---

Use Wada Theme to select original combinations and translate them into usable page colors. The host coding agent owns website inspection and edits; the MCP server returns data, CSS and preview HTML.

## Interpret the request

Use `list_categories` to discover moods. Translate free-form intent into structured preferences where useful: moods, intensity, warmth, appearance, prefer and avoid. Several moods may coexist. **Leave avoid empty unless the user explicitly excludes colors.** Pink and every other dataset color are available. `prefer` boosts a color; it is not a hard requirement. Explain conflicts rather than silently changing constraints.

The keyword parser is basic English; interpret nuanced, negative or multilingual requests yourself and send explicit structured fields. Mood scores are heuristics, not original Wada labels or validated emotional effects.

## Select and apply

Inspect the existing theme variables, CSS, component styling, light/dark setup and status semantics. Call `recommend_palettes` for a small shortlist, then `build_theme` for the selected combination. Use `primaryColor` when the first original color should not be the dominant accent. Default to faithful (original colors plus neutrals); use adapted for identified tints/shades when requested or appropriate to the user's intended outcome. Honor a specified palette or mode.

When the user authorizes applying a theme, choose a reasonable match and proceed. Do not require a palette-selection confirmation unless a material ambiguity needs resolving. `preview_themes` returns offline HTML; save and open it if comparison would help.

Map the returned tokens into the project's existing roles. Replace colors by meaning, not by blind global hex replacement. Preserve layout, typography, content, logos, images and functional behavior unless requested. Preserve success/error/warning meanings. Variables alone do not recolor a page; update relevant component references too.

For plain CSS use `--wada-background`, `--wada-surface`, `--wada-text`, `--wada-muted-text`, `--wada-primary`, `--wada-on-primary`, `--wada-primary-hover`, `--wada-on-primary-hover`, `--wada-link`, `--wada-accent`, `--wada-on-accent`, `--wada-border`, `--wada-input-border` and `--wada-focus`. Underline links. Put focus outlines outside controls with an offset so the surrounding background is the checked surface. In faithful mode retain color on hover and add a non-color cue.

Tailwind v4 can use the returned `@theme inline` mappings after importing theme CSS. In Tailwind v3 extend `theme.colors` with these CSS variables; do not insert v4 syntax into a v3 project. Adapt component-library token formats, including HSL-only variables, rather than assuming hex can be substituted unchanged.

## Verify and refine

Run `check_theme` for actual foreground/background pairs. Open the changed page when browser tooling is available; inspect navigation, buttons, forms, cards, links, focus states and responsive layouts. Contrast checks cover opaque sRGB tokens only, not gradients, images, opacity, focus geometry or full accessibility. Report when visual verification is unavailable.

Save palette ID, mode, appearance, original preferences and token mapping in a project file such as `wada-theme.json` so later refinements retain context. For “warmer” or “less saturated,” update the previous preferences and rerank; keep the selected palette if the user asks to retain it. Identify generated shades through provenance.

## CLI fallback

From an installed checkout (set TOOL_ROOT to its absolute path), use:

```sh
node "$TOOL_ROOT/bin/wada-theme.js" recommend "cheerful and professional"
node "$TOOL_ROOT/bin/wada-theme.js" theme --palette 14 --format css --out theme.css
node "$TOOL_ROOT/bin/wada-theme.js" preview "calm and earthy" --out preview.html
node "$TOOL_ROOT/bin/wada-theme.js" check --file wada-theme.json
```

Structured preferences can be supplied through `--file preferences.json`. For exact CLI options run `--help`. An installed package also exposes `wada-theme` on PATH. Avoid unverified remote package execution; the project README describes installing this checkout.
