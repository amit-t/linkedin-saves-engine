import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import { loadEnvFile, rawSaveRecordsToMarkdown, loadApprovedIdeasFile } from '../src/cli/instagram-style.js';

describe('Instagram-style CLI helpers', () => {
  it('loads .env files without overriding existing process env values', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'linkedin-env-'));
    const envPath = join(dir, '.env');
    const originalToken = process.env.NOTION_TOKEN;
    const originalRawDatabaseId = process.env.NOTION_RAW_DATABASE_ID;
    await writeFile(envPath, 'NOTION_TOKEN=from-file\nNOTION_RAW_DATABASE_ID=raw123\n# ignored\n');
    try {
      process.env.NOTION_TOKEN = 'from-process';
      delete process.env.NOTION_RAW_DATABASE_ID;
      const loaded = await loadEnvFile(envPath);
      expect(loaded.NOTION_TOKEN).toBe('from-file');
      expect(process.env.NOTION_TOKEN).toBe('from-process');
      expect(process.env.NOTION_RAW_DATABASE_ID).toBe('raw123');
    } finally {
      if (originalToken === undefined) delete process.env.NOTION_TOKEN;
      else process.env.NOTION_TOKEN = originalToken;
      if (originalRawDatabaseId === undefined) delete process.env.NOTION_RAW_DATABASE_ID;
      else process.env.NOTION_RAW_DATABASE_ID = originalRawDatabaseId;
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('formats fetched raw saves as review markdown like the Instagram engine', () => {
    const markdown = rawSaveRecordsToMarkdown([{
      page_id: 'page-1',
      name: 'AI context maps',
      status: 'New',
      saved: '2026-06-06',
      url: 'https://www.linkedin.com/feed/update/urn:li:activity:1/',
      author: 'Amit Example',
      capture_completeness: 'partial',
      source_summary: 'A post about repo context for AI coding agents.',
      evidence_snippets: 'AI agents fail when context is hidden.'
    }]);
    expect(markdown).toContain('## 1. AI context maps');
    expect(markdown).toContain('source_page_id: `page-1`');
    expect(markdown).toContain('### Source Summary');
    expect(markdown).toContain('AI agents fail');
  });

  it('loads approved ideas from either list or object with ideas list', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'linkedin-ideas-'));
    const path = join(dir, 'approved.json');
    await writeFile(path, JSON.stringify({ ideas: [{ source_page_id: 'page-1', name: 'Idea', hook_options: ['Hook'], outline: { hook: 'Hook' } }] }));
    const ideas = await loadApprovedIdeasFile(path);
    expect(ideas).toHaveLength(1);
    expect(ideas[0].source_page_id).toBe('page-1');
    await rm(dir, { recursive: true, force: true });
  });
});
