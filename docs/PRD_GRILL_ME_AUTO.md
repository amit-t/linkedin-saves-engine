# LinkedIn Saves Engine — Deep Grill Me Auto

Status: PRD v3 brand-profile defaults applied
Mode: deep / auto-filled / resolved
Source PRD: `docs/PRD.md`
Generated: 2026-06-06
Owner: Amit Tiwari
Repo: `linkedin-saves-engine`

## 0. What this document does

This is the non-interactive deep grill of the LinkedIn Saves Engine PRD. Each question is answered with the recommended product/design decision unless the decision genuinely needs Amit-specific input. Open items are isolated in section 16.

Working premise from Amit:

- Optimize capture completeness and content usefulness first.
- Platform risk is acceptable for a personal local project using Amit's own logged-in session/token.
- This is not a SaaS v1 and not an open-source-first product.
- Source capture in this repo is LinkedIn-only.
- Raw source data lands in a Notion Raw Ingest database, then feeds a separate Content Ideas layer.
- Saves can fan out to any configured site/brand/surface through reusable brand voice profiles. No destination brand is hard-coded into the LinkedIn adapter.

Reference facts checked for this grill:

- LinkedIn Help confirms saved posts/articles can be viewed from Saved Items.
- LinkedIn account data export includes `Saved Items` with saved date and URL.
- LinkedIn API open permissions do not include a saved-items read endpoint; `r_member_social` is restricted for reading member posts.
- LinkedIn explicitly prohibits third-party software/bots/crawlers/extensions that scrape or automate LinkedIn.

Sources:

- LinkedIn saved content help: https://www.linkedin.com/help/learning/answer/a527126
- LinkedIn account data export: https://www.linkedin.com/help/linkedin/answer/a1339364
- LinkedIn API access: https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access
- LinkedIn Posts API: https://learn.microsoft.com/en-us/linkedin/marketing/community-management/shares/posts-api
- LinkedIn prohibited software/extensions: https://www.linkedin.com/help/linkedin/answer/a1341387

## 1. Executive verdict

The PRD is directionally right. Recommended shape stands:

```text
local authenticated browser capture
  -> network-first extraction
  -> DOM fallback
  -> LinkedIn export fallback
  -> canonical RawSave
  -> Notion Raw Ingest
  -> enrichment/classification
  -> separate Content Ideas database
  -> generic command packs using brand profile + surface
```

These fixes have been applied to `docs/PRD.md` in PRD v3:

1. Platform risk accepted but bounded: personal/local/read-only/low-rate/no credential leakage/no account-security bypass.
2. Notion split into two databases from day one: Raw Ingest and Content Ideas.
3. Default full-text policy is `summary_and_snippets` in Notion plus local full snapshot cache.
4. Dedicated persistent browser profile is default.
5. Hard stop conditions are explicit: login challenge, CAPTCHA, mutation prompt, repeated 401/403/429, suspicious account warning.
6. LinkedIn export is a first-class reconciliation command.
7. Quality gates and fixture matrix are required before real Notion writes.
8. Destination/brand logic stays outside LinkedIn adapter.
9. Reusable brand voice template + `brand-voice-profiler` skill added; `amit-tiwari-site` seeded from existing content corpus.

## 2. Product boundary grill

### Q1. Is this repo a LinkedIn-only adapter or the whole generic saves platform?

Recommended answer: LinkedIn-specific adapter plus enough local orchestration to prove the generic contract. Do not build a multi-source monolith here. Keep canonical model, Notion mappings, and brand-profile mechanics repo-local first; extract shared packages only after another source/brand proves the abstraction.

Rationale: Premature shared-core extraction creates abstraction debt. Source capture must still output a generic `RawSave` contract so future engines can align.

PRD amendment: Add “this repo may temporarily contain shared contracts, but source-specific code must remain isolated under a LinkedIn adapter boundary.”

### Q2. Is the product goal archival search, content ideation, or both?

Recommended answer: content ideation first, archival search second. The raw database should be searchable, but schema and enrichment optimize for downstream idea quality.

Rationale: User explicitly said optimize for content. Search is a side effect of good ingest.

