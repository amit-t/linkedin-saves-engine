# LinkedIn Saves Engine PRD

Status: PRD v3 — brand-profile defaults applied
Owner: Amit Tiwari
Repo: `linkedin-saves-engine`
Last updated: 2026-06-06
Related review: `docs/PRD_GRILL_ME_AUTO.md`

## 1. Product summary

LinkedIn Saves Engine turns saved LinkedIn posts/articles into a reliable local-first raw-ingest system in Notion, then enriches and classifies those saves into reusable content ideas for any configured site, brand, or publishing surface.

This repo owns the LinkedIn source adapter and the first working proof of the generic saves-engine contract. It may temporarily contain shared contracts, Notion schema, enrichment, brand-profile, and command-pack code, but LinkedIn-specific capture must stay isolated behind an adapter boundary. Destination/site/brand logic must live in reusable brand profiles, not in the LinkedIn adapter.

Core flow:

```text
LinkedIn saved items
  -> local authenticated headed browser capture
  -> network-first extraction
  -> DOM/detail-page fallback
  -> LinkedIn export reconciliation
  -> normalized RawSave records
  -> Notion Raw Ingest database
  -> enrichment + classification
  -> Notion Content Ideas database
  -> command packs for any configured brand/site/surface
```

Primary product outcome is not merely archiving saves. Primary outcome is a trustworthy source-evidence pipeline that produces specific, reviewable, destination-aware content ideas.

## 2. Key decisions now locked

The deep grill review resolved all simple choices into defaults:

| Decision | Default |
|---|---|
| Source approach | Local authenticated browser, network-first, DOM fallback |
| Session strategy | Dedicated persistent browser profile; Amit logs in manually |
| Browser visibility | Headed by default; headless deferred |
| Official LinkedIn API | Not a v1 capture path |
| LinkedIn export | First-class reconciliation/import command, not optional afterthought |
| Notion model | Two related databases: Raw Ingest + Content Ideas |
| Full-text storage | Summary/snippets in Notion; full local snapshot cache, gitignored/encrypted-capable |
| Destination logic | Config-driven brand profiles outside LinkedIn adapter |
| Idea fanout | Zero-to-many ideas per raw save |
| Auto-publish | No; commands generate briefs/drafts only |
| Dry-run | Default for every write path |
| Platform-risk posture | Accepted for personal local use; bounded by read-only, low-rate, no bypass, no secret leakage |
| Stealth/evasion | No stealth tooling; stop on security challenges |
| Live CI tests | No live LinkedIn tests in CI |
| Brand voice | Reusable template + brand-profiler skill; seed `amit-tiwari-site` from existing content corpus |
| Shared package extraction | Defer until a second source/brand proves abstractions |

## 3. Problem

LinkedIn saved posts are high-intent signals: Amit saved them because they contain useful framing, examples, contrarian ideas, workflows, prompts, industry insight, or emotional resonance. LinkedIn's native saved-items UX is poor for retrieval, searching, sorting, tagging, synthesis, and repurposing.

Manual copy/paste loses context and does not scale. Official LinkedIn APIs do not provide a first-class saved-posts endpoint. LinkedIn account export includes saved-item URLs and saved dates, but not enough content for idea generation. Browser/session capture provides the best completeness for a personal local workflow.

The product must convert a messy personal saved queue into structured evidence and then into useful content ideas across any configured destination. One LinkedIn save might become an Amit Tiwari site essay today, then later feed another site/brand when that brand profile exists. The source engine does not know or care which brand eventually uses the idea.

## 4. Goals

1. Capture LinkedIn saved posts/articles as completely as practical from Amit's logged-in account.
2. Normalize every save into a generic `RawSave` contract compatible with sibling/future saves engines.
3. Upsert raw saves into a Notion Raw Ingest database with stable dedupe keys.
4. Reconcile browser captures against LinkedIn account export to preserve saved dates and find missing/unavailable items.
5. Enrich saves with useful metadata: author, title, post text, article title, media hints, source URL, canonical URL, saved time, publish time when available, content hash, root/repost identity when available, and visibility state.
6. Classify saves into topics, entities, content angles, novelty, actionability, destination candidates, and brand fit.
7. Generate zero-to-many Content Idea records from each strong save.
8. Support multiple downstream destinations through user-provided brand profiles and surface templates, without hard-coding any brand/site into the LinkedIn adapter.
9. Keep browser credentials, session tokens, raw sensitive payloads, traces, and snapshots local and out of git, logs, Notion, and cloud storage by default.
10. Make runs idempotent, resumable, auditable, low-rate, dry-run capable, and safe-by-default.

## 5. Non-goals

