---
name: brand-voice-profiler
description: Generates reusable brand voice and content rules profiles from sample writing for saves-engine content fanout. Use when asked to seed a brand voice, infer voice from sample posts/articles, create brand/content templates, or adapt the engine to a new site/brand.
---

# Brand Voice Profiler

## Purpose

Turn representative writing samples into a reusable brand profile that content commands can use without hard-coding a specific site, brand, or audience into a source adapter.

## Inputs

- Sample files or directories: published posts, high-performing notes, essays, newsletters, website articles.
- Brand/site name and optional brand id.
- Target output path. Default: `brand-voices/<brand-id>.md`.
- Optional surfaces: `website_article`, `linkedin_post`, `substack_essay`, `newsletter_note`, etc.

## Workflow

1. Collect 5–20 representative samples. Prefer published or high-performing content over drafts.
2. Run the inventory helper when many files exist:

   ```bash
   python3 skills/brand-voice-profiler/scripts/collect_samples.py <sample-file-or-dir>...
   ```

3. Read the strongest samples, not only the inventory. Look for repeated patterns in audience, thesis, hooks, pacing, structure, metaphors, CTAs, and taboo moves.
4. Fill `references/brand-voice-template.md`. Pick recommended defaults; leave open only owner/editorial questions that cannot be inferred from samples.
5. Save the profile under `brand-voices/<brand-id>.md` unless user requests another location.
6. Cite sample paths used. Do not paste long source passages. Short phrase examples are okay.
7. Verify no unfinished placeholders remain unless explicitly marked as optional future refinement.

## Output requirements

A good profile includes:

- Brand promise and audience.
- Core point of view.
- Voice rules.
- Content structure rules.
- Surface-specific templates.
- Source-save selection rules.
- “Do / avoid” lists.
- Example transformations from raw saves into content ideas.
- Review checklist for generated content.

## Integration rule

Brand profiles guide fanout and drafting commands only. Source adapters must never embed brand-specific logic.