PRD amendment: Success metrics should weight “ideas generated and approved” higher than “saved items archived.”

### Q3. What is the primary success metric for MVP?

Recommended answer: For a sample run of 50 saved LinkedIn items, capture at least 90% as non-duplicate raw records, enrich at least 70% to `partial` or better, and produce at least 20 reviewable content ideas with evidence links and destination labels.

Rationale: Pure capture count can succeed while content output fails. MVP must prove ingest-to-idea usefulness.

### Q4. Is “all historical saves” required for MVP?

Recommended answer: MVP should support full backfill but not require perfect historical completion. First target: capture current Saved Items UI until exhaustion or configured cap, then reconcile with LinkedIn export.

Rationale: Historical saved items may include deleted/private/unavailable posts. Export helps identify misses, but browser capture quality varies.

### Q5. Should the engine preserve deleted/unavailable saves?

Recommended answer: Yes. Create metadata-only tombstone records when export/browser shows a saved URL but content is unavailable.

Rationale: The absence is useful: it prevents rework, explains gaps, and supports audit.

### Q6. Should any site/brand logic appear anywhere in LinkedIn capture?

Recommended answer: No. Sites/brands are represented only as brand voice profiles used by enrichment, scoring, ideation, and drafting. They must not affect capture, raw schema, dedupe, export import, or RawSave normalization.

Rationale: User wants a LinkedIn source engine that can serve any configured site/brand.

## 3. Platform/API reality grill

### Q7. Is official LinkedIn API viable for saved items?

Recommended answer: No. Keep official API out of v1 capture path. Use it only if future docs add saved-items access or if approved API access becomes available for a specific enrichment use case.

Rationale: Current open permissions cover profile/email/sign-in and writing social actions. Saved-items reading is not exposed. Posts API read permissions are restricted.

### Q8. Is LinkedIn account export viable as primary source?

Recommended answer: No. Export is a high-integrity URL/date backstop, not the primary source. It lacks enough post text, author, media, and contextual fields for content ideation.

Rationale: Export gives `Saved Items` saved date and URL. Good for reconciliation; weak for content.

### Q9. Is browser automation the correct v1 source?

Recommended answer: Yes, with explicit risk posture. Browser automation is the only path that can retrieve the user's actual saved content with enough richness for ideation.

Rationale: User accepts platform risk. The design should reduce risk, not pretend it is compliant.

### Q10. Should the PRD say “use logged-in token” or “use logged-in browser session”?

Recommended answer: Say “logged-in browser session.” Avoid token-copy workflows.

Rationale: Tokens imply extracting/copying secrets. Browser session means user authenticates normally; automation rides an isolated local browser context.

### Q11. Should undocumented LinkedIn internal API calls be replayed directly?

Recommended answer: Not in MVP. Capture network responses during browser navigation; do not independently replay private endpoints until a later controlled experiment.

Rationale: Passive capture is safer and easier to debug. Replaying internal endpoints raises credential handling and throttling risk.

### Q12. Should the adapter use “stealth” anti-detection tooling?

Recommended answer: No. Use low-rate human-scale navigation, not stealth evasion. Stop on challenge.

Rationale: Stealth tooling increases risk and can cross into bypass behavior. Personal local use should stay transparent and low load.

## 4. Browser/session design grill

### Q13. Should the engine attach to Amit's everyday Chrome profile?

Recommended answer: Default no. Use a dedicated persistent browser profile controlled by Playwright/Chrome where Amit logs into LinkedIn once. Allow advanced override to attach to an existing Chrome CDP session for debugging only.

Rationale: Dedicated profile isolates risk, avoids corrupting daily browsing state, and makes cache/session cleanup easier.

### Q14. Should the browser run headless?

Recommended answer: Default headed. Add headless only after capture is stable and safe.

Rationale: Headed mode lets user see login/challenges and reduces accidental hidden behavior.

### Q15. How should login be handled?

Recommended answer: Manual login in the dedicated browser profile. The tool should pause with instructions when not authenticated. It should never ask for LinkedIn password, cookie, CSRF token, or auth header.

Rationale: Credential minimization.

