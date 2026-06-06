import { mkdir } from 'node:fs/promises';
import { computeDedupKey } from '../core/dedupe.js';
import { RawSaveSchema, type RawSave } from '../core/raw-save.js';
import { canonicalizeUrl, inferLinkedInItemId, tryCanonicalizeUrl } from '../core/canonical-url.js';
import { assertReadOnlyLinkedInRequest } from './write-guard.js';
import { extractRawSavesFromLinkedInPayload } from '../adapters/linkedin/network-parser.js';
import { mergeRawSave } from '../core/dedupe.js';

export type BrowserCaptureOptions = {
  profileDir: string;
  limit?: number;
  headed?: boolean;
  now?: string;
};

export async function captureLinkedInSaves(options: BrowserCaptureOptions): Promise<RawSave[]> {
  const { chromium } = await import('playwright');
  const now = options.now ?? new Date().toISOString();
  await mkdir(options.profileDir, { recursive: true });
  const context = await chromium.launchPersistentContext(options.profileDir, {
    headless: options.headed === false,
    viewport: { width: 1440, height: 1000 }
  });
  try {
    const networkRecords: RawSave[] = [];
    context.on('request', (request) => {
      assertReadOnlyLinkedInRequest({ method: request.method(), url: request.url() });
    });
    context.on('response', async (response) => {
      try {
        const url = response.url();
        const contentType = response.headers()['content-type'] ?? '';
        if (!/linkedin\.com/.test(url) || !/json/i.test(contentType)) return;
        const payload = await response.json();
        networkRecords.push(...extractRawSavesFromLinkedInPayload(payload, { now, sourceUrl: url }));
      } catch {
        // Ignore non-JSON and transient response parse failures. DOM fallback still runs.
      }
    });
    const page = context.pages()[0] ?? await context.newPage();
    await page.goto('https://www.linkedin.com/my-items/saved-posts/', { waitUntil: 'domcontentloaded', timeout: 60_000 });
    if (/login|checkpoint|challenge/i.test(page.url())) {
      throw new Error('LinkedIn login/challenge detected. Log in manually in the opened profile, then rerun capture.');
    }

    const seen = new Set<string>();
    const records: RawSave[] = [];
    let stableRounds = 0;
    while (stableRounds < 3 && records.length < (options.limit ?? 500)) {
      const links = await page.locator('a[href*="/feed/update/"], a[href*="/posts/"], a[href*="/pulse/"]').evaluateAll((anchors) => anchors.map((anchor) => ({
        href: (anchor as HTMLAnchorElement).href,
        text: (anchor.textContent ?? '').trim()
      })));
      const before = records.length;
      for (const link of links) {
        if (!link.href || seen.has(link.href)) continue;
        seen.add(link.href);
        const canonicalUrl = tryCanonicalizeUrl(link.href) ?? link.href;
        const sourceItemId = inferLinkedInItemId(canonicalUrl);
        const dedupKey = computeDedupKey({ sourcePlatform: 'linkedin', sourceItemId, canonicalUrl, originalUrl: link.href });
        records.push(RawSaveSchema.parse({
          sourcePlatform: 'linkedin',
          sourceAdapter: 'linkedin-browser-saved-v1',
          sourceItemId,
          dedupKey,
          originalUrl: link.href,
          canonicalUrl: canonicalizeUrl(link.href),
          captureMethod: 'dom',
          captureCompleteness: link.text ? 'partial' : 'metadata_only',
          visibilityState: 'available',
          storagePolicy: 'summary_and_snippets',
          processingPriority: 'normal',
          firstIngestedAt: now,
          lastSeenAt: now,
          title: link.text.slice(0, 160) || 'LinkedIn saved item',
          evidenceSnippets: link.text ? [link.text.slice(0, 500)] : [],
          contentType: 'unknown',
          outboundUrls: [],
          mediaUrls: [],
          mediaTypes: [],
          hashtags: []
        }));
        if (records.length >= (options.limit ?? 500)) break;
      }
      stableRounds = records.length === before ? stableRounds + 1 : 0;
      await page.mouse.wheel(0, 2500);
      await page.waitForTimeout(1200);
    }
    const merged = new Map<string, RawSave>();
    for (const record of [...networkRecords, ...records]) {
      const existing = merged.get(record.dedupKey);
      merged.set(record.dedupKey, existing ? mergeRawSave(existing, record) : record);
    }
    return Array.from(merged.values());
  } finally {
    await context.close();
  }
}
