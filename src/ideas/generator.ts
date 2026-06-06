import type { RawSave } from '../core/raw-save.js';
import type { BrandProfile } from '../brand/profile.js';

export type ContentIdea = {
  name: string;
  rawSaveDedupKey: string;
  brandProfileId: string;
  brandName: string;
  brandVoiceVersion: string;
  surfaceId: string;
  format: string;
  audience: string;
  hook: string;
  thesis: string;
  outline: string[];
  sourceEvidence: string[];
  noveltyScore: number;
  fitScore: number;
  confidence: number;
  status: 'Generated' | 'Needs Review';
  createdAt: string;
};

export type GenerateIdeaOptions = { surfaceId: string; now?: string };

function titleFrom(rawSave: RawSave): string {
  return rawSave.title ?? rawSave.sourceSummary ?? rawSave.excerpt ?? 'Saved LinkedIn idea';
}

function scoreFit(rawSave: RawSave, profile: BrandProfile): number {
  const haystack = [rawSave.title, rawSave.sourceSummary, rawSave.textSnapshot, ...(rawSave.topics ?? [])].join(' ').toLowerCase();
  const profileTerms = [...profile.preferTopics, ...profile.corePointOfView].join(' ').toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4);
  const hits = new Set(profileTerms.filter((term) => haystack.includes(term)));
  return Math.min(95, 70 + hits.size * 5);
}

export function generateIdeasForSave(rawSave: RawSave, profile: BrandProfile, options: GenerateIdeaOptions): ContentIdea[] {
  if (rawSave.processingPriority === 'ignored' || rawSave.captureCompleteness === 'failed') return [];
  const createdAt = options.now ?? new Date().toISOString();
  const sourceTitle = titleFrom(rawSave);
  const evidence = rawSave.evidenceSnippets.length > 0
    ? rawSave.evidenceSnippets
    : [rawSave.sourceSummary ?? rawSave.excerpt ?? sourceTitle];
  const fitScore = scoreFit(rawSave, profile);
  if (fitScore < 60) return [];
  const surface = profile.surfaces.find((item) => item.id === options.surfaceId) ?? profile.surfaces[0];
  const thesis = `Use this saved LinkedIn item to explain a practical engineering judgment pattern: ${sourceTitle}.`;
  return [{
    name: `Field guide: ${sourceTitle}`,
    rawSaveDedupKey: rawSave.dedupKey,
    brandProfileId: profile.id,
    brandName: profile.name,
    brandVoiceVersion: profile.version,
    surfaceId: surface.id,
    format: surface.label,
    audience: profile.audience[0] ?? 'Technical readers',
    hook: `Most teams treat “${sourceTitle}” as a content topic. Treat it as a decision-making lens instead.`,
    thesis,
    outline: [
      'Name the concrete engineering situation from the saved item.',
      'Explain the common but incomplete interpretation.',
      'Introduce the sharper judgment/framework this brand would use.',
      'Turn the lesson into steps, checks, or questions the reader can apply.',
      'Close with one practical next action or review question.'
    ],
    sourceEvidence: evidence.slice(0, 3),
    noveltyScore: Math.min(90, rawSave.noveltyScore ?? 75),
    fitScore,
    confidence: Math.min(90, rawSave.captureCompleteness === 'full' ? 86 : 74),
    status: 'Generated',
    createdAt
  }];
}
