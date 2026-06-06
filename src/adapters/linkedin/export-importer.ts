import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { canonicalizeUrl, inferLinkedInItemId, tryCanonicalizeUrl } from '../../core/canonical-url.js';
import { computeDedupKey } from '../../core/dedupe.js';
import { RawSaveSchema, type RawSave } from '../../core/raw-save.js';

export type ParseExportOptions = { now?: string };

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i];
    const next = csv[i + 1];
    if (quoted && ch === '"' && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      quoted = !quoted;
    } else if (ch === ',' && !quoted) {
      row.push(current.trim());
      current = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && next === '\n') i++;
      row.push(current.trim());
      current = '';
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
    } else {
      current += ch;
    }
  }
  if (current.length > 0 || row.length > 0) {
    row.push(current.trim());
    if (row.some((cell) => cell.length > 0)) rows.push(row);
  }
  return rows;
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed.length <= 10 ? `${trimmed}T00:00:00.000Z` : trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function parseLinkedInSavedItemsCsv(csv: string, options: ParseExportOptions = {}): RawSave[] {
  const rows = parseCsvRows(csv);
  if (rows.length === 0) return [];
  const headers = rows[0].map(normalizeHeader);
  const dateIdx = headers.findIndex((h) => ['saveddate', 'date', 'time', 'savedat'].includes(h));
  const urlIdx = headers.findIndex((h) => ['itemurl', 'url', 'link', 'savedurl'].includes(h));
  if (urlIdx === -1) {
    throw new Error('LinkedIn Saved Items CSV missing Item URL/URL column');
  }
  const now = options.now ?? new Date().toISOString();
  const records: RawSave[] = [];
  for (const row of rows.slice(1)) {
    const originalUrl = row[urlIdx]?.trim();
    if (!originalUrl) continue;
    const canonicalUrl = tryCanonicalizeUrl(originalUrl) ?? originalUrl;
    const sourceItemId = inferLinkedInItemId(canonicalUrl);
    const dedupKey = computeDedupKey({ sourcePlatform: 'linkedin', sourceItemId, canonicalUrl, originalUrl });
    records.push(RawSaveSchema.parse({
      sourcePlatform: 'linkedin',
      sourceAdapter: 'linkedin-export-v1',
      sourceItemId,
      dedupKey,
      originalUrl,
      canonicalUrl: canonicalizeUrl(originalUrl),
      captureMethod: 'export',
      captureCompleteness: 'metadata_only',
      visibilityState: 'available',
      storagePolicy: 'summary_and_snippets',
      processingPriority: 'normal',
      savedAt: dateIdx >= 0 ? parseDate(row[dateIdx] ?? '') : undefined,
      firstIngestedAt: now,
      lastSeenAt: now,
      title: 'LinkedIn saved item',
      evidenceSnippets: [],
      contentType: 'unknown',
      outboundUrls: [],
      mediaUrls: [],
      mediaTypes: [],
      hashtags: [],
      exportReconciledAt: now
    }));
  }
  return records;
}

export async function parseLinkedInSavedItemsFile(path: string, options: ParseExportOptions = {}): Promise<RawSave[]> {
  const content = await readFile(path, 'utf8');
  try {
    return parseLinkedInSavedItemsCsv(content, options);
  } catch (error) {
    throw new Error(`Failed to parse LinkedIn export ${basename(path)}: ${(error as Error).message}`);
  }
}
