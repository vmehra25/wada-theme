import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const cli = fileURLToPath(new URL('../bin/wada-theme.js', import.meta.url));
test('CLI produces valid JSON, CSS, saved previews and useful errors', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wada-test-'));
  try {
    const run = (...args) => execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
    const result = JSON.parse(run('recommend', 'cheerful pink', '--limit', '2'));
    assert.equal(result.recommendations.length, 2); assert.deepEqual(result.preferences.avoid, []);
    const saved = join(dir, 'theme.json');
    run('theme', '--palette', '14', '--out', saved);
    assert.equal(JSON.parse(readFileSync(saved, 'utf8')).paletteId, 14);
    assert.equal(JSON.parse(run('check', '--file', saved)).passes, true);
    assert.match(run('theme', '--palette', '14', '--format', 'css'), /--wada-primary: #f27291/);
    const preview = join(dir, 'preview.html');
    run('preview', 'professional', '--out', preview);
    assert.match(readFileSync(preview, 'utf8'), /<!doctype html>/);
    assert.notEqual(spawnSync(process.execPath, [cli, 'theme', '--palette', '0']).status, 0);
    assert.notEqual(spawnSync(process.execPath, [cli, 'recommend', '--avoid', 'unknown']).status, 0);
    assert.notEqual(spawnSync(process.execPath, [cli, 'unknown']).status, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