- Do not build a SaaS product in v1.
- Do not support multiple users in v1.
- Do not post, like, comment, save, unsave, follow, connect, message, subscribe, publish, or otherwise mutate LinkedIn.
- Do not bypass account security challenges, CAPTCHA, login checks, or suspicious-account prompts.
- Do not use stealth/evasion tooling.
- Do not store cookies, auth headers, CSRF tokens, bearer tokens, raw browser storage, HAR files, or full request/response headers in Notion, git, committed fixtures, normal logs, or cloud storage.
- Do not run live LinkedIn automation in CI.
- Do not make the LinkedIn repo a permanent all-source monolith if a shared package/repo becomes justified after another source or brand-profile use case proves the abstraction.
- Do not auto-publish generated content.
- Do not blindly copy substantial third-party source text into publishable drafts.

## 6. Users and personas

### Primary user: Amit

- Saves content on LinkedIn while browsing normally.
- Wants saved items to become searchable, structured, and useful for content ideation.
- Wants flexible routing: one LinkedIn save can inspire content for any configured brand/site/surface.
- Accepts platform risk for personal local use with a logged-in session, but still needs credential hygiene.
- Wants high content quality over perfect platform-compliance comfort.

### Future optional user: technical clone user

- Runs locally against their own logged-in browser/session.
- Owns their own platform risk and credentials.
- Configures their own Notion database and brand profiles.
- Must not receive Amit-specific schema, prompts, saves, screenshots, fixtures, cookies, or content snapshots.

### Future optional user: content operator

- Reviews generated ideas in Notion.
- Filters by destination/brand/status.
- Approves, rejects, edits, clusters, and routes ideas.
- Traces every idea back to source evidence.

## 7. Source/API reality as of 2026-06-06

- LinkedIn's UI supports saving posts/articles and viewing saved posts/articles in Saved Items.
- LinkedIn account data export includes `Saved Items`, described as saved date and URL of a post, article, or other content.
- LinkedIn's open API permissions do not include a saved-items read endpoint. Open consumer permissions cover sign-in/profile/email and `w_member_social`; reading member posts through the Posts API requires `r_member_social`, which is restricted.
- LinkedIn explicitly discourages/prohibits scraping/automation in its user agreement/help docs. This product accepts that risk for Amit's personal local use, but still minimizes writes, load, challenge behavior, and credential exposure.

Useful references:

- LinkedIn saved content help: https://www.linkedin.com/help/learning/answer/a527126
- LinkedIn account data export: https://www.linkedin.com/help/linkedin/answer/a1339364
- LinkedIn API access and permissions: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- LinkedIn Posts API permissions: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- LinkedIn prohibited software/extensions: https://www.linkedin.com/help/linkedin/answer/a1341387

## 8. Success metrics

### MVP capture and ingest metrics

- For a 50-save initial run, capture at least 90% as non-duplicate raw records or explicit unavailable/tombstone records.
- Enrich at least 70% of captured records to `partial` or better completeness.
- Re-running the same capture creates zero duplicate Notion rows.
- LinkedIn export reconciliation can add saved dates and detect export-only/missing records.
- Normal logs, Notion writes, git files, and fixtures contain zero cookies, auth headers, CSRF tokens, bearer tokens, raw browser storage, or unredacted sensitive payloads.

### MVP content metrics

- Generate at least 20 reviewable idea candidates from the initial 50-save run.
- Every generated idea has destination, brand, format, hook, thesis, outline, source relation, and evidence snippets.
- Weak/off-brand/duplicate saves can produce zero ideas rather than forced low-quality outputs.
- Ideas can be filtered by destination and status in Notion.

### Operational metrics

- Dry-run clearly shows planned inserts/updates/skips before writes.
- Run summary includes items seen/new/updated/skipped/failed, capture method distribution, completeness distribution, stop reason, and redaction status.
- Failures are resumable without recapturing everything.

## 9. Recommended v1 approach

Use a hybrid capture strategy optimized for completeness and content quality:

1. **Dedicated local browser profile**: launch a headed persistent browser profile controlled by Playwright/Chrome. Amit logs into LinkedIn manually once. Do not ask for passwords, cookies, CSRF tokens, or copied headers.
2. **Network-first extraction**: navigate to LinkedIn Saved Items and passively capture read-only network responses that contain saved item/post payloads.
3. **DOM fallback**: if private response shapes change or fields are incomplete, scroll the saved-items UI and extract visible card text, links, authors, media hints, and timestamps.
4. **Detail-page enrichment**: for incomplete or high-potential saves, open detail pages/read-only expansions with caps and rate limits.
5. **LinkedIn export reconciliation**: import LinkedIn's `Saved Items` export as a first-class backstop for saved date/URL and missing/unavailable items.
6. **Manual URL import fallback**: allow individual URLs for records missed by browser/export.
7. **Notion dry-run/upsert**: write normalized, redacted records to Notion Raw Ingest only when the user intentionally runs the write form of `sync`; keep `sync --dry-run` as the preview path.
8. **Classification and fanout**: produce Content Idea candidates for configured destinations.

### Why not official API first?

Official API access is insufficient for saved-item capture. Data export is stable but too thin for content ideation. Browser/network capture gives the best balance for a personal local engine.

