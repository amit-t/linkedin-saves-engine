import { canonicalizeUrl, inferLinkedInItemId, tryCanonicalizeUrl } from '../../core/canonical-url.js';
import { computeDedupKey } from '../../core/dedupe.js';
import { RawSaveSchema, type RawSave } from '../../core/raw-save.js';

export type NetworkParseOptions = { now: string; sourceUrl: string };

type Candidate = { id?: string; url?: string; text?: string; author?: string; title?: string };

function walk(value: unknown, visit: (object: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) walk(item, visit);
  } else if (value && typeof value === 'object') {
    const object = value as Record<string, unknown>;
    visit(object);
    for (const child of Object.values(object)) walk(child, visit);
  }
}

function stringAt(object: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = object[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (value && typeof value === 'object') {
      const nested = value as Record<string, unknown>;
      if (typeof nested.text === 'string' && nested.text.trim()) return nested.text.trim();
      if (nested.text && typeof nested.text === 'object' && typeof (nested.text as Record<string, unknown>).text === 'string') {
        return ((nested.text as Record<string, unknown>).text as string).trim();
      }
    }
  }
  return undefined;
}

function collectCandidate(object: Record<string, unknown>): Candidate | undefined {
  const directId = stringAt(object, ['entityUrn', 'urn', 'activityUrn', 'shareUrn']);
  const url = stringAt(object, ['permalink', 'url', 'shareUrl', 'canonicalUrl']);
  const id = directId ?? (url ? inferLinkedInItemId(url) : undefined);
  if (!id && !url) return undefined;
  if (id && !/urn:li:(activity|share|article|ugcPost):/.test(id)) return undefined;
  const text = stringAt(object, ['commentary', 'text', 'description', 'summary', 'body']);
  const title = stringAt(object, ['title', 'headline']);
  const actor = object.actor && typeof object.actor === 'object' ? object.actor as Record<string, unknown> : undefined;
  const author = actor ? stringAt(actor, ['name', 'title']) : stringAt(object, ['authorName', 'name']);
  return { id, url, text, author, title };
}

export function extractRawSavesFromLinkedInPayload(payload: unknown, options: NetworkParseOptions): RawSave[] {
  const candidates: Candidate[] = [];
  walk(payload, (object) => {
    const candidate = collectCandidate(object);
    if (candidate) candidates.push(candidate);
  });

  const byKey = new Map<string, RawSave>();
  for (const candidate of candidates) {
    const originalUrl = candidate.url ?? `https://www.linkedin.com/feed/update/${candidate.id}/`;
    const canonicalUrl = tryCanonicalizeUrl(originalUrl) ?? options.sourceUrl;
    const sourceItemId = candidate.id ?? inferLinkedInItemId(canonicalUrl);
    const dedupKey = computeDedupKey({ sourcePlatform: 'linkedin', sourceItemId, canonicalUrl, originalUrl });
    if (byKey.has(dedupKey)) continue;
    const text = candidate.text ?? candidate.title;
    byKey.set(dedupKey, RawSaveSchema.parse({
      sourcePlatform: 'linkedin',
      sourceAdapter: 'linkedin-browser-saved-v1',
      sourceItemId,
      dedupKey,
      originalUrl,
      canonicalUrl: canonicalizeUrl(canonicalUrl),
      captureMethod: 'network',
      captureCompleteness: text ? 'partial' : 'metadata_only',
      visibilityState: 'available',
      storagePolicy: 'summary_and_snippets',
      processingPriority: 'normal',
      firstIngestedAt: options.now,
      lastSeenAt: options.now,
      title: candidate.title ?? (text ? text.slice(0, 160) : 'LinkedIn saved item'),
      textSnapshot: text,
      sourceSummary: text,
      authorName: candidate.author,
      evidenceSnippets: text ? [text.slice(0, 500)] : [],
      contentType: 'unknown',
      outboundUrls: [],
      mediaUrls: [],
      mediaTypes: [],
      hashtags: []
    }));
  }
  return Array.from(byKey.values());
}
