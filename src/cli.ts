#!/usr/bin/env node
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { Command } from 'commander';
import { parseLinkedInSavedItemsFile } from './adapters/linkedin/export-importer.js';
import { loadBrandProfileFromMarkdown } from './brand/profile.js';
import { captureLinkedInSaves } from './browser/linkedin-capture.js';
import { generateIdeasForSave } from './ideas/generator.js';
import { createNotionDatabases } from './notion/setup.js';
import { schemaInstructions } from './notion/schema.js';
import { planRawSaveUpserts, upsertRawSavesToNotion } from './notion/upsert.js';
import { runDemo } from './demo/run-demo.js';

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2));
}

const program = new Command();
program.name('linkedin-saves-engine').description('Local-first LinkedIn saves to Notion and content ideas engine').version('0.1.0');

program.command('doctor').description('Check local setup').action(async () => {
  const checks = {
    node: process.version,
    notionToken: Boolean(process.env.NOTION_TOKEN),
    notionParentPageId: Boolean(process.env.NOTION_PARENT_PAGE_ID),
    rawDatabaseId: Boolean(process.env.NOTION_RAW_DATABASE_ID),
    ideasDatabaseId: Boolean(process.env.NOTION_IDEAS_DATABASE_ID),
    defaultBrandProfile: 'brand-voices/amit-tiwari-site.md'
  };
  console.log(JSON.stringify(checks, null, 2));
});

program.command('setup:notion-schema')
  .description('Print or create Notion Raw Ingest and Content Ideas databases')
  .option('--write', 'create databases using NOTION_TOKEN and NOTION_PARENT_PAGE_ID')
  .action(async (opts) => {
    if (!opts.write) {
      console.log(schemaInstructions());
      console.log('\nDry-run only. To create DBs: NOTION_TOKEN=... NOTION_PARENT_PAGE_ID=... npm run dev -- setup:notion-schema --write');
      return;
    }
    const token = process.env.NOTION_TOKEN;
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;
    if (!token || !parentPageId) throw new Error('NOTION_TOKEN and NOTION_PARENT_PAGE_ID are required for --write');
    const result = await createNotionDatabases({ token, parentPageId });
    console.log(JSON.stringify(result, null, 2));
  });

program.command('import:linkedin-export')
  .requiredOption('--path <path>', 'LinkedIn Saved Items CSV path')
  .option('--out <path>', 'write normalized JSON to path', '.demo/imported-raw-saves.json')
  .option('--write-notion', 'upsert into NOTION_RAW_DATABASE_ID')
  .action(async (opts) => {
    const records = await parseLinkedInSavedItemsFile(opts.path);
    const plan = planRawSaveUpserts(records);
    if (opts.writeNotion) {
      const token = process.env.NOTION_TOKEN;
      const databaseId = process.env.NOTION_RAW_DATABASE_ID;
      if (!token || !databaseId) throw new Error('NOTION_TOKEN and NOTION_RAW_DATABASE_ID required for --write-notion');
      const summary = await upsertRawSavesToNotion({ token, databaseId, records: plan.inserts });
      console.log(JSON.stringify({ plan, summary }, null, 2));
    } else {
      await writeJson(opts.out, { plan, records });
      console.log(`Dry-run import wrote ${records.length} records to ${opts.out}`);
    }
  });

program.command('capture:linkedin-saves')
  .option('--profile-dir <path>', 'persistent browser profile dir', '.browser-profiles/linkedin')
  .option('--limit <n>', 'max items', '50')
  .option('--out <path>', 'write normalized JSON to path', '.demo/captured-raw-saves.json')
  .action(async (opts) => {
    const records = await captureLinkedInSaves({ profileDir: opts.profileDir, limit: Number(opts.limit), headed: true });
    await writeJson(opts.out, { records });
    console.log(`Captured ${records.length} records to ${opts.out}`);
  });

program.command('profile:brand:validate')
  .requiredOption('--brand <path>', 'brand profile markdown path')
  .action(async (opts) => {
    const profile = await loadBrandProfileFromMarkdown(opts.brand);
    console.log(JSON.stringify({ id: profile.id, name: profile.name, surfaces: profile.surfaces.map((s) => s.id) }, null, 2));
  });

program.command('generate:ideas')
  .requiredOption('--input <path>', 'RawSave JSON file')
  .option('--brand <path>', 'brand profile markdown path', 'brand-voices/amit-tiwari-site.md')
  .option('--surface <surface>', 'surface id', 'website_article')
  .option('--out <path>', 'write ideas JSON to path', '.demo/ideas.json')
  .action(async (opts) => {
    const parsed = JSON.parse(await readFile(opts.input, 'utf8'));
    const records = parsed.records ?? parsed.rawSaves ?? parsed;
    const profile = await loadBrandProfileFromMarkdown(opts.brand);
    const ideas = records.flatMap((record: any) => generateIdeasForSave(record, profile, { surfaceId: opts.surface }));
    await writeJson(opts.out, { ideas });
    console.log(`Generated ${ideas.length} ideas to ${opts.out}`);
  });

program.command('demo')
  .option('--out <path>', 'write demo output path', '.demo/demo-output.json')
  .action(async (opts) => {
    const result = await runDemo({ outPath: opts.out });
    console.log(JSON.stringify({ rawSaves: result.rawSaves.length, ideas: result.ideas.length, outPath: result.outPath }, null, 2));
  });

program.parseAsync(process.argv).catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
