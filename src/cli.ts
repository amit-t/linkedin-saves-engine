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
import { createContentIdeasInNotion, fetchUnprocessedRawSaves, markRawSaveStatus, planRawSaveUpserts, upsertRawSavesToNotion } from './notion/upsert.js';
import { runDemo } from './demo/run-demo.js';
import { loadApprovedIdeasFile, loadEnvFile, rawSaveRecordsToMarkdown, validateApprovedIdea } from './cli/instagram-style.js';

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2));
}

const program = new Command();
program.name('linkedin-saves-engine').description('Local-first LinkedIn saves to Notion and content ideas engine').version('0.1.0').option('--env <path>', 'Path to .env config file.', '.env');

program.hook('preAction', async (thisCommand) => {
  const opts = thisCommand.optsWithGlobals<{ env: string }>();
  await loadEnvFile(opts.env);
});


program.command('sync')
  .description('Sync LinkedIn saves into Notion; mirrors Instagram engine command structure')
  .option('--dry-run', 'fetch/dedupe without writing to Notion')
  .option('--limit <n>', 'maximum saves to process', '50')
  .option('--verbose', 'print detailed summary')
  .option('--export-path <path>', 'parse LinkedIn Saved Items CSV instead of browser capture')
  .option('--out <path>', 'write dry-run records to path', '.demo/sync-raw-saves.json')
  .action(async (opts) => {
    const limit = Number(opts.limit);
    const exportPath = opts.exportPath ?? process.env.LINKEDIN_EXPORT_PATH;
    const records = exportPath
      ? await parseLinkedInSavedItemsFile(exportPath)
      : await captureLinkedInSaves({ profileDir: process.env.LINKEDIN_BROWSER_PROFILE ?? '.browser-profiles/linkedin', limit, headed: true });
    const limited = records.slice(0, limit);
    const plan = planRawSaveUpserts(limited);
    if (opts.dryRun) {
      await writeJson(opts.out, { plan, records: limited });
      console.log(`[dry-run] fetched=${limited.length} inserts=${plan.inserts.length} duplicates=${plan.duplicates.length} out=${opts.out}`);
      return;
    }
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_RAW_DATABASE_ID;
    if (!token || !databaseId) throw new Error('NOTION_TOKEN and NOTION_RAW_DATABASE_ID required for sync without --dry-run');
    const summary = await upsertRawSavesToNotion({ token, databaseId, records: plan.inserts });
    if (opts.verbose) console.log(JSON.stringify({ fetched: limited.length, plan, summary }, null, 2));
    else console.log(`Done. fetched=${limited.length} created=${summary.created} updated=${summary.updated} skipped=${summary.skipped}`);
  });

program.command('fetch')
  .description('Fetch unprocessed LinkedIn raw saves from Notion for review')
  .option('--limit <n>', 'maximum saves', '10')
  .option('--format <format>', 'json or markdown', 'markdown')
  .action(async (opts) => {
    const token = process.env.NOTION_TOKEN;
    const databaseId = process.env.NOTION_RAW_DATABASE_ID;
    if (!token || !databaseId) throw new Error('NOTION_TOKEN and NOTION_RAW_DATABASE_ID required');
    const records = await fetchUnprocessedRawSaves({ token, databaseId, limit: Number(opts.limit) });
    if (opts.format === 'json') console.log(JSON.stringify(records, null, 2));
    else console.log(rawSaveRecordsToMarkdown(records));
  });