## 10. Platform-risk posture

This is a personal local tool using Amit's own logged-in session. It is not guaranteed to comply with LinkedIn automation restrictions. The product intentionally limits behavior to read-only, low-rate capture and stops on security challenges.

Risk boundaries:

- No stealth/evasion tooling.
- No challenge bypass.
- No credential copying.
- No write actions.
- No high-volume crawling.
- No cloud browser sessions.
- No scheduled unattended runs until safety tests and manual flow are stable.

## 11. Functional requirements

### 11.1 Browser/session

- Create/use a dedicated persistent browser profile directory, gitignored by default.
- Launch headed browser by default.
- Prompt user to log in manually if LinkedIn session is absent/expired.
- Never request or store LinkedIn password, cookies, headers, CSRF tokens, or bearer tokens.
- Support advanced/debug attach to existing Chrome CDP session only behind explicit config.
- Stop immediately on login challenge, CAPTCHA, security warning, repeated 401/403/429, mutation prompt, suspicious account prompt, or unexpected write-like request.

### 11.2 Capture

- Open LinkedIn Saved Items from the logged-in local browser session.
- Capture all currently visible saved items and continue pagination/scrolling until no new items appear or a configured limit is reached.
- Prefer network payloads over DOM because they usually contain stable IDs and richer metadata.
- Fall back to DOM extraction when network payload signatures are unknown or incomplete.
- Support safe read-only expansion actions: “see more,” open detail page, expand text. Do not click reactions, comments, repost, save/unsave, follow, connect, message, subscribe, or publish controls.
- Extract/save author name, author URL/URN if available, headline/byline if visible, post text, article title, media type, document/video/image hints, publish timestamp if visible, saved timestamp if available, outbound links, hashtags, and visible engagement counts if naturally present.
- Capture repost/root identity when available.
- Normalize relative, shortened, tracking, and redirect URLs to canonical URLs where possible.
- Compute stable dedupe keys before Notion writes.
- Re-run without duplicate Notion rows.
- Record run summary: attempted count, created count, updated count, skipped count, error count, capture method mix, completeness distribution, stop reason.

### 11.3 Export reconciliation

- Provide export ingestion through the primary Instagram-style sync verb: `li-saves --env .env sync --export-path <archive-or-csv>`.
- Parse LinkedIn export `Saved Items` for saved date and URL.
- Match export rows to browser-captured records by platform ID when inferable, then canonical URL hash, then original URL hash.
- Preserve export-only rows as metadata-only/tombstone records.
- Browser record wins for rich content; export can fill `Saved At`, source URL, and reconciliation status.
- Never overwrite higher-completeness browser content with lower-completeness export-only data.

### 11.4 Enrichment

- Create `Content Hash` from normalized text + canonical URL + author/root identifier.
- Mark completeness: `full`, `partial`, `metadata_only`, `failed`.
- Track visibility state: `available`, `deleted`, `private`, `auth_required`, `blocked`, `unknown`.
- Derive topics, entities, content type, novelty score, actionability score, idea potential score, and destination candidates.
- Store source evidence snippets for idea generation.
- Store full text in local cache by default; store only summary/snippets in Notion by default.
- Avoid expanding comment threads in v1 except when the saved item itself is a comment or immediate comment context is already present.
- Capture engagement counts only if visible/present without extra actions; do not use them for dedupe.
- Do not download media files by default; store media type, thumbnail hints, alt text if present, and safe source media URLs/hashes.

### 11.5 Notion Raw Ingest

- Create or target a Notion Raw Ingest database.
- If database IDs are absent, bootstrap private workspace-level databases by default; if a parent page/database is configured, create under that parent.
- Validate schema before every write run.
- Upsert by `Dedup Key`.
- Maintain `First Ingested At` and `Last Seen At`.
- Preserve original URL and canonical URL.
- Store redacted safe metadata or raw payload hash, never credentials/raw headers.
- Track processing status: `New`, `Needs Enrichment`, `Enriched`, `Classified`, `Idea Created`, `Reviewed`, `Dropped`, `Error`, `Ignored`.
- Do not overwrite richer records with weaker captures unless explicit override.

### 11.6 Content Ideas

- Use a separate Notion Content Ideas database related to Raw Ingest.
- Score each raw save for idea potential.
- Generate zero-to-many ideas from each raw save.
- Support many-to-many source relations later; v1 can use one primary raw save plus optional related saves.
- Each idea must include evidence snippets and source relation(s).
- Ideas must be destination-aware and brand-aware, but destination config must live outside LinkedIn adapter.
- User can approve/reject/edit ideas in Notion.
- Rejections should not delete raw saves.

### 11.7 Commands / downstream surfaces

The engine exposes generic command packs, not one fixed output and not hard-coded brand commands:

```text
li-saves --env .env sync --dry-run --limit 50
li-saves --env .env sync --limit 50
li-saves --env .env fetch --limit 10 --format markdown
li-saves --env .env save-approved approved-ideas.json
li-saves --env .env drop-save SOURCE_PAGE_ID
li-saves --env .env doctor
li-saves --env .env setup:notion-schema
li-saves --env .env setup:notion-schema --write
```

The primary verbs intentionally mirror the Instagram Saves Engine:

- `sync`: capture/import source saves and write Raw Ingest when not dry-run.
- `fetch`: fetch `Processing Status = New` raw saves from Notion for agent review.
- `save-approved`: create Content Ideas from approved JSON and mark source saves `Reviewed`.
- `drop-save`: mark rejected source saves `Dropped`.

Legacy/developer aliases can exist, but docs and skills should prefer the Instagram-style verbs above.

Commands should read Raw Ingest + Content Ideas + Brand Voice profiles and produce briefs/drafts. They must not auto-publish in v1.

First seeded brand profile:

- `brand-voices/amit-tiwari-site.md`, seeded from `/Users/amittiwari/Projects/AmitTiwari/amittiwari-me-content-writer`.

Other brands/sites are created later by filling `brand-voices/brand-voice-template.md` manually or by running the reusable `brand-voice-profiler` skill on sample content.

## 12. Non-functional requirements

- **Local-first**: browser sessions, cookies, raw capture artifacts, snapshots, screenshots, traces, and caches stay local.
- **Read-only LinkedIn behavior**: only read/navigate/expand; no mutations.
- **Dry-run default**: preview planned Notion changes before writing.
- **Idempotency**: repeat runs update existing records.
- **Resumability**: store cursors/checkpoints locally.
- **Redaction**: strip cookies, authorization, CSRF, set-cookie, bearer-like tokens, request IDs when sensitive, account identifiers where unnecessary, and personal query params from logs/writes.
- **Low load**: one browser context, small concurrency, jitter, backoff, stop on throttling/challenge.
- **Auditability**: clear local run logs with counts and hashes, no secrets.
- **Testability**: adapter contract tests from sanitized/synthetic fixtures.
- **Portability**: schema and canonical model should also work for future saves engines.
- **No live CI against LinkedIn**: live smoke tests are manual/local only.

## 13. Storage policy

Default policy:

```text
Notion: summary + snippets + safe metadata + local snapshot pointer
Local cache: full accessible text snapshot when captured, gitignored, redaction-aware, encryption-capable
Git/fixtures: synthetic or aggressively sanitized only
Logs: no secrets, no raw headers, no raw payload dumps
```

Supported storage modes:

- `metadata_only`: no full text in Notion or local cache.
- `summary_and_snippets`: summary plus short evidence snippets in Notion; full text local cache if captured. **Default.**
- `full_text_public_only`: full text in Notion only for clearly public/free pages; private/limited content local-only.
- `full_text_all_accessible`: full text in Notion for everything accessible to session. Not recommended; requires explicit config.

Rationale: content quality needs access to source text, but Notion should not become a broad third-party/private-content archive by default.

## 14. Proposed canonical model

```ts
type RawSave = {
  sourcePlatform: "linkedin";
  sourceAdapter: "linkedin-browser-saved-v1" | "linkedin-export-v1" | "linkedin-manual-v1";
  sourceItemId?: string;
  rootItemId?: string;
  isRepost?: boolean;
  dedupKey: string;
  canonicalUrl?: string;
  originalUrl: string;
  captureMethod: "network" | "dom" | "detail" | "export" | "manual" | "mixed";
  captureCompleteness: "full" | "partial" | "metadata_only" | "failed";
  visibilityState: "available" | "deleted" | "private" | "auth_required" | "blocked" | "unknown";
  storagePolicy: "metadata_only" | "summary_and_snippets" | "full_text_public_only" | "full_text_all_accessible";
  processingPriority: "high" | "normal" | "low" | "ignored";
  savedAt?: string;
  publishedAt?: string;
  firstIngestedAt: string;
  lastSeenAt: string;
  title?: string;
  textSnapshot?: string;
  excerpt?: string;
  sourceSummary?: string;
  evidenceSnippets: string[];
  authorName?: string;
  authorHandle?: string;
  authorUrl?: string;
  contentType: "post" | "article" | "document" | "video" | "image" | "poll" | "comment" | "unknown";
  outboundUrls: string[];
  mediaUrls: string[];
  mediaTypes: string[];
  hashtags: string[];
  engagement?: {
    reactions?: number;
    comments?: number;
    reposts?: number;
    capturedAt: string;
  };
  topics?: string[];
  entities?: string[];
  destinationCandidates?: string[];
  brandProfileCandidates?: string[];
  brandFit?: Record<string, number>;
  ideaPotentialScore?: number;
  noveltyScore?: number;
  actionabilityScore?: number;
  contentHash?: string;
  rawPayloadHash?: string;
  localSnapshotPath?: string;
  exportReconciledAt?: string;
  errorCode?: string;
  errorMessage?: string;
};
```

## 15. Dedupe and identity rules

