import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseLinkedInSavedItemsFile } from '../adapters/linkedin/export-importer.js';
import { loadBrandProfileFromMarkdown } from '../brand/profile.js';
import type { RawSave } from '../core/raw-save.js';
import { generateIdeasForSave, type ContentIdea } from '../ideas/generator.js';

export type DemoResult = { rawSaves: RawSave[]; ideas: ContentIdea[]; outPath: string };
export type DemoOptions = { outPath: string; now?: string };

export async function runDemo(options: DemoOptions): Promise<DemoResult> {
  const now = options.now ?? new Date().toISOString();
  const rawSaves = await parseLinkedInSavedItemsFile('fixtures/linkedin-export/saved-items.csv', { now });
  const enriched = rawSaves.map((save, index) => ({
    ...save,
    title: index === 0 ? 'AI coding agents need better repository context' : 'Production reliability depends on boring guardrails',
    sourceSummary: index === 0
      ? 'A saved LinkedIn post about AI coding agents failing when repository context, decisions, and constraints are invisible.'
      : 'A saved LinkedIn post arguing production incidents usually come from missing timeouts, retries, and ownership.',
    evidenceSnippets: index === 0
      ? ['AI agents fail when repos hide decisions in tribal memory.']
      : ['Most production failures begin with boring missing guardrails.'],
    topics: index === 0 ? ['AI', 'Engineering Workflow', 'Codebase Quality'] : ['Production Readiness', 'Reliability', 'Engineering Judgment'],
    captureCompleteness: 'partial' as const
  }));
  const profile = await loadBrandProfileFromMarkdown('brand-voices/amit-tiwari-site.md');
  const ideas = enriched.flatMap((save) => generateIdeasForSave(save, profile, { surfaceId: 'website_article', now }));
  await mkdir(dirname(options.outPath), { recursive: true });
  await writeFile(options.outPath, JSON.stringify({ generatedAt: now, rawSaves: enriched, ideas }, null, 2));
  return { rawSaves: enriched, ideas, outPath: options.outPath };
}
