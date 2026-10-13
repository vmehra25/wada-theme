import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { fileURLToPath } from 'node:url';

for (const mode of ['legacy', 'modern']) test(`MCP ${mode}: initialize, discover, execute every tool and reject invalid input`, { timeout: 20000 }, async () => {
  const transport = new StdioClientTransport({ command: process.execPath,
    args: [fileURLToPath(new URL('../bin/wada-theme.js', import.meta.url)), 'mcp'], stderr: 'pipe' });
  const client = new Client({ name: 'wada-test', version: '1.0.0' }, {
    versionNegotiation: { mode: mode === 'legacy' ? 'legacy' : { pin: '2026-07-28' } },
  });
  try {
    await client.connect(transport);
    const listing = await client.listTools();
    assert.equal(listing.tools.length, 6);
    for (const t of listing.tools) assert.equal(t.annotations.readOnlyHint, true);
    const call = async (name, args) => {
      const r = await client.callTool({ name, arguments: args });
      assert.ok(!r.isError, JSON.stringify(r));
      return r.structuredContent ?? JSON.parse(r.content[0].text);
    };
    assert.equal((await call('list_categories', {})).categories.length, 8);
    assert.equal((await call('get_palette', { paletteId: 14 })).colors[0].name, 'Spinel Red');
    const ranked = await call('recommend_palettes', { intent: 'cheerful pink', limit: 2 });
    assert.equal(ranked.recommendations.length, 2); assert.deepEqual(ranked.preferences.avoid, []);
    const output = await call('build_theme', { paletteId: 14, appearance: 'dark' });
    assert.ok(output.theme.validation.passes); assert.match(output.css, /--wada-primary/);
    assert.ok((await call('check_theme', { tokens: output.theme.tokens })).passes);
    assert.match((await call('preview_themes', { intent: 'calm', limit: 1 })).html, /<!doctype html>/);
    const invalidId = await client.callTool({ name: 'get_palette', arguments: { paletteId: 349 } });
    assert.equal(invalidId.isError, true);
    const invalid = await client.callTool({ name: 'recommend_palettes', arguments: { avoid: ['imaginary'] } });
    assert.equal(invalid.isError, true);
  } finally { await client.close(); }
});