### Q16. What are the browser stop conditions?

Recommended answer: Stop immediately on login challenge, CAPTCHA, security warning, 401/403 loop, 429, mutation confirmation, unexpected write request, or UI state that asks the user to verify identity.

Rationale: These are risk boundaries. The tool must fail closed.

### Q17. Should the tool click “See more” or expand posts?

Recommended answer: Yes, if visible and clearly read-only. It may click “see more,” open post detail pages, or expand text. It must not click reactions, comments, repost, save/unsave, follow, connect, message, or subscribe controls.

Rationale: Text expansion improves content quality; mutation controls are off-limits.

### Q18. Should it open every saved item detail page?

Recommended answer: Use two-phase capture. First capture list/network payload. Then enrich only incomplete/high-potential items through detail pages, with rate limit and cap.

Rationale: Opening every item may be slow and riskier. Many records may be complete from network payloads.

### Q19. Should mobile web be used?

Recommended answer: Desktop web first. Add mobile-viewport fallback only if desktop Saved Items misses classes of content.

Rationale: Desktop Saved Items is documented. Mobile paths add complexity.

## 5. Capture completeness grill

### Q20. What is the capture hierarchy?

Recommended answer:

1. Network payload fields from Saved Items/session navigation.
2. DOM card fields from Saved Items list.
3. Detail page DOM/network enrichment.
4. LinkedIn export URL/date reconciliation.
5. Manual URL import for leftovers.

Rationale: Richest to weakest, with graceful degradation.

### Q21. What counts as a “captured save”?

Recommended answer: A record with at minimum `sourcePlatform`, `sourceAdapter`, `canonicalUrl` or `sourceItemId`, `dedupKey`, `captureMethod`, `captureCompleteness`, `ingestedAt`, and source visibility/error state.

Rationale: Even failed content captures should be auditable.

### Q22. What is the minimum useful content record?

Recommended answer: Canonical URL + author/name if visible + title/excerpt/text snippet + savedAt if known + capture completeness + source evidence.

Rationale: Content idea generation needs at least context, not just URL.

### Q23. Should comments be captured?

Recommended answer: No for v1, except if the saved item itself is a comment or LinkedIn exposes the immediate comment context in the saved card. Do not expand comment threads.

Rationale: Comment threads multiply scope and platform load; saved post content is primary.

### Q24. Should reactions/engagement counts be captured?

Recommended answer: Capture if visible or present in network payload, but mark as volatile and never use for dedupe. Do not perform extra actions solely to fetch engagement.

Rationale: Engagement can help idea scoring but is unstable.

### Q25. Should media files be downloaded?

Recommended answer: No by default. Store media type, thumbnail hints, alt text if present, and source media URLs if safe. Add optional local media snapshot later.

Rationale: Downloading media adds storage, copyright, and sensitivity risk.

### Q26. Should external outbound links be resolved?

Recommended answer: Resolve only safe redirects needed for canonicalization, with a separate low-rate enrichment step. Do not fetch every external page by default.

Rationale: External pages may create unrelated scraping/copyright scope.

### Q27. How should inaccessible/deleted/private posts be handled?

Recommended answer: Store metadata-only rows with `Capture Completeness = failed` or `metadata_only`, `Error Code = unavailable/private/deleted/auth_required`, and retain canonical/source URL.

Rationale: Prevents silent gaps.

## 6. Dedupe and identity grill

### Q28. What should `Dedup Key` be?

Recommended answer:

```text
linkedin:<sourceItemId>
```

if a stable URN/activity/share/article id exists. Else:

```text
linkedin:url:<sha256(canonicalUrl)>
```

If only export row exists and URL is unresolved:

```text
linkedin:export:<sha256(originalUrl)>
```

Rationale: Prefer platform ID over URL; preserve export-only rows.

### Q29. Should reposts dedupe to root post or repost instance?

Recommended answer: Preserve both fields: `Source Item ID` for saved instance and `Root Item ID` when known. Default dedupe by saved instance, not root.

Rationale: A saved repost may contain the reposter's commentary, which is content-relevant.

