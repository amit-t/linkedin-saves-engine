# LinkedIn Saves Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Build the PRD v3 into a working local-first LinkedIn saves engine with dry-run/demo flow, Notion DB setup/upsert support, brand voice profiles, and verified tests.

**Architecture:** TypeScript CLI. Pure core modules handle RawSave validation, URL canonicalization, dedupe, redaction, export parsing, brand profiles, idea generation, and Notion mapping. Integrations are edges: Notion API client, Playwright browser capture, and CLI commands.

**Tech Stack:** Node.js 24, TypeScript, Vitest, tsx, zod, commander, @notionhq/client, playwright.

---

## File map

- `package.json`, `tsconfig.json`, `vitest.config.ts`: project/tooling.
- `src/core/*`: platform-neutral types, redaction, canonicalization, dedupe, run summaries.
- `src/adapters/linkedin/*`: LinkedIn export parser and browser capture adapter.
- `src/brand/*`: brand profile parsing, validation, sample seeding helpers.
- `src/ideas/*`: deterministic first-cut idea generation from RawSave + brand profile.
- `src/notion/*`: schema definitions, setup instructions, Notion database creation/upsert mapping.
- `src/cli.ts`: command router.
- `fixtures/*`: synthetic demo data only.
- `tests/*`: Vitest coverage for core behavior.
- `docs/SETUP.md`: exact Notion/browser/run instructions.
- `docs/DEMO.md`: demo transcript and command recipe.

## Task 1: Tooling and failing tests

- [x] Create Node/TypeScript project config and Vitest test files that import non-existent modules.
- [x] Run `npm test` and verify tests fail because modules are missing.

## Task 2: Core model, URL, dedupe, redaction

- [x] Implement `RawSave` schema and helpers.
- [x] Implement canonical URL cleanup.
- [x] Implement dedupe key selection.
- [x] Implement redaction for logs/errors/metadata.
- [x] Run tests to green.

## Task 3: LinkedIn export importer

- [x] Implement CSV parser for LinkedIn `Saved Items` export with flexible headers.
- [x] Convert rows into metadata-only RawSave records.
- [x] Merge export records with richer browser records without overwriting rich data.
- [x] Run tests to green.

## Task 4: Brand profiles and ideas

- [x] Parse brand voice Markdown profiles into structured profile objects.
- [x] Validate required profile sections.
- [x] Generate deterministic Content Ideas from RawSave + brand profile + surface.
- [x] Run tests to green.

## Task 5: Notion schema and upsert planning

- [x] Define Raw Ingest and Content Ideas schema specs.
- [x] Implement `setup:notion-schema` to print instructions in dry-run mode and create DBs when `--write` + token are supplied.
- [x] Implement dry-run upsert planner and Notion page property mapping.
- [x] Run tests to green.

## Task 6: Browser capture skeleton

- [x] Implement Playwright headed persistent-profile launcher.
- [x] Add DOM fallback extraction and network response collection hooks.
- [x] Enforce write-method guard and stop-condition errors.
- [x] Keep live capture manual/local and excluded from automated tests.

## Task 7: CLI, docs, demo

- [x] Add primary Instagram-style commands: `sync`, `fetch`, `save-approved`, `drop-save`; retain developer aliases: `doctor`, `setup:notion-schema`, `import:linkedin-export`, `profile:brand:validate`, `generate:ideas`, `demo`.
- [x] Add synthetic fixtures for demo.
- [x] Write `docs/SETUP.md` with exact Notion DB setup and browser setup instructions.
- [x] Write `docs/DEMO.md` and run demo command.
- [x] Run `npm test`, `npm run build`, `npm run demo`, `git diff --check`.


## Verification evidence

- `npm test` => 10 files passed, 17 tests passed.
- `npm run build` => TypeScript build passed.
- `npm run demo` => generated 2 raw saves and 2 ideas into `.demo/demo-output.json`.
- `npm run dev -- --env .env sync --dry-run --export-path fixtures/linkedin-export/saved-items.csv --limit 2` => parsed export and printed dry-run sync summary.
- `npm run dev -- --env .env setup:notion-schema` => printed Raw Ingest + Content Ideas schema.
- `npm run doctor` => local setup check runs and reports env presence.

## Known live-run prerequisites

- Real Notion DB creation requires `NOTION_TOKEN` and `NOTION_PARENT_PAGE_ID`.
- Real LinkedIn capture requires manual login in the headed local browser profile.
