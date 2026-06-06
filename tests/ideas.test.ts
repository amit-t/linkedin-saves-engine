import { describe, expect, it } from 'vitest';
import { generateIdeasForSave } from '../src/ideas/generator.js';
import { loadBrandProfileFromMarkdown } from '../src/brand/profile.js';
import { RawSaveSchema } from '../src/core/raw-save.js';

describe('idea generator', () => {
  it('generates brand-fit ideas with source evidence', async () => {
    const profile = await loadBrandProfileFromMarkdown('brand-voices/amit-tiwari-site.md');
    const rawSave = RawSaveSchema.parse({
      sourcePlatform: 'linkedin',
      sourceAdapter: 'linkedin-export-v1',
      dedupKey: 'linkedin:urn:li:activity:999',
      originalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:999/',
      canonicalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:999/',
      captureMethod: 'manual',
      captureCompleteness: 'partial',
      visibilityState: 'available',
      storagePolicy: 'summary_and_snippets',
      processingPriority: 'normal',
      firstIngestedAt: '2026-06-06T00:00:00.000Z',
      lastSeenAt: '2026-06-06T00:00:00.000Z',
      title: 'AI coding tools need better repo context',
      sourceSummary: 'A post arguing AI coding agents fail when repositories lack context maps and clear structure.',
      evidenceSnippets: ['AI agents fail when repos hide decisions in tribal memory.'],
      topics: ['AI', 'Engineering Workflow']
    });
    const ideas = generateIdeasForSave(rawSave, profile, { surfaceId: 'website_article', now: '2026-06-06T00:00:00.000Z' });
    expect(ideas.length).toBeGreaterThan(0);
    expect(ideas[0].brandProfileId).toBe('amit-tiwari-site');
    expect(ideas[0].sourceEvidence[0]).toContain('AI agents');
    expect(ideas[0].fitScore).toBeGreaterThanOrEqual(70);
  });
});