PRD amendment: Add `Root Item ID` and `Is Repost` fields.

### Q30. Should canonical URLs strip tracking query params?

Recommended answer: Yes. Strip obvious tracking params (`trk`, `utm_*`, etc.) but preserve LinkedIn URN/activity/share/article identifiers.

Rationale: Reduces duplicates without losing identity.

### Q31. Should changed post text create a new row?

Recommended answer: No. Same dedupe key updates the row and stores changed `Content Hash`, `Last Seen At`, and optional version note.

Rationale: Saves represent source items. Content edits are versions, not new saves.

### Q32. How should duplicate saves from export + browser merge?

Recommended answer: Browser record wins for richness; export contributes `Saved At` and URL confirmation. Never overwrite richer browser content with export-only data.

Rationale: Export is authoritative for saved date but content-poor.

## 7. Notion model grill

### Q33. One Notion database or two?

Recommended answer: Two related databases from day one:

1. `Raw Ingest` — source-neutral evidence records.
2. `Content Ideas` — destination-aware idea records.

Rationale: Raw saves and ideas have different lifecycle, review, and cardinality. One raw save can create many ideas.

### Q34. Should Notion database be created by this engine?

Recommended answer: Yes. Provide a bootstrap command that creates databases if IDs are absent, and validates schema if IDs are provided.

Rationale: PRD says “new database inside Notion.” A bootstrap path prevents manual schema drift.

### Q35. What should Raw Ingest page body store?

Recommended answer: Store source summary, evidence snippets, safe metadata, capture notes, and local snapshot pointer. Do not store secrets or raw network payloads.

Rationale: Notion is review/search surface, not secret/raw payload storage.

### Q36. Should full third-party text go into Notion?

Recommended answer: Default no. Use `summary_and_snippets` in Notion and local full snapshot cache for AI processing. Permit `full_text_public_only` as opt-in. Avoid `full_text_all_accessible` unless Amit explicitly chooses it.

Rationale: Content quality needs access to text; privacy/copyright risk argues against putting everything in Notion.

### Q37. Should Raw Ingest include brand fit columns?

Recommended answer: Yes, but as generic scores/labels produced after classification, not capture-time source fields. Example: `Brand Profile Candidates`, `Top Brand Fit Score`, and `Brand Fit Scores`.

Rationale: Helpful for views and triage, but should not pollute adapter logic.

### Q38. Should Content Ideas relate to multiple raw saves?

Recommended answer: Yes. Start with one primary `Raw Save` relation, but allow many-to-many `Source Saves` later.

Rationale: Strong ideas may emerge from clusters, not single saves.

### Q39. Should content idea commands write drafts into Notion?

Recommended answer: For v1, write idea briefs/outlines to Notion, not full publish-ready drafts. Add explicit draft commands later.

Rationale: Keeps review loop tight and avoids low-quality bulk drafts.

## 8. Content ideation grill

### Q40. What is the unit of ideation?

Recommended answer: `RawSave` is evidence; `ContentIdea` is the ideation unit. One save can generate zero, one, or many ideas.

Rationale: Prevents every saved item becoming forced content.

### Q41. Should idea generation happen during capture?

Recommended answer: No. Capture and idea generation are separate pipeline stages. Capture can trigger downstream processing, but not block on it.

Rationale: Source capture should be robust and idempotent; model calls can be slower/noisier.

### Q42. How should destinations be configured first?

Recommended answer: Do not hard-code destination brands in the engine. Add a reusable brand voice/content rules template and a `brand-voice-profiler` skill that can infer a profile from sample content. Seed only one first-cut profile now: `amit-tiwari-site`, from `/Users/amittiwari/Projects/AmitTiwari/amittiwari-me-content-writer`.

Rationale: The engine only cares about LinkedIn as a source. Any site/brand should be added by profile, not by code.

### Q43. Should destination commands auto-publish?

Recommended answer: No. Commands generate briefs/drafts only. Human review/approval remains required.

Rationale: Avoids accidental publishing and protects brand quality.

### Q44. What should every generated idea contain?

Recommended answer: title, hook, thesis, audience, destination, brand, format, outline, evidence snippets, source relation, novelty score, fit score, confidence score, status, rejection reason field.

