import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { runDemo } from '../src/demo/run-demo.js';

describe('demo workflow', () => {
  it('imports fixture saves and generates brand-fit ideas', async () => {
    const result = await runDemo({ outPath: '.demo/test-demo-output.json', now: '2026-06-06T00:00:00.000Z' });
    expect(result.rawSaves.length).toBeGreaterThanOrEqual(2);
    expect(result.ideas.length).toBeGreaterThanOrEqual(1);
    expect(result.ideas[0].brandProfileId).toBe('amit-tiwari-site');
    const saved = JSON.parse(await readFile('.demo/test-demo-output.json', 'utf8'));
    expect(saved.ideas.length).toBe(result.ideas.length);
  });
});
