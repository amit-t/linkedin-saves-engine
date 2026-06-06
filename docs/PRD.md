# LinkedIn Saves Engine PRD

Status: Draft v1
Owner: Amit Tiwari
Repo: `linkedin-saves-engine`
Last updated: 2026-06-06

## 1. Product summary

LinkedIn Saves Engine turns Amit's saved LinkedIn posts/articles into a reliable raw-ingest database in Notion, then enriches and classifies those saves into reusable content ideas for multiple brands and publishing surfaces.

This repo owns the LinkedIn-specific source adapter. It should fit the same generic saves-engine model as the sibling Substack project, but it should not become Tiny-Trauma-specific or hard-code one destination brand.

Core idea:

```text
LinkedIn saved items
  -> local authenticated capture adapter
  -> normalized RawSave records
  -> Notion Raw Ingest database
  -> enrichment + classification
  -> Content Idea records
  -> command packs for Amit Tiwari site, Tiny Trauma site, LinkedIn posts, Substack essays, etc.
```

## 2. Problem

LinkedIn saved posts are high-intent signals: Amit saved them because they contain useful framing, examples, contrarian ideas, workflows, prompts, industry insight, or emotional resonance. LinkedIn's native saved-items UX is poor for retrieval, searching, sorting, tagging, synthesis, and repurposing.

Manual copy/paste loses context and does not scale. Official LinkedIn APIs do not provide a first-class saved-posts endpoint. LinkedIn account export includes saved-item URLs and saved dates, but not enough content for idea generation. Browser/session capture provides better completeness for a personal local workflow.

## 3. Goals

1. Capture LinkedIn saved posts/articles as completely as possible from Amit's logged-in account.
2. Normalize every save into a generic `RawSave` contract shared conceptually with other saves engines.
3. Upsert raw saves into a Notion Raw Ingest database with stable dedupe keys.
4. Enrich saves with useful content metadata: author, title, post text, media hints, source URL, canonical URL, save time, publish time when available, and content hash.
5. Classify saves into topics, entities, content angles, and destination/brand fit.
6. Generate zero-to-many content ideas from each strong save.
7. Support multiple downstream destinations without hard-coding Tiny Trauma: Amit Tiwari site, Tiny Trauma site, LinkedIn post, Substack essay/newsletter, future channels.
8. Keep browser credentials and session tokens local and out of logs, git, Notion, and cloud storage.
9. Make runs idempotent, auditable, resumable, and dry-run capable.

## 4. Non-goals

- Do not build a SaaS product in v1.
- Do not support multiple users in v1.
- Do not post, like, comment, save, unsave, follow, message, or otherwise mutate LinkedIn.
- Do not bypass account security challenges.
- Do not store cookies, auth headers, CSRF tokens, or full browser storage in Notion.
- Do not open-source sensitive captures or fixture data.
- Do not make the LinkedIn repo own all generic saves-engine orchestration if a better shared package/repo emerges later.

## 5. Users and personas

### Primary user: Amit

- Saves content on LinkedIn while browsing normally.
- Wants saved items to become searchable, structured, and useful for content ideation.
- Wants flexible routing: one LinkedIn save can inspire an Amit Tiwari article, Tiny Trauma essay, LinkedIn post, or Substack essay.
- Accepts platform risk for personal local use with logged-in tokens, but wants credential hygiene.

### Future optional user: technical clone user

- Runs locally against their own logged-in browser/session.
- Owns their own platform risk and credentials.
- Configures their own Notion database and destination brands.

## 6. Source/API reality as of 2026-06-06

- LinkedIn's UI supports saving posts/articles and viewing saved posts/articles in Saved Items.
- LinkedIn account data export includes `Saved Items`, described as saved date and URL of a post, article, or other content.
- LinkedIn's open API permissions do not include a saved-items read endpoint. Open consumer permissions cover sign-in/profile/email and `w_member_social`; reading member posts through the Posts API requires `r_member_social`, which is restricted.
- LinkedIn explicitly discourages/prohibits scraping/automation in its user agreement/help docs. This product accepts that risk for Amit's personal local use, but still minimizes writes, load, and credential exposure.

Useful references:

- LinkedIn saved content help: https://www.linkedin.com/help/learning/answer/a527126
- LinkedIn account data export: https://www.linkedin.com/help/linkedin/answer/a1339364
- LinkedIn API access and permissions: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- LinkedIn Posts API permissions: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- LinkedIn prohibited software/extensions: https://www.linkedin.com/help/linkedin/answer/a1341387

## 7. Recommended v1 approach

Use a hybrid capture strategy, optimized for completeness and content quality:

1. **Authenticated browser capture**: launch or connect to a local logged-in browser profile.
2. **Network-preferred extraction**: navigate to LinkedIn Saved Items and capture underlying read-only responses that contain saved item/post payloads.
3. **DOM fallback**: if private response shapes change, scroll the saved-items UI and extract visible card text/links/authors/media hints.
4. **Data-export fallback**: optionally import LinkedIn's `Saved Items` CSV/export as a URL/date backstop.
5. **URL/post enrichment**: fetch/visit individual saved URLs when needed to enrich missing text/metadata, using the same redacted local session.
6. **Notion upsert**: write normalized, redacted records to Notion Raw Ingest.
7. **Classification and fanout**: produce content idea candidates for configured destinations.

### Why not official API first?

Official API access is insufficient for saved-item capture. Data export is stable but too thin for content ideation. Browser/network capture gives the best balance for a personal local engine.

## 8. Functional requirements

### 8.1 Capture

- Open LinkedIn saved posts/articles view from a logged-in local browser session.
- Capture all currently visible saved items and continue pagination/scrolling until no new items appear or a configured limit is reached.
- Prefer network payloads over DOM because they usually contain stable IDs and richer metadata.
- Fall back to DOM extraction when network payload signatures are unknown or incomplete.
- Support import from LinkedIn data export CSV as supplemental source.
- Normalize relative, shortened, tracking, and redirect URLs to canonical URLs where possible.
- Compute stable dedupe keys before Notion writes.
- Re-run without duplicate Notion rows.
- Record run summary: attempted count, created count, updated count, skipped count, error count, capture method mix.

### 8.2 Enrichment

- Extract/save author name, author URL/URN if available, headline/byline if visible, post text, article title, media type, document/video/image hints, publish timestamp if visible, saved timestamp if available, outbound links, hashtags, and engagement counts if visible.
- Create `Content Hash` from normalized text + canonical URL + author identifier.
- Mark completeness: `full`, `partial`, `metadata_only`, `failed`.
- Store source snippets for idea evidence without blindly copying entire third-party text into publishable output.
- Store full snapshots only according to storage policy: Notion, local-only, or none.

### 8.3 Notion raw ingest

- Create or target a Notion Raw Ingest database.
- Upsert by `Dedup Key`.
- Maintain `First Ingested At` and `Last Seen At`.
- Preserve original URL and canonical URL.
- Store redacted raw metadata or raw payload hash, never credentials.
- Track processing status through `New -> Enriched -> Classified -> Idea Created` or `Error/Ignored`.

### 8.4 Content idea generation

- Score each raw save for idea potential.
- Classify topic, audience, content form, emotional tone, novelty, actionability, and brand fit.
- Generate zero-to-many idea candidates from a raw save.
- Each idea must be tied back to the raw save and include evidence snippets.
- Ideas must be destination-aware and brand-aware, but destination configuration must be data/config-driven.
- User can approve/reject/edit ideas in Notion.

### 8.5 Commands / downstream surfaces

The engine should expose command packs, not one fixed output:

- `generate:linkedin-post`
- `generate:substack-essay`
- `generate:amit-site-article`
- `generate:tiny-trauma-article`
- `generate:content-brief`
- `generate:idea-clusters`
- `generate:weekly-digest`

Commands should read Raw Ingest + Content Ideas and produce drafts/briefs, not auto-publish in v1.

## 9. Non-functional requirements

- **Local-first**: browser sessions, cookies, and raw capture artifacts stay local.
- **Read-only LinkedIn behavior**: only read/navigate; no mutations.
- **Dry-run default**: preview planned Notion changes before writing.
- **Idempotency**: repeat runs update existing records.
- **Resumability**: store cursors/checkpoints locally.
- **Redaction**: strip cookies, authorization, CSRF, set-cookie, bearer-like tokens, request IDs when sensitive, and personal account identifiers from logs where feasible.
- **Low load**: one browser context, small concurrency, jitter, backoff, stop on throttling/challenge.
- **Auditability**: clear local run logs with counts and hashes, no secrets.
- **Testability**: adapter contract tests from sanitized fixtures.
- **Portability**: schema and canonical model should also work for Substack and future saves engines.

## 10. Proposed canonical model

```ts
type RawSave = {
  sourcePlatform: "linkedin";
  sourceAdapter: "linkedin-browser-saved-v1" | "linkedin-export-v1";
  sourceItemId?: string;
  dedupKey: string;
  canonicalUrl: string;
  originalUrl: string;
  captureMethod: "network" | "dom" | "export" | "manual";
  captureCompleteness: "full" | "partial" | "metadata_only" | "failed";
  savedAt?: string;
  publishedAt?: string;
  ingestedAt: string;
  lastSeenAt: string;
  title?: string;
  textSnapshot?: string;
  excerpt?: string;
  authorName?: string;
  authorHandle?: string;
  authorUrl?: string;
  contentType: "post" | "article" | "document" | "video" | "image" | "poll" | "unknown";
  outboundUrls: string[];
  mediaUrls: string[];
  hashtags: string[];
  topics?: string[];
  entities?: string[];
  contentHash?: string;
  rawPayloadHash?: string;
  localSnapshotPath?: string;
  errorCode?: string;
};
```

