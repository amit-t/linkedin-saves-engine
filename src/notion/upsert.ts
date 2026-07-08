import { Client } from '@notionhq/client';
import type { RawSave } from '../core/raw-save.js';
import { buildContentIdeaProperties, buildRawIngestProperties } from './schema.js';
import type { ContentIdea } from '../ideas/generator.js';

export type UpsertSummary = { created: number; updated: number; skipped: number };

const dataSourceCache = new Map<string, string>();

async function resolveDataSourceId(notion: Client, databaseId: string): Promise<string> {
  const cached = dataSourceCache.get(databaseId);
  if (cached) return cached;
  const database = await (notion.databases.retrieve as any)({ database_id: databaseId });
  const dataSourceId = database?.data_sources?.[0]?.id;
  if (!dataSourceId) throw new Error(`No data source found for Notion database ${databaseId}`);
  dataSourceCache.set(databaseId, dataSourceId);
  return dataSourceId;
}

export function planRawSaveUpserts(records: RawSave[]): { inserts: RawSave[]; duplicates: string[] } {
  const seen = new Set<string>();
  const inserts: RawSave[] = [];
  const duplicates: string[] = [];
  for (const record of records) {
    if (seen.has(record.dedupKey)) {
      duplicates.push(record.dedupKey);
    } else {
      seen.add(record.dedupKey);
      inserts.push(record);
    }
  }
  return { inserts, duplicates };
}

export async function upsertRawSavesToNotion(options: { token: string; databaseId: string; records: RawSave[] }): Promise<UpsertSummary> {
  const notion = new Client({ auth: options.token });
  const dataSourceId = await resolveDataSourceId(notion, options.databaseId);
  const summary: UpsertSummary = { created: 0, updated: 0, skipped: 0 };
  for (const record of options.records) {
    const existing = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: 'Dedup Key', rich_text: { equals: record.dedupKey } },
      page_size: 1
    } as any);
    const properties = buildRawIngestProperties(record);
    if (existing.results[0]) {
      await notion.pages.update({ page_id: existing.results[0].id, properties } as any);
      summary.updated++;
    } else {
      await notion.pages.create({ parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties } as any);
      summary.created++;
    }
  }
  return summary;
}


export async function createContentIdeasInNotion(options: { token: string; databaseId: string; ideas: ContentIdea[] }): Promise<{ created: number }> {
  const notion = new Client({ auth: options.token });
  const dataSourceId = await resolveDataSourceId(notion, options.databaseId);
  let created = 0;
  for (const idea of options.ideas) {
    await notion.pages.create({ parent: { type: 'data_source_id', data_source_id: dataSourceId }, properties: buildContentIdeaProperties(idea) } as any);
    created++;
  }
  return { created };
}


function plainTextFromRichText(prop: any): string {
  return (prop?.rich_text ?? []).map((item: any) => item?.plain_text ?? item?.text?.content ?? '').join('');
}

function plainTextFromTitle(prop: any): string {
  return (prop?.title ?? []).map((item: any) => item?.plain_text ?? item?.text?.content ?? '').join('');
}

export type NotionRawSaveReviewRecord = {
  page_id: string;
  name: string;
  status: string;
  saved: string;
  url: string;
  author: string;
  capture_completeness: string;
  source_summary: string;
  evidence_snippets: string;
};

export async function fetchUnprocessedRawSaves(options: { token: string; databaseId: string; limit: number }): Promise<NotionRawSaveReviewRecord[]> {
  const notion = new Client({ auth: options.token });
  const dataSourceId = await resolveDataSourceId(notion, options.databaseId);
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    page_size: Math.min(options.limit, 100),
    filter: { property: 'Processing Status', status: { equals: 'New' } },
    sorts: [{ property: 'Saved At', direction: 'descending' }]
  } as any);
  return response.results.slice(0, options.limit).map((page: any) => {
    const props = page.properties ?? {};
    return {
      page_id: page.id,
      name: plainTextFromTitle(props.Name) || 'Untitled LinkedIn save',
      status: props['Processing Status']?.status?.name ?? 'New',
      saved: props['Saved At']?.date?.start ?? '',
      url: props['Canonical URL']?.url ?? props['Original URL']?.url ?? '',
      author: plainTextFromRichText(props['Author Name']) || '',
      capture_completeness: props['Capture Completeness']?.select?.name ?? '',
      source_summary: plainTextFromRichText(props['Source Summary']) || '',
      evidence_snippets: plainTextFromRichText(props['Evidence Snippets']) || ''
    };
  });
}

export async function markRawSaveStatus(options: { token: string; pageId: string; status: 'Reviewed' | 'Dropped' | 'Ignored' | 'Idea Created' }): Promise<void> {
  const notion = new Client({ auth: options.token });
  await notion.pages.update({
    page_id: options.pageId,
    properties: { 'Processing Status': { status: { name: options.status } } }
  } as any);
}
