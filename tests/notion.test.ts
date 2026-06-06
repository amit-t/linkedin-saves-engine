import { describe, expect, it } from 'vitest';
import { buildRawIngestProperties, rawIngestSchemaSpec } from '../src/notion/schema.js';
import { RawSaveSchema } from '../src/core/raw-save.js';

describe('Notion schema mapping', () => {
  it('defines Raw Ingest and maps a RawSave to Notion properties', () => {
    expect(rawIngestSchemaSpec.properties['Dedup Key'].type).toBe('rich_text');
    const rawSave = RawSaveSchema.parse({
      sourcePlatform: 'linkedin',
      sourceAdapter: 'linkedin-export-v1',
      dedupKey: 'linkedin:urn:li:activity:123',
      originalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:123/',
      canonicalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:123/',
      captureMethod: 'export',
      captureCompleteness: 'metadata_only',
      visibilityState: 'available',
      storagePolicy: 'summary_and_snippets',
      processingPriority: 'normal',
      firstIngestedAt: '2026-06-06T00:00:00.000Z',
      lastSeenAt: '2026-06-06T00:00:00.000Z',
      title: 'Saved LinkedIn item',
      evidenceSnippets: []
    });
    const props = buildRawIngestProperties(rawSave);
    expect(props['Dedup Key'].rich_text[0].text.content).toBe('linkedin:urn:li:activity:123');
    expect(props['Source Platform'].select.name).toBe('LinkedIn');
  });
});
