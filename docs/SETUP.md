# LinkedIn Saves Engine Setup

Last updated: 2026-06-06

## 1. Install

```bash
cd /Users/amittiwari/Projects/AmitTiwari/linkedin-saves-engine
pnpm install
pnpm test
pnpm build
zsh scripts/install_cli.zsh
```

Expected:

- tests pass
- TypeScript build exits 0
- `li-saves`, `linkedin-saves-engine`, and `linkedin-content-ideas` are linked into `~/.local/bin`

Use `li-saves` in normal docs. It is the short alias for `linkedin-saves-engine`.

## 2. Run local demo first

```bash
li-saves demo
```

Output:

```text
.demo/demo-output.json
```

This uses synthetic LinkedIn export fixtures and the seeded Amit Tiwari site brand profile. It does not touch LinkedIn or Notion.

## 3. Notion integration setup

1. Open Notion.
2. Create a private parent page named `LinkedIn Saves Engine`.
3. Go to https://www.notion.so/profile/integrations.
4. Create an internal integration named `LinkedIn Saves Engine Local`.
5. Copy the integration secret.
6. Share the `LinkedIn Saves Engine` parent page with the integration.
7. Copy the parent page ID from the Notion URL.
8. Create `.env` from `.env.example`:

```bash
cp .env.example .env
```

9. Fill:

```text
NOTION_TOKEN=secret_xxx
NOTION_PARENT_PAGE_ID=<parent-page-id>
```

## 4. Preview Notion database schemas

```bash
li-saves --env .env setup:notion-schema
```

This prints the two database schemas:

- `LinkedIn Saves Raw Ingest`
- `LinkedIn Saves Content Ideas`

No Notion writes happen.

## 5. Create Notion databases with CLI

```bash
li-saves --env .env setup:notion-schema --write
```

Expected JSON:

```json
{
  "rawDatabaseId": "...",
  "ideasDatabaseId": "..."
}
```

Paste those IDs back into `.env`:

```text
NOTION_RAW_DATABASE_ID=<rawDatabaseId>
NOTION_IDEAS_DATABASE_ID=<ideasDatabaseId>
```

## 6. Import LinkedIn account export

LinkedIn export path changes by account export package. Find the CSV containing saved items, then run:

```bash
li-saves --env .env sync --dry-run --export-path "/path/to/Saved Items.csv" --out .demo/imported-raw-saves.json
```

Dry-run output only. To write raw saves to Notion:

```bash
li-saves --env .env sync --export-path "/path/to/Saved Items.csv"
```

## 7. Validate brand profile

```bash
li-saves --env .env profile:brand:validate --brand brand-voices/amit-tiwari-site.md
```

To create another brand later:

1. Copy `brand-voices/brand-voice-template.md`.
2. Fill it manually, or use the global skill `brand-voice-profiler` against sample content.
3. Run `profile:brand:validate`.

## 8. Generate ideas from captured/enriched raw saves

Export-only rows usually do not have enough evidence for high-quality ideas. Run this against browser-captured or enriched raw saves when possible.

```bash
li-saves --env .env fetch --limit 10 --format markdown
```

After reviewing fetched saves, create `approved-ideas.json` in the same shape as the Instagram engine (`source_page_id`, `name`, `hook_options`, `outline`, `platform_breakdowns`). Then write approved ideas and mark sources reviewed:

```bash
li-saves --env .env save-approved approved-ideas.json
```

Drop a rejected save:

```bash
li-saves --env .env drop-save SOURCE_PAGE_ID
```

## 9. Browser capture setup

Browser capture is local and headed by default. It uses network-first extraction when LinkedIn JSON payloads are visible, then DOM fallback for visible saved-item links/cards.

```bash
li-saves --env .env sync --dry-run \
  --limit 50 \
  --out .demo/captured-raw-saves.json
```

First run behavior:

1. A browser opens.
2. Log in to LinkedIn manually if needed.
3. If LinkedIn shows CAPTCHA/checkpoint/security challenge, the engine stops.
4. Re-run after login is stable.

Safety rules enforced:

- no cookie/header/token prompts
- headed browser by default
- write-like LinkedIn requests fail closed
- no auto-post/like/comment/save/unsave/follow/connect/message actions
- local profile/cache paths are gitignored

## 10. Recommended first real run

```bash
li-saves doctor
li-saves demo
li-saves --env .env setup:notion-schema
li-saves --env .env profile:brand:validate --brand brand-voices/amit-tiwari-site.md
li-saves --env .env sync --dry-run --limit 50 --out .demo/captured-raw-saves.json
li-saves --env .env fetch --limit 10 --format markdown
```

Only add Notion writes after dry-run output looks right.