Rationale: Reviewable, traceable, and useful enough to draft.

### Q45. Should weak saves produce ideas?

Recommended answer: No. Weak saves should stay in Raw Ingest with `Idea Potential Score` and `Recommended Next Action = ignore/cluster/wait`.

Rationale: Forced fanout creates noise.

### Q46. Should ideas include direct source quotes?

Recommended answer: Short evidence snippets only, for private review. Generated publishable outputs should paraphrase, synthesize, and cite/link rather than copy.

Rationale: Avoids plagiarism/copyright problems and improves originality.

### Q47. Should the idea generator know source platform?

Recommended answer: Yes, as context. It should not assume LinkedIn destination just because source is LinkedIn.

Rationale: A LinkedIn save can become content for any configured profile/surface; the source platform does not determine the destination.

## 9. Risk and safety grill

### Q48. How should the PRD state platform risk?

Recommended answer: “This is a personal local tool using the user's own logged-in session. It is not guaranteed to comply with LinkedIn automation restrictions. The product intentionally limits behavior to read-only, low-rate capture and stops on security challenges.”

Rationale: Honest and bounded.

### Q49. Is read-only enough to eliminate platform risk?

Recommended answer: No. Read-only reduces risk but does not remove it. LinkedIn prohibits scraping/automation broadly.

Rationale: Avoid false safety claims.

### Q50. What secrets must never leave local machine?

Recommended answer: cookies, auth headers, CSRF tokens, bearer tokens, browser storage, HAR files, raw request/response headers, screenshots containing private account data, Notion token, and raw sensitive payloads.

Rationale: Credential leakage is the highest severity failure.

### Q51. Should logs include URLs?

Recommended answer: Logs can include canonical public URLs and hashed sensitive URLs. Strip query params and redact profile/account identifiers where unnecessary.

Rationale: URLs are useful for audit but can expose private context.

### Q52. Should screenshots/traces be enabled?

Recommended answer: Disabled by default. Enable only under `debug` with explicit local path, gitignored, and redaction warning.

Rationale: Screenshots leak account/feed data.

### Q53. Should the tool block write HTTP methods?

Recommended answer: Yes. Instrument request monitoring and fail on unexpected `POST`, `PUT`, `PATCH`, `DELETE` to LinkedIn, except explicitly allowlisted browser mechanics if proven harmless.

Rationale: Prevent accidental mutation.

### Q54. Should the tool randomize behavior?

Recommended answer: Use simple jitter/backoff, not stealth mimicry. Rate-limit to human-scale browsing.

Rationale: Jitter reduces load; stealth evasion increases ethical/platform risk.

## 10. Reliability and ops grill

### Q55. What CLI commands should exist?

Recommended answer:

```text
setup:notion-schema
capture:linkedin-saves --dry-run
capture:linkedin-saves --write
import:linkedin-export --path <archive>
enrich:raw-saves --dry-run
profile:brand:new --brand <brand-id>
profile:brand:seed --brand <brand-id> --samples <path...>
profile:brand:validate --brand <brand-id>
generate:ideas --brand <brand-id> --surface <surface-id> --dry-run
generate:content-brief --brand <brand-id> --surface <surface-id>
generate:draft --brand <brand-id> --surface <surface-id>
generate:idea-clusters --brand <brand-id>
generate:weekly-digest --brand <brand-id>
doctor
clear-cache
```

Rationale: Clear source, enrichment, fanout, and ops boundaries.

### Q56. Should dry-run be default?

Recommended answer: Yes. Any Notion write requires `--write` or explicit config.

Rationale: Safer iteration.

### Q57. How should progress be checkpointed?

Recommended answer: Local run state file keyed by run ID, adapter version, cursor/scroll position where available, seen dedupe keys, content hashes, and last successful timestamp.

Rationale: Long captures need resumability.

### Q58. What happens if Notion write fails mid-run?

Recommended answer: Retry with backoff for transient errors; persist planned upserts; resume idempotently. Do not recapture unnecessarily.

Rationale: Separates capture from storage reliability.