program.command('save-approved')
  .description('Create approved content ideas and mark source saves reviewed')
  .argument('<ideas_file>', 'JSON file containing approved ideas')
  .option('--dry-run', 'print intended writes without touching Notion')
  .action(async (ideasFile, opts) => {
    const ideas = await loadApprovedIdeasFile(ideasFile);
    for (const idea of ideas) validateApprovedIdea(idea);
    if (opts.dryRun) {
      for (const idea of ideas) console.log(`[dry-run] Would save idea for source ${idea.source_page_id}: ${idea.name}`);
      return;
    }
    const token = process.env.NOTION_TOKEN;
    const ideasDatabaseId = process.env.NOTION_IDEAS_DATABASE_ID;
    if (!token || !ideasDatabaseId) throw new Error('NOTION_TOKEN and NOTION_IDEAS_DATABASE_ID required');
    for (const idea of ideas) {
      const contentIdea = {
        name: String(idea.name),
        rawSaveDedupKey: String(idea.raw_save_dedup_key ?? idea.source_page_id),
        brandProfileId: String(idea.brand_profile_id ?? 'amit-tiwari-site'),
        brandName: String(idea.brand_name ?? 'Amit Tiwari personal site'),
        brandVoiceVersion: String(idea.brand_voice_version ?? new Date().toISOString().slice(0, 10)),
        surfaceId: String(idea.surface_id ?? 'website_article'),
        format: String(idea.format ?? 'Website article'),
        audience: String(idea.audience ?? ''),
        hook: String(idea.hook ?? idea.hook_options?.[0] ?? ''),
        thesis: String(idea.thesis ?? idea.angle ?? ''),
        outline: Array.isArray(idea.outline) ? idea.outline.map(String) : [JSON.stringify(idea.outline ?? {})],
        sourceEvidence: Array.isArray(idea.source_evidence) ? idea.source_evidence.map(String) : [String(idea.source_url ?? idea.source_page_id)],
        noveltyScore: Number(idea.novelty_score ?? 75),
        fitScore: Number(idea.fit_score ?? 80),
        confidence: Number(idea.confidence ?? 75),
        status: 'Generated' as const,
        createdAt: new Date().toISOString()
      };
      await createContentIdeasInNotion({ token, databaseId: ideasDatabaseId, ideas: [contentIdea] });
      await markRawSaveStatus({ token, pageId: String(idea.source_page_id), status: 'Reviewed' });
      console.log(`Saved content idea and marked source ${idea.source_page_id} Reviewed`);
    }
  });

program.command('drop-save')
  .description('Mark a LinkedIn raw save as Dropped')
  .argument('<page_id>', 'Notion source page ID to mark Dropped')
  .option('--dry-run', 'print intended write without touching Notion')
  .action(async (pageId, opts) => {
    if (opts.dryRun) {
      console.log(`[dry-run] Would mark source ${pageId} Dropped`);
      return;
    }
    const token = process.env.NOTION_TOKEN;
    if (!token) throw new Error('NOTION_TOKEN required');
    await markRawSaveStatus({ token, pageId, status: 'Dropped' });
    console.log(`Marked source ${pageId} Dropped`);
  });

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
      console.log('\nDry-run only. To create DBs: add NOTION_TOKEN and NOTION_PARENT_PAGE_ID to .env, then run: li-saves --env .env setup:notion-schema --write');
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
  .option('--write-notion', 'create idea pages in NOTION_IDEAS_DATABASE_ID')
  .action(async (opts) => {
    const parsed = JSON.parse(await readFile(opts.input, 'utf8'));
    const records = parsed.records ?? parsed.rawSaves ?? parsed;
    const profile = await loadBrandProfileFromMarkdown(opts.brand);
    const ideas = records.flatMap((record: any) => generateIdeasForSave(record, profile, { surfaceId: opts.surface }));
    if (opts.writeNotion) {
      const token = process.env.NOTION_TOKEN;
      const databaseId = process.env.NOTION_IDEAS_DATABASE_ID;
      if (!token || !databaseId) throw new Error('NOTION_TOKEN and NOTION_IDEAS_DATABASE_ID required for --write-notion');
      const summary = await createContentIdeasInNotion({ token, databaseId, ideas });
      console.log(JSON.stringify({ ideas: ideas.length, notion: summary }, null, 2));
    } else {
      await writeJson(opts.out, { ideas });
      console.log(`Generated ${ideas.length} ideas to ${opts.out}`);
    }
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