## 11. Proposed Notion Raw Ingest schema

| Property | Type | Purpose |
|---|---|---|
| `Name` | Title | Best title or post excerpt fallback |
| `Source Platform` | Select | `LinkedIn`, `Substack`, future sources |
| `Source Adapter` | Rich text | Adapter and version |
| `Source Item ID` | Rich text | URN/activity/share/article ID when available |
| `Dedup Key` | Rich text | Stable uniqueness key |
| `Canonical URL` | URL | Clean URL |
| `Original URL` | URL | Captured/exported URL |
| `Capture Method` | Select | `network`, `dom`, `export`, `manual` |
| `Capture Completeness` | Select | `full`, `partial`, `metadata_only`, `failed` |
| `Content Type` | Select | `post`, `article`, `document`, `video`, `image`, `poll`, `unknown` |
| `Author Name` | Rich text | Author/person/company |
| `Author Handle` | Rich text | Handle/slug/URN if known |
| `Author URL` | URL | Profile/company URL |
| `Published At` | Date | Original publish date/time if known |
| `Saved At` | Date | Save date/time if known/exported |
| `First Ingested At` | Date | First capture time |
| `Last Seen At` | Date | Latest capture time |
| `Processing Status` | Status | `New`, `Enriched`, `Classified`, `Idea Created`, `Ignored`, `Error` |
| `Topics` | Multi-select | Inferred topics |
| `Entities` | Multi-select | People, companies, products, concepts |
| `Content Hash` | Rich text | Normalized content hash |
| `Raw Payload Hash` | Rich text | Redacted payload hash |
| `Idea Potential Score` | Number | 0-100 |
| `Novelty Score` | Number | 0-100 |
| `Actionability Score` | Number | 0-100 |
| `Destination Candidates` | Multi-select | Amit site, Tiny Trauma, LinkedIn, Substack, etc. |
| `Brand Fit: Amit` | Number | 0-100 |
| `Brand Fit: Tiny Trauma` | Number | 0-100 |
| `Recommended Next Action` | Select | `Generate idea`, `Cluster`, `Archive`, `Review`, `Ignore` |
| `Local Snapshot Path` | Rich text | Local path to HTML/text snapshot if enabled |
| `Error Code` | Rich text | Redacted error class |
| `Retry Count` | Number | Retry/backoff tracking |
| `Content Ideas` | Relation | Related idea records |

Page body should contain:

- cleaned text snapshot or excerpt,
- concise summary,
- notable claims/quotes as short snippets,
- why Amit saved it if inferable,
- redacted metadata JSON,
- capture notes and warnings.

## 12. Proposed Content Ideas schema

| Property | Type | Purpose |
|---|---|---|
| `Name` | Title | Idea title |
| `Raw Saves` | Relation | One or more source saves |
| `Destination` | Select | Amit site, Tiny Trauma, LinkedIn, Substack, etc. |
| `Brand` | Select | Amit Tiwari, Tiny Trauma, future brand |
| `Format` | Select | essay, post, article, thread, digest, script |
| `Thesis` | Rich text | Core argument |
| `Hook` | Rich text | Opening angle |
| `Outline` | Rich text/page body | Draft structure |
| `Evidence Notes` | Rich text/page body | Source-grounded notes |
| `Quality Score` | Number | 0-100 |
| `Confidence` | Number | 0-100 |
| `Status` | Status | Draft, Review, Approved, Shipped, Rejected |
| `Command Used` | Rich text | Generation command/version |

## 13. Architecture

```text
CLI entrypoint
  -> config loader
  -> local browser/session manager
  -> LinkedIn saved-items navigator
  -> network response collector
  -> DOM fallback collector
  -> export CSV importer
  -> normalizer + redactor
  -> local run-state SQLite/logs
  -> Notion upsert client
  -> enrichment/classification worker
  -> content idea generator
```

### Components

1. **Session Manager**
   - Uses a named local browser profile.
   - Verifies login manually or pauses for user login.
   - Never prints cookies/storage.

2. **Saved Items Navigator**
   - Opens saved posts/articles view.
   - Scrolls/paginates carefully.
   - Stops on challenge, rate limit, or no new items.

3. **Network Collector**
   - Observes response URLs/content types.
   - Identifies candidate payloads containing saved items.
   - Stores sanitized fixture samples only when explicitly requested.

