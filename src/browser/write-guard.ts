export type RequestLike = { method: string; url: string };

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWLISTED_READISH_POST_PATTERNS: RegExp[] = [];

export function isLinkedInUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'linkedin.com' || parsed.hostname.endsWith('.linkedin.com');
  } catch {
    return false;
  }
}

export function assertReadOnlyLinkedInRequest(request: RequestLike): void {
  const method = request.method.toUpperCase();
  if (!isLinkedInUrl(request.url)) return;
  if (!WRITE_METHODS.has(method)) return;
  if (ALLOWLISTED_READISH_POST_PATTERNS.some((pattern) => pattern.test(request.url))) return;
  throw new Error(`Blocked LinkedIn write-like request: ${method} ${request.url}`);
}
