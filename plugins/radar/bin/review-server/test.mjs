// plugins/radar/bin/review-server/test.mjs
// Stdlib-only integration test for the review server.
// Boots the server against a temp catalogue and exercises PATCH / GET.

import { spawn } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER = join(__dirname, 'server.mjs');

function makeCatalogue() {
  return {
    version: '1.0',
    updatedAt: null,
    items: [
      {
        id: 'test-item-1',
        title: 'Test item',
        url: 'https://example.test/1',
        description: 'seed',
        category: 'tooling',
        tags: ['t1'],
        source: 'manual',
        discoveredAt: '2026-04-01T00:00:00.000Z',
        status: 'new',
        notes: [],
        score: null,
        scoreBreakdown: null,
        reviewedAt: null,
        lastRecommended: null,
      },
    ],
    insights: [],
  };
}

async function waitForUrl(proc) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server boot timeout')), 5000);
    proc.stdout.on('data', (chunk) => {
      const s = chunk.toString();
      const m = s.match(/RADAR_REVIEW_URL (http:\/\/\S+)/);
      if (m) { clearTimeout(t); resolve(m[1]); }
    });
  });
}

async function patch(url, id, body) {
  const res = await fetch(`${url}/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function run() {
  const dir = mkdtempSync(join(tmpdir(), 'radar-review-test-'));
  const catPath = join(dir, 'catalogue.json');
  writeFileSync(catPath, JSON.stringify(makeCatalogue()));

  const env = { ...process.env, RADAR_CATALOGUE: catPath, RADAR_PORT: '0' };
  const proc = spawn('node', [SERVER], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    const url = await waitForUrl(proc);

    // TEST 1: legacy string-note path still works
    const r1 = await patch(url, 'test-item-1', {
      status: 'dismissed',
      note: '[not-relevant] legacy string note',
    });
    assert.equal(r1.status, 200, 'PATCH returns 200');
    const cat1 = JSON.parse(readFileSync(catPath, 'utf8'));
    const item1 = cat1.items.find((i) => i.id === 'test-item-1');
    assert.equal(item1.status, 'dismissed');
    assert.equal(item1.notes.length, 1);
    assert.equal(typeof item1.notes[0].text, 'string');
    console.log('OK: legacy string note accepted and stored');

    console.log('PASS');
  } finally {
    proc.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}

run().catch((e) => {
  console.error('FAIL:', e);
  process.exit(1);
});
