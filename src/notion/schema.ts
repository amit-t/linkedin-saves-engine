import type { RawSave } from '../core/raw-save.js';
import type { ContentIdea } from '../ideas/generator.js';

export type NotionPropertySpec = { type: string; options?: string[] };
export type NotionDatabaseSpec = { title: string; properties: Record<string, NotionPropertySpec> };

export const rawIngestSchemaSpec: NotionDatabaseSpec = {
  title: 'LinkedIn Saves Raw Ingest',
  properties: {
    Name: { type: 'title' },
    'Source Platform': { type: 'select', options: ['LinkedIn'] },
    'Source Adapter': { type: 'rich_text' },
    'Source Item ID': { type: 'rich_text' },
    'Root Item ID': { type: 'rich_text' },
    'Is Repost': { type: 'checkbox' },
    'Dedup Key': { type: 'rich_text' },
    'Canonical URL': { type: 'url' },
    'Original URL': { type: 'url' },
    'Capture Method': { type: 'select', options: ['network', 'dom', 'detail', 'export', 'manual', 'mixed'] },
    'Capture Completeness': { type: 'select', options: ['full', 'partial', 'metadata_only', 'failed'] },
    'Visibility State': { type: 'select', options: ['available', 'deleted', 'private', 'auth_required', 'blocked', 'unknown'] },
    'Storage Policy': { type: 'select', options: ['metadata_only', 'summary_and_snippets', 'full_text_public_only', 'full_text_all_accessible'] },
    'Processing Priority': { type: 'select', options: ['high', 'normal', 'low', 'ignored'] },
    'Content Type': { type: 'select', options: ['post', 'article', 'document', 'video', 'image', 'poll', 'comment', 'unknown'] },
    'First Ingested At': { type: 'date' },
    'Last Seen At': { type: 'date' },
    'Saved At': { type: 'date' },
    'Processing Status': { type: 'status', options: ['New', 'Needs Enrichment', 'Enriched', 'Classified', 'Idea Created', 'Error', 'Ignored'] },
    'Brand Profile Candidates': { type: 'rich_text' },
    'Top Brand Fit Score': { type: 'number' },
    'Brand Fit Scores': { type: 'rich_text' },
    'Idea Potential Score': { type: 'number' },
    'Adapter Run ID': { type: 'rich_text' },
    'Error Code': { type: 'rich_text' }
  }
};

export const contentIdeasSchemaSpec: NotionDatabaseSpec = {
  title: 'LinkedIn Saves Content Ideas',
  properties: {
    Name: { type: 'title' },
    'Brand Profile ID': { type: 'rich_text' },
    'Brand Name': { type: 'rich_text' },
    'Surface ID': { type: 'select' },
    'Brand Voice Version': { type: 'rich_text' },
    Format: { type: 'select' },
    Hook: { type: 'rich_text' },
    Thesis: { type: 'rich_text' },
    'Source Evidence': { type: 'rich_text' },
    'Fit Score': { type: 'number' },
    Confidence: { type: 'number' },
    Status: { type: 'status' }
  }
};

type NotionText = { text: { content: string } };
function text(content = ''): NotionText[] { return content ? [{ text: { content: content.slice(0, 1900) } }] : []; }
function title(content = ''): NotionText[] { return [{ text: { content: (content || 'Untitled').slice(0, 1900) } }]; }
function date(start?: string) { return start ? { start } : null; }

export function buildRawIngestProperties(rawSave: RawSave): Record<string, any> {
  return {
    Name: { title: title(rawSave.title ?? rawSave.sourceSummary ?? rawSave.dedupKey) },
    'Source Platform': { select: { name: 'LinkedIn' } },
    'Source Adapter': { rich_text: text(rawSave.sourceAdapter) },
    'Source Item ID': { rich_text: text(rawSave.sourceItemId) },
    'Root Item ID': { rich_text: text(rawSave.rootItemId) },
    'Is Repost': { checkbox: rawSave.isRepost ?? false },
    'Dedup Key': { rich_text: text(rawSave.dedupKey) },
    'Canonical URL': { url: rawSave.canonicalUrl ?? null },
    'Original URL': { url: rawSave.originalUrl.startsWith('http') ? rawSave.originalUrl : null },
    'Capture Method': { select: { name: rawSave.captureMethod } },
    'Capture Completeness': { select: { name: rawSave.captureCompleteness } },
    'Visibility State': { select: { name: rawSave.visibilityState } },
    'Storage Policy': { select: { name: rawSave.storagePolicy } },
    'Processing Priority': { select: { name: rawSave.processingPriority } },
    'Content Type': { select: { name: rawSave.contentType ?? 'unknown' } },
    'First Ingested At': { date: date(rawSave.firstIngestedAt) },
    'Last Seen At': { date: date(rawSave.lastSeenAt) },
    'Saved At': { date: date(rawSave.savedAt) },
    'Processing Status': { status: { name: rawSave.errorCode ? 'Error' : 'New' } },
    'Brand Profile Candidates': { rich_text: text(rawSave.brandProfileCandidates?.join(', ')) },
    'Top Brand Fit Score': { number: rawSave.brandFit ? Math.max(...Object.values(rawSave.brandFit)) : null },
    'Brand Fit Scores': { rich_text: text(rawSave.brandFit ? JSON.stringify(rawSave.brandFit) : '') },
    'Idea Potential Score': { number: rawSave.ideaPotentialScore ?? null },
    'Error Code': { rich_text: text(rawSave.errorCode) }
  };
}


export function buildContentIdeaProperties(idea: ContentIdea): Record<string, any> {
  return {
    Name: { title: title(idea.name) },
    'Brand Profile ID': { rich_text: text(idea.brandProfileId) },
    'Brand Name': { rich_text: text(idea.brandName) },
    'Surface ID': { select: { name: idea.surfaceId } },
    'Brand Voice Version': { rich_text: text(idea.brandVoiceVersion) },
    Format: { select: { name: idea.format } },
    Hook: { rich_text: text(idea.hook) },
    Thesis: { rich_text: text(idea.thesis) },
    'Source Evidence': { rich_text: text(idea.sourceEvidence.join('\n')) },
    'Fit Score': { number: idea.fitScore },
    Confidence: { number: idea.confidence },
    Status: { status: { name: idea.status } }
  };
}

export function schemaInstructions(): string {
  return [
    '# Notion database setup',
    '',
    `Raw Ingest: ${rawIngestSchemaSpec.title}`,
    ...Object.entries(rawIngestSchemaSpec.properties).map(([name, spec]) => `- ${name}: ${spec.type}${spec.options ? ` (${spec.options.join(', ')})` : ''}`),
    '',
    `Content Ideas: ${contentIdeasSchemaSpec.title}`,
    ...Object.entries(contentIdeasSchemaSpec.properties).map(([name, spec]) => `- ${name}: ${spec.type}${spec.options ? ` (${spec.options.join(', ')})` : ''}`)
  ].join('\n');
}
