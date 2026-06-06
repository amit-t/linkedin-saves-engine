import { describe, expect, it } from 'vitest';
import { extractRawSavesFromLinkedInPayload } from '../src/adapters/linkedin/network-parser.js';

describe('LinkedIn network parser', () => {
  it('extracts RawSave records from nested LinkedIn-ish payloads', () => {
    const payload = {
      included: [{
        entityUrn: 'urn:li:activity:555',
        permalink: 'https://www.linkedin.com/feed/update/urn:li:activity:555/?trk=feed',
        commentary: { text: { text: 'AI code agents need context maps, not magic prompts.' } },
        actor: { name: { text: 'Amit Example' } }
      }]
    };
    const records = extractRawSavesFromLinkedInPayload(payload, { now: '2026-06-06T00:00:00.000Z', sourceUrl: 'https://www.linkedin.com/my-items/saved-posts/' });
    expect(records).toHaveLength(1);
    expect(records[0].dedupKey).toBe('linkedin:urn:li:activity:555');
    expect(records[0].captureMethod).toBe('network');
    expect(records[0].textSnapshot).toContain('context maps');
  });
});
