# Contributing

Use Node.js 20 or later, install with `npm ci`, and run `npm test` before proposing a change. The test suite exercises all 348 combinations in four theme variants, explicit user exclusions, contrast failures, CLI behavior and both MCP protocol eras.

Keep original palette IDs, hex values, names and order stable. Record dataset source changes and retain upstream notices. Do not overwrite historical palette data with generated shades. Categories are our editorial layer; propose classification changes with visual examples and explanations, and keep the annotation method version current.

For theme changes, verify contrast on the rendered example, not just a swatch. For preference parsing changes, include both positive and negative user requests; an example exclusion must never become a default rule.

Runtime operation should remain local and require no AI API key. Host coding agents own framework-specific changes; the engine returns deterministic themes and explanations. `node bin/wada-theme.js gallery --out examples/gallery.html` regenerates the offline collection explorer.
