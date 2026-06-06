const STRIP_PARAMS = [/^utm_/i, /^trk$/i, /^trackingId$/i, /^lipi$/i, /^licu$/i, /^miniProfileUrn$/i];

export function canonicalizeUrl(input: string): string {
  const url = new URL(input.trim());
  url.hash = '';
  for (const key of Array.from(url.searchParams.keys())) {
    if (STRIP_PARAMS.some((pattern) => pattern.test(key))) {
      url.searchParams.delete(key);
    }
  }
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }
  return url.toString();
}

export function tryCanonicalizeUrl(input: string): string | undefined {
  try {
    return canonicalizeUrl(input);
  } catch {
    return undefined;
  }
}

export function inferLinkedInItemId(urlOrText: string): string | undefined {
  const decoded = decodeURIComponent(urlOrText);
  const urn = decoded.match(/urn:li:(?:activity|share|article|ugcPost):[A-Za-z0-9_-]+/);
  if (urn) return urn[0];
  const activity = decoded.match(/activity[-/:](\d{8,})/i);
  if (activity) return `urn:li:activity:${activity[1]}`;
  return undefined;
}
