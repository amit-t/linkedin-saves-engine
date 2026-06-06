import { describe, expect, it } from 'vitest';
import { canonicalizeUrl } from '../src/core/canonical-url.js';
import { computeDedupKey, mergeRawSave } from '../src/core/dedupe.js';
import { redactSecrets } from '../src/core/redaction.js';
import { RawSaveSchema } from '../src/core/raw-save.js';

describe('core primitives', () => {
  it('canonicalizes LinkedIn URLs while preserving activity identity', () => {
    const url = canonicalizeUrl('https://www.linkedin.com/feed/update/urn:li:activity:123/?trk=public_post&utm_source=x');
    expect(url).toBe('https://www.linkedin.com/feed/update/urn:li:activity:123/');
  });

  it('prefers source item IDs for dedupe keys', () => {
    expect(computeDedupKey({ sourcePlatform: 'linkedin', sourceItemId: 'urn:li:activity:123', originalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:123/' })).toBe('linkedin:urn:li:activity:123');
  });

  it('redacts cookies, bearer tokens, csrf, and set-cookie values', () => {
    const redacted = redactSecrets('cookie=li_at=abc; Authorization: Bearer secret; csrf-token: ajax:123; set-cookie: nope');
    expect(redacted).not.toContain('abc');
    expect(redacted).not.toContain('secret');
    expect(redacted).not.toContain('ajax:123');
    expect(redacted).toContain('[REDACTED');
  });

  it('does not let export-only records overwrite richer browser captures', () => {
    const browser = RawSaveSchema.parse({
      sourcePlatform: 'linkedin',
      sourceAdapter: 'linkedin-browser-saved-v1',
      dedupKey: 'linkedin:urn:li:activity:123',
      originalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:123/',
      canonicalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:123/',
      captureMethod: 'network',
      captureCompleteness: 'partial',
      visibilityState: 'available',
      storagePolicy: 'summary_and_snippets',
      processingPriority: 'normal',
      firstIngestedAt: '2026-06-06T00:00:00.000Z',
      lastSeenAt: '2026-06-06T00:00:00.000Z',
      title: 'Original title',
      textSnapshot: 'Useful source text',
      evidenceSnippets: ['Useful source text']
    });
    const exported = RawSaveSchema.parse({
      ...browser,
      sourceAdapter: 'linkedin-export-v1',
      captureMethod: 'export',
      captureCompleteness: 'metadata_only',
      title: 'Export title',
      textSnapshot: undefined,
      evidenceSnippets: [],
      savedAt: '2026-01-01T00:00:00.000Z'
    });
    const merged = mergeRawSave(browser, exported);
    expect(merged.title).toBe('Original title');
    expect(merged.textSnapshot).toBe('Useful source text');
    expect(merged.savedAt).toBe('2026-01-01T00:00:00.000Z');
  });
});
