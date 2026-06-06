import { describe, expect, it } from 'vitest';
import { parseLinkedInSavedItemsCsv } from '../src/adapters/linkedin/export-importer.js';

describe('LinkedIn export importer', () => {
  it('parses saved item exports into metadata-only RawSave records', () => {
    const csv = 'Saved Date,Item URL\n2026-01-02,https://www.linkedin.com/feed/update/urn:li:activity:123/?trk=saved\n';
    const records = parseLinkedInSavedItemsCsv(csv, { now: '2026-06-06T00:00:00.000Z' });
    expect(records).toHaveLength(1);
    expect(records[0].sourceAdapter).toBe('linkedin-export-v1');
    expect(records[0].captureCompleteness).toBe('metadata_only');
    expect(records[0].savedAt).toBe('2026-01-02T00:00:00.000Z');
    expect(records[0].dedupKey).toBe('linkedin:urn:li:activity:123');
  });
});
