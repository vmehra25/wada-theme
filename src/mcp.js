import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';
import { categories, getPalette } from './catalog.js';
import { recommendPalettes, buildTheme, checkTheme, exportCss, exportTailwind } from './engine.js';
import { preferencesSchema, themeOptionsSchema, checkSchema } from './schema.js';
import { renderPreview } from './preview.js';

export function createServer() {
  const server = new McpServer({ name: 'wada-theme', version: '0.1.0' }, {
    instructions: 'Choose Sanzo Wada themes from user intent. Exclude colors only when explicitly requested. Mood scores are heuristics. Use returned tokens and provenance, inspect the existing page, and let the host agent edit and verify it. No filesystem access or external API is performed by these tools.',
  });
  const register = (name, description, schema, handler) => server.registerTool(name, {
    description, inputSchema: schema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async input => {
    try {
      const output = handler(input);
      return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: error.message }] };
    }
  });
  register('list_categories', 'List the supported moods and aliases. Labels are editorial interpretations, not original Wada categories.', z.object({}).strict(), () => ({ categories }));
  register('recommend_palettes', 'Rank original Wada combinations against intent and structured preferences. avoid defaults to empty; use prefer for desired colors. Structured fields override basic English keyword parsing.', preferencesSchema, recommendPalettes);
  register('get_palette', 'Retrieve an original combination, color names, metrics, mood scores and source.', z.object({ paletteId: z.number().int().min(1).max(348) }).strict(), ({ paletteId }) => getPalette(paletteId));
  register('build_theme', 'Build a checked theme with CSS variables, Tailwind v4 mappings and provenance. faithful uses original colors plus supporting neutrals; adapted adds identified tints/shades.', themeOptionsSchema, input => {
    const theme = buildTheme(input);
    return { theme, css: exportCss(theme), tailwind: exportTailwind(theme) };
  });
  register('check_theme', 'Measure contrast for specified opaque sRGB token pairs. This is not a full rendered-page accessibility audit.', checkSchema, checkTheme);
  register('preview_themes', 'Return standalone offline HTML comparing recommended themes. The host can save this HTML to a local file and open it.', preferencesSchema, input => {
    const result = recommendPalettes(input);
    return { paletteIds: result.recommendations.map(r => r.palette.id), html: renderPreview(result) };
  });
  return server;
}

export function startServer() {
  return serveStdio(createServer, { onerror: error => process.stderr.write(`wada-theme: ${error.message}\n`) });
}
