import { Client } from '@notionhq/client';
import type { NotionDatabaseSpec, NotionPropertySpec } from './schema.js';
import { contentIdeasSchemaSpec, rawIngestSchemaSpec } from './schema.js';

export type SetupResult = { rawDatabaseId: string; ideasDatabaseId: string };

function propertyToNotion(spec: NotionPropertySpec): any {
  switch (spec.type) {
    case 'title': return { title: {} };
    case 'rich_text': return { rich_text: {} };
    case 'url': return { url: {} };
    case 'checkbox': return { checkbox: {} };
    case 'number': return { number: {} };
    case 'date': return { date: {} };
    case 'select': return { select: { options: (spec.options ?? []).map((name) => ({ name })) } };
    case 'status': return { status: { options: (spec.options ?? []).map((name) => ({ name })) } };
    default: return { rich_text: {} };
  }
}

function databaseProperties(spec: NotionDatabaseSpec): Record<string, any> {
  return Object.fromEntries(Object.entries(spec.properties).map(([name, property]) => [name, propertyToNotion(property)]));
}

async function createDatabase(notion: Client, parentPageId: string, spec: NotionDatabaseSpec): Promise<string> {
  const response = await notion.databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: spec.title } }],
    initial_data_source: { properties: databaseProperties(spec) }
  } as any);
  return response.id;
}

export async function createNotionDatabases(options: { token: string; parentPageId: string }): Promise<SetupResult> {
  const notion = new Client({ auth: options.token });
  const rawDatabaseId = await createDatabase(notion, options.parentPageId, rawIngestSchemaSpec);
  const ideasDatabaseId = await createDatabase(notion, options.parentPageId, contentIdeasSchemaSpec);
  return { rawDatabaseId, ideasDatabaseId };
}