### Q59. Should scheduled runs exist in MVP?

Recommended answer: Not initially. Manual CLI first. Add macOS LaunchAgent/cron recipe after stable capture and redaction tests.

Rationale: Scheduled automation before safety hardening is premature.

### Q60. What run summary is required?

Recommended answer: items seen, new, updated, skipped, errors, completeness distribution, capture method distribution, Notion planned/written rows, redaction status, stop reason, and local log path.

Rationale: Auditability without secrets.

## 11. Testing grill

### Q61. What tests are non-negotiable before first real write?

Recommended answer:

- Dedupe key tests.
- URL canonicalization tests.
- Redaction tests.
- Notion mapping tests.
- Dry-run planner tests.
- Fixture parser tests for sanitized network/DOM samples.
- Write-method guard tests.

Rationale: These prevent the most expensive failures: duplicates, leaks, bad writes.

### Q62. What fixtures should exist?

Recommended answer:

1. Text post.
2. Article save.
3. Repost with commentary.
4. Document post.
5. Video post.
6. Image/carousel-like post.
7. Poll post.
8. Deleted/unavailable save.
9. Private/auth-required save.
10. Export-only URL.
11. Duplicate URL with tracking params.
12. Network schema changed/missing fields.
13. DOM-only fallback card.
14. Long post requiring “see more.”
15. Outbound link post.

Rationale: Fixture breadth matches LinkedIn content variety.

### Q63. How should fixtures be captured without leaking data?

Recommended answer: Use synthetic fixtures where possible. If real captures are needed, sanitize aggressively before commit: names, profile URLs, images, cookies, headers, account identifiers, post text if private, and payload IDs.

Rationale: Fixtures are often where secrets leak.

### Q64. Should tests use real LinkedIn live pages?

Recommended answer: No in CI. Live smoke tests should be manual/local-only and excluded from normal test runs.

Rationale: CI live automation increases risk and flakiness.

### Q65. What is the acceptance test for “no secrets leaked”?

Recommended answer: A secret scan across repo/logs/fixtures plus redaction unit tests that prove known cookie/auth/CSRF/header patterns are removed.

Rationale: Need objective evidence.

## 12. Architecture grill

### Q66. What code architecture should implementation use?

Recommended answer:

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
  notion/
    schema.ts
    mapper.ts
    upsert.ts
  enrichment/
  ideas/
  cli/
