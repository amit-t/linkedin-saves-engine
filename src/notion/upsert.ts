import { Client } from '@notionhq/client';
import type { RawSave } from '../core/raw-save.js';
import { buildRawIngestProperties } from './schema.js';

export type UpsertSummary = { created: number; updated: number; skipped: number };

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
  const summary: UpsertSummary = { created: 0, updated: 0, skipped: 0 };
  for (const record of options.records) {
    const existing = await (notion.databases as any).query({
      database_id: options.databaseId,
      filter: { property: 'Dedup Key', rich_text: { equals: record.dedupKey } },
      page_size: 1
    } as any);
    const properties = buildRawIngestProperties(record);
    if (existing.results[0]) {
      await notion.pages.update({ page_id: existing.results[0].id, properties } as any);
      summary.updated++;
    } else {
      await notion.pages.create({ parent: { database_id: options.databaseId }, properties } as any);
      summary.created++;
    }
  }
  return summary;
}