Preferred `Dedup Key` order:

```text
linkedin:<sourceItemId>
linkedin:url:<sha256(canonicalUrl)>
linkedin:export:<sha256(originalUrl)>
```

Rules:

- Prefer stable platform IDs over URLs.
- Keep both saved instance identity and root item identity when reposts are involved.
- Default dedupe by saved instance, not root item, because repost commentary can be content-relevant.
- Strip obvious tracking params (`trk`, `utm_*`, etc.) but preserve LinkedIn URN/activity/share/article identifiers.
- Same dedupe key updates same row and changes `Content Hash`; it does not create a new row.
- Export/browser duplicates merge into one row; richer browser capture wins except export can fill `Saved At`.

## 16. Notion Raw Ingest schema

| Property | Type | Purpose |
|---|---|---|
| `Name` | Title | Best title or post excerpt fallback |
| `Source Platform` | Select | `LinkedIn`, future sources |
| `Source Adapter` | Rich text | Adapter and version |
| `Source Item ID` | Rich text | URN/activity/share/article ID when available |
| `Root Item ID` | Rich text | Root post/article ID for reposts/shares |
| `Is Repost` | Checkbox | Whether saved item is a repost/share instance |
| `Dedup Key` | Rich text | Stable uniqueness key |
| `Canonical URL` | URL | Clean URL |
| `Original URL` | URL | Captured/exported URL |
| `Capture Method` | Select | `network`, `dom`, `detail`, `export`, `manual`, `mixed` |
| `Capture Completeness` | Select | `full`, `partial`, `metadata_only`, `failed` |
| `Visibility State` | Select | `available`, `deleted`, `private`, `auth_required`, `blocked`, `unknown` |
| `Storage Policy` | Select | `metadata_only`, `summary_and_snippets`, `full_text_public_only`, `full_text_all_accessible` |
| `Processing Priority` | Select | `high`, `normal`, `low`, `ignored` |
| `Content Type` | Select | `post`, `article`, `document`, `video`, `image`, `poll`, `comment`, `unknown` |
| `Author Name` | Rich text | Author/person/company |
| `Author Handle` | Rich text | Handle/slug/URN if known |
| `Author URL` | URL | Profile/company URL |
| `Published At` | Date | Original publish date/time if known |
| `Saved At` | Date | Save date/time if known/exported |
| `First Ingested At` | Date | First ingest time |
| `Last Seen At` | Date | Last successful capture/reconciliation |
| `Processing Status` | Status | `New`, `Needs Enrichment`, `Enriched`, `Classified`, `Idea Created`, `Reviewed`, `Dropped`, `Error`, `Ignored` |
| `Content Hash` | Rich text | Normalized content hash |
| `Raw Payload Hash` | Rich text | Redacted raw payload hash only |
| `Local Snapshot Path` | Rich text | Local file pointer, not uploaded content |
| `Source Summary` | Rich text | Neutral summary of source |
| `Evidence Snippets` | Rich text | Short snippets for review/ideas |
| `Outbound URLs` | Rich text | Safe list/summary of outbound URLs |
| `Media Types` | Multi-select | `image`, `video`, `document`, etc. |
| `Hashtags` | Multi-select | Hashtags when present |
| `Topics` | Multi-select | Inferred topics |
| `Entities` | Multi-select/Rich text | People/companies/products/concepts |
| `Destination Candidates` | Multi-select | Surface candidates such as `website_article`, `linkedin_post`, `newsletter_note` |
| `Brand Profile Candidates` | Multi-select/Rich text | Candidate brand profile IDs, e.g. `amit-tiwari-site` |
| `Top Brand Fit Score` | Number | Best 0–100 fit score across configured brand profiles |
| `Brand Fit Scores` | Rich text | Safe compact map of brand profile ID to score |
| `Idea Potential Score` | Number | 0–100 |
| `Novelty Score` | Number | 0–100 |
| `Actionability Score` | Number | 0–100 |
| `Recommended Next Action` | Select | `generate_idea`, `cluster`, `wait`, `ignore`, `manual_review` |
| `Export Reconciled At` | Date | Last LinkedIn export reconciliation |
| `Adapter Run ID` | Rich text | Local run ID |
| `Error Code` | Rich text | Redacted machine-readable error |
| `Error Message` | Rich text | Redacted short message |
| `Retry Count` | Number | Retry count |
| `Content Ideas` | Relation | Related ideas |

### Raw Ingest page body

Each raw save page should include:

1. `Source Snapshot`: title, author, URL, timestamps, capture method.
2. `Source Summary`: neutral summary.
3. `Evidence Snippets`: short snippets only by default.
4. `Why This Was Probably Saved`: inferred value/angle.
5. `Redacted Metadata`: safe JSON-ish metadata, no headers/tokens/cookies.
6. `Local Snapshot`: path/pointer if full text is stored locally.
7. `Capture Notes`: completeness, visibility, errors, retries.

## 17. Content Ideas schema