```

Rationale: Clear adapter/core/storage/fanout separation.

### Q67. Should the canonical model be TypeScript?

Recommended answer: Yes, assuming implementation uses Node/Playwright. Define `RawSave` with runtime validation using a schema library.

Rationale: Browser automation and Notion SDK are strong in TypeScript; runtime validation protects data boundaries.

### Q68. Should the engine use Playwright or direct Chrome DevTools Protocol?

Recommended answer: Playwright persistent context for v1; CDP attach as advanced/debug path.

Rationale: Playwright is stable for navigation, DOM, network capture, and tests.

### Q69. Should Notion schema be code-generated?

Recommended answer: Store schema as code/config and use bootstrap/validate command. Do not rely on hand-created schema.

Rationale: Prevents drift.

### Q70. Should generic schema live in separate package now?

Recommended answer: No. Keep it local until a second source or brand-profile use case proves the shared abstraction. Then extract.

Rationale: Two real adapters reveal the right abstraction.

## 13. Legal/ethical/content grill

### Q71. Should the system paraphrase source content by default?

Recommended answer: Yes. Content ideas should synthesize and cite/link. Draft commands should avoid copying substantial source text.

Rationale: Better content and lower copyright risk.

### Q72. Should paid/private LinkedIn content be treated differently?

Recommended answer: Yes. Store metadata/snippets only unless Amit explicitly opts into local full snapshot. Never put private/paid-like content into publishable output without transformation and attribution.

Rationale: Even if accessible, it may not be safe to republish.

### Q73. Should raw saves be shareable/exportable?

Recommended answer: Export only redacted metadata by default. Full local snapshots stay private.

Rationale: Future open source or sharing should not leak third-party/private content.

### Q74. Should generated ideas cite LinkedIn source URLs?

Recommended answer: Ideas should retain source links internally. Public drafts should include links when useful, but not every short-form output needs public citation.

Rationale: Internal traceability always; public citation depends on format.

## 14. PRD changes applied

These amendments have been folded into `docs/PRD.md` PRD v2:

1. Add `Root Item ID`, `Is Repost`, `Visibility State`, `Storage Policy`, and `Processing Priority` fields to Raw Ingest schema.
2. Add explicit full-text storage default: `summary_and_snippets` in Notion + local snapshot cache.
3. Add dedicated persistent browser profile as default session strategy.
4. Add hard stop conditions and write-method guard requirements.
5. Promote LinkedIn export import from optional fallback to first-class reconciliation command.
6. Add MVP success metrics tied to content outcomes, not just capture counts.
7. Add explicit two-database Notion design: Raw Ingest + Content Ideas.
8. Add fixture/test matrix for LinkedIn content types and failure cases.
9. Add command list and dry-run default.
10. Add “no stealth / no challenge bypass” language.

## 15. Decision register — recommended defaults

| Decision | Recommended default | Why |
|---|---|---|
| Repo boundary | LinkedIn adapter + temporary shared contracts | Avoid premature shared package. |
| Source path | Browser network-first | Best completeness. |
| Session | Dedicated persistent browser profile | Safer than daily profile. |
| Login | Manual browser login | No password/cookie handling. |
| API | Not v1 capture path | No saved-items endpoint. |
| Export | Required reconciliation command | Backstop for saved date/URL. |
| DOM fallback | Yes | Survives network schema changes. |
| Detail enrichment | Two-phase/capped | Improves quality without overloading. |
| Notion DBs | Two related DBs | Raw evidence vs ideas lifecycle. |
| Full text | Summary/snippets in Notion, local full cache | Content utility + privacy balance. |
| Ideas | Zero-to-many per save | Avoid forced bad ideas. |
| Destination logic | Config-driven outside adapter | Generic engine. |
| Auto-publish | No | Human review. |
| Dry-run | Default | Safe writes. |
| Headless | No for MVP | Visible, debuggable. |
| Stealth | No | Avoid bypass behavior. |
| Write guard | Fail closed | Prevent accidental mutation. |
| CI live LinkedIn tests | No | Avoid flakiness/risk. |
| Shared package | Defer until second source/brand proves abstraction | Real abstraction after repeated use. |

## 16. Open questions that actually need Amit

No blocking open questions remain. Everything has a recommended default and has been applied to `docs/PRD.md`.

Resolved defaults:

- Source scope: this project is LinkedIn-only for capture.
- Destination scope: generic brand profiles for any site/brand/surface.
- Brand voice: template added at `brand-voices/brand-voice-template.md`.
- Brand profiler skill: added at `skills/brand-voice-profiler/` and installed globally at `~/.agents/skills/brand-voice-profiler`.
- First seeded profile: `brand-voices/amit-tiwari-site.md`, inferred from `amittiwari-me-content-writer`.
- Tiny Trauma: explicitly not part of this project; use the template/skill later in a separate fork/project.
- Notion parent/page: create private workspace-level databases unless config provides a parent.
- Full-text policy: local full snapshots, Notion summary/snippets only.
- First run strategy: `--limit 50` for quick value, then full backfill/export reconciliation.
- Shared package: defer until a second source/brand proves abstraction.

## 17. Final recommendation

Proceed to implementation from `docs/PRD.md` PRD v3. Build in this order:

1. Notion schema/bootstrap/validation.
2. Core `RawSave`, dedupe, canonicalization, redaction, run-state.
3. LinkedIn export importer.
4. Playwright headed persistent-profile capture with dry-run JSON output.
5. Network parser + DOM fallback fixtures.
6. Notion idempotent upsert.
7. Enrichment + scoring.
8. Content Ideas generation using brand profiles and generic command packs.
9. Safety hardening and docs.

Do not start with model-based idea generation. Start with capture correctness, redaction, dedupe, and Notion integrity. Idea generation becomes valuable only when raw evidence is trustworthy.
