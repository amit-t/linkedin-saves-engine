# LinkedIn Saves Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

- [ ] Create Node/TypeScript project config and Vitest test files that import non-existent modules.
- [ ] Run `npm test` and verify tests fail because modules are missing.

## Task 2: Core model, URL, dedupe, redaction

- [ ] Implement `RawSave` schema and helpers.
- [ ] Implement canonical URL cleanup.
- [ ] Implement dedupe key selection.
- [ ] Implement redaction for logs/errors/metadata.
- [ ] Run tests to green.

## Task 3: LinkedIn export importer

- [ ] Implement CSV parser for LinkedIn `Saved Items` export with flexible headers.
- [ ] Convert rows into metadata-only RawSave records.
- [ ] Merge export records with richer browser records without overwriting rich data.
- [ ] Run tests to green.

## Task 4: Brand profiles and ideas

- [ ] Parse brand voice Markdown profiles into structured profile objects.
- [ ] Validate required profile sections.
- [ ] Generate deterministic Content Ideas from RawSave + brand profile + surface.
- [ ] Run tests to green.

## Task 5: Notion schema and upsert planning

- [ ] Define Raw Ingest and Content Ideas schema specs.
- [ ] Implement `setup:notion-schema` to print instructions in dry-run mode and create DBs when `--write` + token are supplied.
- [ ] Implement dry-run upsert planner and Notion page property mapping.
- [ ] Run tests to green.

## Task 6: Browser capture skeleton

- [ ] Implement Playwright headed persistent-profile launcher.
- [ ] Add DOM fallback extraction and network response collection hooks.
- [ ] Enforce write-method guard and stop-condition errors.
- [ ] Keep live capture manual/local and excluded from automated tests.

## Task 7: CLI, docs, demo

- [ ] Add commands: `doctor`, `setup:notion-schema`, `import:linkedin-export`, `profile:brand:validate`, `generate:ideas`, `demo`.
- [ ] Add synthetic fixtures for demo.
- [ ] Write `docs/SETUP.md` with exact Notion DB setup and browser setup instructions.
- [ ] Write `docs/DEMO.md` and run demo command.
- [ ] Run `npm test`, `npm run build`, `npm run demo`, `git diff --check`.
