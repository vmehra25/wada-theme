#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { categories, getPalette, recommendPalettes, buildTheme, checkTheme, exportCss, exportTailwind, renderPreview, renderGallery } from '../src/index.js';

const help = `wada-theme — Sanzo Wada colors for websites

  recommend "cheerful and professional" [--prefer pink] [--avoid "bright pink"]
  theme --palette 14 [--appearance dark] [--mode adapted] [--format css|json|tailwind]
  preview "calm and earthy" --out preview.html
  gallery --out gallery.html
  palette --palette 14
  categories
  check --file theme.json
  mcp

Options:
  --moods cheerful,professional   Explicit moods override keyword interpretation
  --intensity subtle|moderate|vivid
  --warmth warm|cool|balanced
  --appearance light|dark        Default light
  --mode faithful|adapted        Default faithful (original colors + neutrals)
  --prefer pink,blue             Preferences, not hard requirements
  --avoid pink,#f27291           Explicit exclusions; default empty
  --limit 3                     Recommendations, 1–20
  --primary '#f27291'            Original palette color to use as primary
  --file preferences.json       Structured preferences for recommend/preview
  --out path                    Write output; otherwise print it

No API key, hosted service or automatic edits to website files.\n`;

try {
  const { values, positionals } = parseArgs({ allowPositionals: true, options: Object.fromEntries([
    'moods', 'intensity', 'warmth', 'appearance', 'mode', 'prefer', 'avoid', 'limit', 'palette', 'primary', 'format', 'file', 'out',
  ].map(name => [name, { type: 'string' }]).concat([['help', { type: 'boolean', short: 'h' }]])) });
  const [command, ...words] = positionals;
  if (values.help || !command) { process.stdout.write(help); process.exit(0); }
  if (command === 'mcp') {
    if (words.length || Object.keys(values).length) throw new Error('mcp does not accept additional arguments.');
    const { startServer } = await import('../src/mcp.js');
    startServer();
  } else {
    const jsonFile = () => JSON.parse(readFileSync(values.file, 'utf8'));
    const preferences = () => {
      const p = values.file ? jsonFile() : { intent: words.join(' ') };
      for (const key of ['intensity', 'warmth', 'appearance', 'mode']) if (values[key] !== undefined) p[key] = values[key];
      for (const key of ['moods', 'prefer', 'avoid']) if (values[key] !== undefined) p[key] = values[key].split(',').map(s => s.trim()).filter(Boolean);
      if (values.limit !== undefined) p.limit = Number(values.limit);
      return p;
    };
    let output;
    switch (command) {
      case 'categories': output = categories; break;
      case 'palette': output = getPalette(Number(values.palette)); break;
      case 'recommend': output = recommendPalettes(preferences()); break;
      case 'theme': {
        const theme = buildTheme({ paletteId: Number(values.palette),
          ...(values.appearance ? { appearance: values.appearance } : {}),
          ...(values.mode ? { mode: values.mode } : {}),
          ...(values.primary ? { primaryColor: values.primary } : {}) });
        const format = values.format ?? 'json';
        if (!['json', 'css', 'tailwind'].includes(format)) throw new Error('format must be json, css or tailwind.');
        output = format === 'css' ? exportCss(theme) : format === 'tailwind' ? exportTailwind(theme) : theme;
        break;
      }
      case 'preview': output = renderPreview(recommendPalettes(preferences())); break;
      case 'gallery': output = renderGallery(); break;
      case 'check': {
        if (!values.file) throw new Error('check requires --file theme.json (theme object or { tokens, pairs }).');
        const input = jsonFile();
        output = checkTheme({ tokens: input.tokens, ...(input.pairs ? { pairs: input.pairs } : {}) });
        if (!output.passes) process.exitCode = 1;
        break;
      }
      default: throw new Error(`Unknown command: ${command}. Run wada-theme --help.`);
    }
    const content = typeof output === 'string' ? output : JSON.stringify(output, null, 2) + '\n';
    if (values.out) {
      mkdirSync(dirname(values.out), { recursive: true });
      writeFileSync(values.out, content);
      process.stderr.write(`Saved ${values.out}\n`);
    } else process.stdout.write(content);
  }
} catch (error) {
  process.stderr.write(`wada-theme: ${error.message}\n`);
  process.exitCode = 1;
}
