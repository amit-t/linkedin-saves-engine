const PATTERNS: Array<[RegExp, string]> = [
  [/\b(cookie|set-cookie)\s*[:=]\s*[^;\n]+/gi, '$1: [REDACTED_COOKIE]'],
  [/\bauthorization\s*:\s*bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'authorization: Bearer [REDACTED_TOKEN]'],
  [/\bbearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [REDACTED_TOKEN]'],
  [/\bcsrf[-_]?token\s*[:=]\s*[^;\n]+/gi, 'csrf-token: [REDACTED_CSRF]'],
  [/\bli_at=[^;\s]+/gi, 'li_at=[REDACTED_COOKIE]'],
  [/\bJSESSIONID=[^;\s]+/gi, 'JSESSIONID=[REDACTED_COOKIE]'],
  [/\bclient_secret=([^&\s]+)/gi, 'client_secret=[REDACTED_SECRET]'],
  [/\baccess_token=([^&\s]+)/gi, 'access_token=[REDACTED_TOKEN]']
];

export function redactSecrets(input: unknown): string {
  let text = typeof input === 'string' ? input : JSON.stringify(input, null, 2);
  for (const [pattern, replacement] of PATTERNS) {
    text = text.replace(pattern, replacement);
  }
  return text;
}

export function redactObject<T>(value: T): T {
  return JSON.parse(redactSecrets(value)) as T;
}
