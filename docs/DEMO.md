# Demo

This demo proves the local pipeline without touching LinkedIn or Notion.

## Command

```bash
li-saves demo
```

## What it does

1. Reads `fixtures/linkedin-export/saved-items.csv`.
2. Parses rows into normalized LinkedIn `RawSave` records.
3. Enriches the synthetic saves with summary/evidence/topics.
4. Loads `brand-voices/amit-tiwari-site.md`.
5. Generates website article ideas using the brand profile.
6. Writes `.demo/demo-output.json`.

## Verified output from 2026-06-06 run

```json
{
  "rawSaves": 2,
  "ideas": 2,
  "outPath": ".demo/demo-output.json"
}
```

## Why this matters

The demo covers the PRD path that can be verified without Amit's live LinkedIn session or Notion token:

```text
LinkedIn export fixture
  -> RawSave normalization
  -> brand profile load
  -> content idea generation
  -> JSON artifact
```

Live verification needs:

- LinkedIn login in a local headed browser profile.
- Notion integration token and parent page/database IDs.


## Instagram-style command structure smoke

The LinkedIn engine now follows the same review/write shape as the Instagram engine:

```bash
li-saves --env .env sync --dry-run --export-path fixtures/linkedin-export/saved-items.csv --limit 2 --out .demo/sync-raw-saves.json
li-saves --env .env fetch --limit 10 --format markdown
li-saves --env .env save-approved approved-ideas.json
li-saves --env .env drop-save SOURCE_PAGE_ID
```

`fetch`, `save-approved`, and `drop-save` require Notion env values except dry-run variants of write commands.