4. **DOM Collector**
   - Extracts visible cards from saved-items UI.
   - Uses robust selectors and text heuristics.
   - Fills gaps when network collector fails.

5. **Normalizer**
   - Converts network/DOM/export items into `RawSave`.
   - Canonicalizes URLs.
   - Computes dedupe key and hashes.

6. **Notion Writer**
   - Dry-run by default.
   - Upserts by `Dedup Key`.
   - Writes page body details.

7. **Idea Worker**
   - Enriches and scores.
   - Clusters related saves.
   - Generates destination-specific idea records.

## 14. Credential and safety controls

- `.env.local`, browser profiles, local state DBs, screenshots, HAR files, traces, and fixture captures must be gitignored.
- Redaction middleware is required before logs, Notion writes, fixtures, or debug output.
- Block mutation requests by default: `POST`, `PUT`, `PATCH`, `DELETE` to LinkedIn domains should fail unless a future explicit allowlist exists. V1 has no allowlist.
- No auto-login with username/password. User logs in manually in browser.
- Stop on CAPTCHA, unusual login prompts, account challenge, 999/429-like throttling, or repeated 403.
- Add jitter and conservative delays while scrolling/enriching.
- Keep full raw snapshots local by default; Notion stores excerpts/summaries unless configured otherwise.
- Do not generate publishable content that plagiarizes source text. Use saved content as inspiration/evidence.

## 15. MVP acceptance criteria

1. A user can run a local capture command against their logged-in LinkedIn browser session.
2. The adapter captures at least the first page/batch of saved LinkedIn posts/articles.
3. The adapter can continue scrolling/paginating until a configured limit or exhaustion.
4. Each captured item becomes a normalized `RawSave` with dedupe key, URL, capture method, and status.
5. Dry-run displays planned Notion creates/updates without writing.
6. Write mode upserts into Notion without creating duplicates on a second run.
7. Browser/session tokens never appear in logs, PRD fixtures, Notion rows, or git-tracked files.
8. Export CSV import can backfill URL + saved date records.
9. At least one saved item can be enriched and classified into one or more Content Idea records.
10. Destination/brand candidates are config-driven and include Amit Tiwari site, Tiny Trauma site, LinkedIn, and Substack.
11. Run summary reports counts and errors.
12. Basic adapter tests pass against sanitized fixtures.

## 16. Milestones

### Milestone 0: PRD and scaffolding

- PRD committed.
- Project structure decided.
- Secrets/gitignore policy documented.

### Milestone 1: Capture spike

- Open logged-in browser.
- Navigate saved items.
- Identify network payload candidates.
- Produce sanitized example fixture.

### Milestone 2: Raw ingest MVP

- Normalize capture records.
- Dry-run Notion upserts.
- Write mode with idempotent upserts.

### Milestone 3: Enrichment and classification

- Extract cleaner text.
- Score idea potential.
- Generate content idea candidates.

### Milestone 4: Command packs

- Add destination-specific generation commands.
- Add Notion statuses/views for review workflow.

## 17. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LinkedIn UI/private API changes | Capture breaks | Network abstraction + DOM fallback + export fallback + fixture tests |
| Account challenge/rate limit | Run interruption | Low rate, jitter, stop on challenge, manual recovery |
| Credential leakage | Severe | Redaction middleware, gitignore, local-only profile, no raw headers in logs |
| Duplicates in Notion | Workflow noise | Dedup key + content hash + Notion query before create |
| Thin captures | Poor idea quality | Individual URL enrichment + export backfill + completeness scoring |
| Plagiaristic output | Brand/legal risk | Idea generator summarizes/derives, stores evidence, avoids long copied text |
| Overfitting to Tiny Trauma | Generic product compromised | Brand config and destination candidates, no hard-coded brand logic |

## 18. Open questions

1. Should full extracted text live in Notion, local-only snapshots, or both depending on content type?
2. Should the LinkedIn and Substack repos later share a small package for `RawSave`, Notion schema, and idea fanout, or duplicate contracts until patterns stabilize?
3. What is the default first destination ranking: Amit Tiwari site, Tiny Trauma site, LinkedIn, or Substack?
4. Should Notion database creation be automated by the engine or manually created from a documented schema first?
5. What is the acceptable capture cadence: manual only, daily cron, or weekly digest?

## 19. First implementation plan after PRD approval

1. Create project skeleton and `.gitignore` for secrets/captures.
2. Add config model for Notion, browser profile path, capture limits, and destination brands.
3. Build browser session smoke test.
4. Run saved-items capture spike and identify network payloads.
5. Add normalizer and dry-run output.
6. Add Notion upsert client.
7. Add fixture-based tests and redaction tests.
8. Add first idea-classification command.
