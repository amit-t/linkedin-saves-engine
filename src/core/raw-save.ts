import { z } from 'zod';

export const SourcePlatformSchema = z.enum(['linkedin']);
export const SourceAdapterSchema = z.enum(['linkedin-browser-saved-v1', 'linkedin-export-v1', 'linkedin-manual-v1']);
export const CaptureMethodSchema = z.enum(['network', 'dom', 'detail', 'export', 'manual', 'mixed']);
export const CaptureCompletenessSchema = z.enum(['full', 'partial', 'metadata_only', 'failed']);
export const VisibilityStateSchema = z.enum(['available', 'deleted', 'private', 'auth_required', 'blocked', 'unknown']);
export const StoragePolicySchema = z.enum(['metadata_only', 'summary_and_snippets', 'full_text_public_only', 'full_text_all_accessible']);
export const ProcessingPrioritySchema = z.enum(['high', 'normal', 'low', 'ignored']);
export const ContentTypeSchema = z.enum(['post', 'article', 'document', 'video', 'image', 'poll', 'comment', 'unknown']);

export const RawSaveSchema = z.object({
  sourcePlatform: SourcePlatformSchema,
  sourceAdapter: SourceAdapterSchema,
  sourceItemId: z.string().optional(),
  rootItemId: z.string().optional(),
  isRepost: z.boolean().optional(),
  dedupKey: z.string().min(1),
  canonicalUrl: z.string().url().optional(),
  originalUrl: z.string().min(1),
  captureMethod: CaptureMethodSchema,
  captureCompleteness: CaptureCompletenessSchema,
  visibilityState: VisibilityStateSchema,
  storagePolicy: StoragePolicySchema,
  processingPriority: ProcessingPrioritySchema,
  savedAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),
  firstIngestedAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  title: z.string().optional(),
  textSnapshot: z.string().optional(),
  excerpt: z.string().optional(),
  sourceSummary: z.string().optional(),
  evidenceSnippets: z.array(z.string()).default([]),
  authorName: z.string().optional(),
  authorHandle: z.string().optional(),
  authorUrl: z.string().url().optional(),
  contentType: ContentTypeSchema.default('unknown'),
  outboundUrls: z.array(z.string()).default([]),
  mediaUrls: z.array(z.string()).default([]),
  mediaTypes: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
  engagement: z.object({
    reactions: z.number().int().nonnegative().optional(),
    comments: z.number().int().nonnegative().optional(),
    reposts: z.number().int().nonnegative().optional(),
    capturedAt: z.string().datetime()
  }).optional(),
  topics: z.array(z.string()).optional(),
  entities: z.array(z.string()).optional(),
  destinationCandidates: z.array(z.string()).optional(),
  brandProfileCandidates: z.array(z.string()).optional(),
  brandFit: z.record(z.string(), z.number()).optional(),
  ideaPotentialScore: z.number().min(0).max(100).optional(),
  noveltyScore: z.number().min(0).max(100).optional(),
  actionabilityScore: z.number().min(0).max(100).optional(),
  contentHash: z.string().optional(),
  rawPayloadHash: z.string().optional(),
  localSnapshotPath: z.string().optional(),
  exportReconciledAt: z.string().datetime().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional()
});

export type RawSave = z.infer<typeof RawSaveSchema>;

export function nowIso(): string {
  return new Date().toISOString();
}

export function completenessRank(value: RawSave['captureCompleteness']): number {
  return { failed: 0, metadata_only: 1, partial: 2, full: 3 }[value];
}