A raw save is source evidence, not a final idea. One save may fan out into multiple idea records across brands and channels.

| Property | Type | Purpose |
|---|---|---|
| `Name` | Title | Idea headline/title |
| `Primary Raw Save` | Relation | Main source raw record |
| `Source Saves` | Relation | Optional supporting saves for clusters |
| `Brand Profile ID` | Select/Rich text | Configured profile ID, e.g. `amit-tiwari-site` |
| `Brand Name` | Rich text | Human-readable brand/site name |
| `Surface ID` | Select | `website_article`, `linkedin_post`, `newsletter_note`, `essay`, future surfaces |
| `Brand Voice Version` | Rich text | Version/date/hash of brand profile used |
| `Format` | Select | `essay`, `post`, `thread`, `carousel`, `newsletter section`, `research note`, `script` |
| `Audience` | Rich text/Select | Intended reader |
| `Hook` | Rich text | Opening angle |
| `Thesis` | Rich text | Core claim |
| `Outline` | Page body/Rich text | Structured outline |
| `Source Evidence` | Rich text | Short source-grounded snippets/links |
| `Novelty Score` | Number | 0–100 |
| `Fit Score` | Number | 0–100 |
| `Confidence` | Number | 0–100 |
| `Status` | Status | `Generated`, `Needs Review`, `Approved`, `Drafting`, `Shipped`, `Rejected` |
| `Rejection Reason` | Rich text/Select | Review feedback |
| `Created At` | Date | Idea creation time |
| `Updated At` | Date | Last update time |
| `Shipped URL` | URL | Final published URL when available |

Quality bar for generated ideas:

- clear audience
- concrete thesis
- non-generic hook
- destination-specific framing
- source-grounded evidence
- why-now/why-this-matters angle
- fit/confidence scores
- traceable raw-save relation

### 17.1 Brand voice profiles

Brand profiles are reusable content rules that make this LinkedIn source engine useful for any site/brand without embedding brand logic in capture code. A profile defines audience, point of view, voice, topic boundaries, surface templates, selection rules, and quality checks.

Project artifacts:

- `brand-voices/brand-voice-template.md` — user-fillable template.
- `brand-voices/amit-tiwari-site.md` — seeded v1 profile from Amit's existing content corpus.
- `skills/brand-voice-profiler/` — reusable agent skill for generating a brand profile from sample content. Also installed globally at `~/.agents/skills/brand-voice-profiler` for reuse in future projects.

Rules:

- Brand profiles affect enrichment, scoring, idea generation, and drafting only.
- LinkedIn capture, dedupe, export import, and RawSave normalization cannot depend on brand profiles.
- Multiple brand profiles can be active in one run.
- A raw save can be high-fit for zero, one, or many brand profiles.
- A brand profile should cite its sample paths and avoid copying long source passages.
- Generated Content Ideas must store the `Brand Profile ID` and `Brand Voice Version` used.

## 18. Architecture

```text
Local machine
  |
  |-- Dedicated headed browser profile
  |     |
  |     +-- LinkedIn Saved Items UI
  |            |
  |            +-- read-only network capture
  |            +-- DOM/list extraction
  |            +-- detail-page enrichment
  |
  |-- LinkedIn adapter
  |     |
  |     +-- session manager
  |     +-- saved-items navigator
  |     +-- network collector/parser
  |     +-- DOM collector/parser
  |     +-- export importer
  |     +-- normalizer
  |
  |-- Core
  |     |
  |     +-- RawSave schema/runtime validation
  |     +-- URL canonicalization
  |     +-- dedupe
  |     +-- redaction
  |     +-- write-method guard
  |     +-- run state/cache
  |
  |-- Notion sync
  |     |
  |     +-- schema bootstrap/validation
  |     +-- dry-run planner
  |     +-- idempotent upsert
  |
  |-- Enrichment + ideas
        |
        +-- classifier/scorer
        +-- destination profiles
        +-- idea generator
        +-- command packs
```

Recommended code layout:

```text
src/
  adapters/linkedin/
    capture/
    parsers/
    dom/
    network/
    export/
  core/
    raw-save.ts
    dedupe.ts
    canonical-url.ts
    redaction.ts
    run-state.ts
    write-guard.ts
  notion/
    schema.ts
    mapper.ts
    upsert.ts
  enrichment/
  ideas/
  cli/
fixtures/
  synthetic/
  sanitized/
docs/
```

## 19. Data flow

1. `Discover`: open Saved Items and identify candidate count/new items where possible.
2. `Capture`: collect structured network data and DOM fallback data.
3. `Detail Enrich`: selectively open incomplete/high-value items under cap.
4. `Normalize`: convert to canonical `RawSave` records.
5. `Redact`: sanitize all logs/storage-bound metadata.
6. `Deduplicate`: compute dedupe keys and content hashes.
7. `Reconcile Export`: merge LinkedIn export saved dates/URLs and create export-only tombstones.
8. `Dry-run`: show planned Notion inserts/updates/skips.
9. `Upsert`: write raw-ingest records only when explicitly configured.
10. `Enrich`: summarize, tag, score, classify.
11. `Fanout`: generate destination idea records.
12. `Review`: human reviews ideas in Notion.

