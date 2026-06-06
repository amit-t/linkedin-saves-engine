import { createHash } from 'node:crypto';
import type { RawSave } from './raw-save.js';
import { completenessRank } from './raw-save.js';
import { inferLinkedInItemId, tryCanonicalizeUrl } from './canonical-url.js';

type DedupeInput = {
  sourcePlatform: RawSave['sourcePlatform'];
  sourceItemId?: string;
  canonicalUrl?: string;
  originalUrl: string;
};

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function computeDedupKey(input: DedupeInput): string {
  if (input.sourceItemId) return `${input.sourcePlatform}:${input.sourceItemId}`;
  const url = input.canonicalUrl ?? tryCanonicalizeUrl(input.originalUrl);
  const inferred = inferLinkedInItemId(url ?? input.originalUrl);
  if (inferred) return `${input.sourcePlatform}:${inferred}`;
  if (url) return `${input.sourcePlatform}:url:${sha256(url)}`;
  return `${input.sourcePlatform}:export:${sha256(input.originalUrl)}`;
}

export function mergeRawSave(existing: RawSave, incoming: RawSave): RawSave {
  const existingRank = completenessRank(existing.captureCompleteness);
  const incomingRank = completenessRank(incoming.captureCompleteness);
  const richer = incomingRank > existingRank ? incoming : existing;
  const poorer = richer === existing ? incoming : existing;

  return {
    ...poorer,
    ...richer,
    savedAt: existing.savedAt ?? incoming.savedAt,
    publishedAt: richer.publishedAt ?? poorer.publishedAt,
    firstIngestedAt: existing.firstIngestedAt < incoming.firstIngestedAt ? existing.firstIngestedAt : incoming.firstIngestedAt,
    lastSeenAt: existing.lastSeenAt > incoming.lastSeenAt ? existing.lastSeenAt : incoming.lastSeenAt,
    exportReconciledAt: incoming.sourceAdapter === 'linkedin-export-v1' ? incoming.lastSeenAt : existing.exportReconciledAt ?? incoming.exportReconciledAt,
    evidenceSnippets: Array.from(new Set([...(existing.evidenceSnippets ?? []), ...(incoming.evidenceSnippets ?? [])])).slice(0, 12),
    outboundUrls: Array.from(new Set([...(existing.outboundUrls ?? []), ...(incoming.outboundUrls ?? [])])),
    mediaUrls: Array.from(new Set([...(existing.mediaUrls ?? []), ...(incoming.mediaUrls ?? [])])),
    mediaTypes: Array.from(new Set([...(existing.mediaTypes ?? []), ...(incoming.mediaTypes ?? [])])),
    hashtags: Array.from(new Set([...(existing.hashtags ?? []), ...(incoming.hashtags ?? [])]))
  };
}
