import { readFile } from 'node:fs/promises';

export type RawSaveReviewRecord = {
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

export type ApprovedIdeaInput = Record<string, any> & {
  source_page_id?: string;
  name?: string;
};

export async function loadEnvFile(path: string): Promise<Record<string, string>> {
  const loaded: Record<string, string> = {};
  const content = await readFile(path, 'utf8').catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return '';
    throw error;
  });
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    loaded[key] = value;
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return loaded;
}

export function rawSaveRecordsToMarkdown(records: RawSaveReviewRecord[]): string {
  if (!records.length) return 'No unprocessed LinkedIn saves found.';
  return records.map((record, index) => [
    `## ${index + 1}. ${record.name}`,
    `- source_page_id: \`${record.page_id}\``,
    `- status: ${record.status}`,
    `- saved: ${record.saved || 'unknown'}`,
    `- author: ${record.author || 'unknown'}`,
    `- capture_completeness: ${record.capture_completeness}`,
    `- url: ${record.url}`,
    '',
    '### Source Summary',
    record.source_summary || '(no source summary captured)',
    '',
    '### Evidence Snippets',
    record.evidence_snippets || '(no evidence snippets captured)'
  ].join('\n')).join('\n\n');
}

export async function loadApprovedIdeasFile(path: string): Promise<ApprovedIdeaInput[]> {
  const data = JSON.parse(await readFile(path, 'utf8'));
  const ideas = Array.isArray(data) ? data : data.ideas;
  if (!Array.isArray(ideas)) throw new Error("Approved ideas JSON must be a list or an object with an 'ideas' list.");
  return ideas;
}

export function validateApprovedIdea(idea: ApprovedIdeaInput): void {
  const missing = ['source_page_id', 'name'].filter((key) => !idea[key]);
  if (missing.length) throw new Error(`Idea is missing required field(s): ${missing.join(', ')}`);
}