## 20. Safety and credential controls

### 20.1 Credential handling

- Use the user's existing authenticated state inside a dedicated local browser profile.
- Do not ask user to paste cookies, headers, tokens, passwords, or browser storage.
- Do not log cookies, headers, request bodies, auth tokens, CSRF tokens, session IDs, or raw payloads.
- Store Notion API token in local environment/keychain only.
- Never write secrets to git, Notion, logs, screenshots, fixtures, traces, HAR files, or cloud storage.
- `.env`, browser profiles, caches, screenshots, traces, HAR files, snapshots, and raw payload dumps must be gitignored.

### 20.2 Read-only adapter behavior

- Allow only safe read/navigation/expand operations.
- Monitor requests and fail closed on unexpected `POST`, `PUT`, `PATCH`, `DELETE`, or mutation-like calls to LinkedIn, except explicitly allowlisted browser mechanics after verification.
- Never click save/unsave, like, comment, repost, follow, connect, message, subscribe, delete, edit, publish, or confirmation controls.
- Treat unexpected modals or confirmation prompts as stop conditions.

### 20.3 Rate limiting and platform risk

- One browser context by default.
- Human-scale scrolling cadence with jitter.
- Exponential backoff on errors/rate limits.
- Configurable item/page cap.
- Stop on login challenge, CAPTCHA, repeated 401/403/429, suspicious-account prompt, or account-state warning.
- Prefer incremental re-runs over aggressive full recrawls after initial backfill.

### 20.4 Redaction and observability

- Central redaction function applied to every log/event/error before output.
- Store route classes and status codes, not raw headers/full URLs with sensitive params.
- Hash raw payloads instead of storing them where possible.
- Provide run summary without secrets.
- Screenshots/traces disabled by default; debug mode warns and stores them only in gitignored local paths.

## 21. Testing and fixture requirements

Non-negotiable tests before first real Notion write:

- Dedupe key tests.
- URL canonicalization tests.
- Redaction tests.
- Notion schema validation tests.
- Notion mapping/upsert planner tests.
- Dry-run diff tests.
- Write-method guard tests.
- Runtime schema validation tests.
- Export importer merge tests.
- Parser tests from synthetic/sanitized network and DOM fixtures.

Fixture matrix:

1. Text post.
2. Article save.
3. Repost with commentary.
4. Document post.
5. Video post.
6. Image/carousel-like post.
7. Poll post.
8. Saved comment/immediate comment context.
9. Deleted/unavailable save.
10. Private/auth-required save.
11. Export-only URL.
12. Duplicate URL with tracking params.
13. Network schema changed/missing fields.
14. DOM-only fallback card.
15. Long post requiring “see more.”
16. Outbound link post.
17. Rate-limit/challenge stop-state fixture.
18. Mutation-request guard fixture.

Fixture safety:

- Prefer synthetic fixtures.
- If real captures are needed, sanitize names, profile URLs, images, cookies, headers, account identifiers, post text if private, payload IDs, and URLs where sensitive before commit.
- Run a secret scan across repo/logs/fixtures.
- Live LinkedIn smoke tests are manual/local only and excluded from CI.

## 22. MVP acceptance criteria

### 22.1 Capture

- User can run local LinkedIn capture against a dedicated logged-in browser profile.
- Adapter reaches LinkedIn Saved Items without requesting pasted cookies.
- Adapter captures visible saved items by network response when available.
- Adapter falls back to DOM extraction when network parsing fails or fields are missing.
- Adapter selectively enriches detail pages under cap for incomplete/high-potential records.
- Adapter scrolls/pages until no new items are found or configured run cap is reached.
- Adapter records capture method, completeness, visibility state, storage policy, and run ID per item.

### 22.2 Export reconciliation

- User can import LinkedIn `Saved Items` export.
- Export rows merge with browser records without duplicates.
- Export-only rows become metadata-only/tombstone records.
- Saved dates from export populate matching records.

### 22.3 Notion raw ingest

- Bootstrap command can create Raw Ingest and Content Ideas databases if IDs are absent.
- Schema validation runs before writes.
- Records are idempotently upserted by `Dedup Key`.
- Re-running same capture does not duplicate rows.
- Dry-run mode shows inserts/updates/skips before writes.

### 22.4 Enrichment and fanout

- Enriched records get summary, evidence snippets, inferred tags, quality/novelty/actionability scores, brand-profile candidates, and surface candidates.
- High-signal saves can generate multiple destination idea candidates for any configured brand profile.
- Weak saves can generate zero ideas.
- Ideas are linked back to raw saves.
- Brand voice and surface definitions are config-driven.
- No site/brand-specific logic exists in LinkedIn capture.

### 22.5 Safety

- No cookies, auth headers, session IDs, CSRF tokens, bearer tokens, raw browser storage, HAR files, or raw sensitive payloads appear in logs, Notion, committed files, fixtures, or error messages.
- Adapter never performs intentional LinkedIn write actions.
- Write-method guard fails closed on unexpected mutation requests.
- Rate limiting/backoff exists and is enabled by default.
- Local session/cache/snapshot/debug paths are excluded from git.
- Stop conditions trigger on login challenge, CAPTCHA, repeated auth failures/rate limits, mutation prompts, or account warnings.

## 23. Initial milestone plan

### Milestone 1: Docs, contracts, and schema

- PRD v3 accepted.
- Brand voice template, brand-profiler skill, and `amit-tiwari-site` seed profile exist.
- Create code-level `RawSave` schema/runtime validation.
- Create Notion schema config for Raw Ingest + Content Ideas.
- Add `.gitignore` for local credentials/caches/profiles/snapshots/traces.
- Add redaction and secret-scan baseline.

### Milestone 2: Export importer and dry-run planner

- Parse LinkedIn export `Saved Items`.
- Canonicalize URLs and compute dedupe keys.
- Plan Notion upserts in dry-run output.
- Test duplicate/export-only/unavailable cases.

### Milestone 3: Browser capture proof of concept

- Headed persistent profile login flow.
- Saved Items navigation.
- Network-first capture.
- DOM fallback capture.
- Write-method guard.
- Local JSON dry-run output.

### Milestone 4: Notion sync

- Bootstrap/validate databases.
- Idempotent raw-save upsert.
- Run summary.
- No-secret verification.

### Milestone 5: Enrichment and content ideas

- Summary/snippets/local snapshot policy.
- Topic/entity/destination scoring.
- Content Ideas fanout.
- Generic command packs using brand profile ID + surface ID.

### Milestone 6: Hardening and docs

- Fixture matrix.
- Regression tests.
- Troubleshooting docs.
- Manual smoke-test guide.
- Optional scheduling guidance after safety stable.

## 24. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| LinkedIn changes web routes/endpoints | Capture breaks | Network parser abstraction, DOM fallback, fixtures, clear failure messages |
| DOM selectors change | Partial/failing capture | Semantic extraction, multiple selectors, completeness scoring |
| Accidental credential leakage | Severe | Central redaction, no HAR dumps by default, gitignore, secret scans, tests |
| Accidental write action | Account/platform risk | Request write guard, no mutation clicks, fail-closed prompts |
| Platform challenge/throttling | Capture blocked/account risk | Low rate, jitter, caps, stop conditions |
| Full/private content stored too broadly | Privacy/copyright risk | Summary/snippets Notion default; local-only full cache |
| Duplicate records | Notion clutter/bad fanout | Stable dedupe key, canonicalization, export merge tests |
| Low-quality generic ideas | Product not useful | Evidence-grounded generation, destination scoring, rejection feedback |
| Overfitting to LinkedIn | Hard future sources | Canonical model and adapter boundary from day one |
| Notion schema drift | Sync failures | Schema validation/bootstrap/migration notes |
| Local cache grows sensitive/stale | Privacy/disk risk | TTL cleanup, clear-cache command, encryption-capable storage |
| Official API expands later | Missed simpler path | Adapter interface swappable; periodically reassess docs |

## 25. Open questions requiring Amit

No blocking open questions remain for the PRD.

Resolved defaults:

- Brand model: generic brand voice template + reusable `brand-voice-profiler` skill.
- First seeded profile: `brand-voices/amit-tiwari-site.md`, inferred from `amittiwari-me-content-writer`.
- Other brands/sites: create later by filling `brand-voices/brand-voice-template.md` or running the brand-profiler skill on samples.
- Tiny Trauma: not included in this project; it can use the same template/skill in a future fork/project.
- Notion parent: create private workspace-level databases unless config provides a parent.
- Full-text storage: local full snapshot cache, Notion summary/snippets only.
- First run: `--limit 50` for quick value, then full backfill/reconciliation.
- Shared package: defer until a second source/brand proves abstractions.

## 26. First implementation sequence

Build in this order:

1. Project scaffold and `.gitignore` for local/session/cache/debug artifacts.
2. Core `RawSave`, dedupe, canonicalization, redaction, write guard, run-state.
3. Notion schema bootstrap/validation and dry-run upsert planner.
4. LinkedIn export importer and reconciliation tests.
5. Playwright headed persistent-profile capture with dry-run JSON output.
6. Network parser + DOM fallback + fixture tests.
7. Notion idempotent upsert.
8. Enrichment, scoring, local snapshot policy.
9. Content Ideas generation using brand profiles and generic destination command packs.
10. Safety hardening, docs, manual smoke test, secret scan.

Do not start with model-based idea generation. Start with capture correctness, redaction, dedupe, and Notion integrity. Idea generation becomes valuable only when raw evidence is trustworthy.
