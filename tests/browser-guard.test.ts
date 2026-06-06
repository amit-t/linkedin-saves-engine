import { describe, expect, it } from 'vitest';
import { assertReadOnlyLinkedInRequest } from '../src/browser/write-guard.js';

describe('browser write guard', () => {
  it('allows safe GET navigation to LinkedIn', () => {
    expect(() => assertReadOnlyLinkedInRequest({ method: 'GET', url: 'https://www.linkedin.com/my-items/saved-posts/' })).not.toThrow();
  });

  it('fails closed on unexpected LinkedIn POST requests', () => {
    expect(() => assertReadOnlyLinkedInRequest({ method: 'POST', url: 'https://www.linkedin.com/voyager/api/feed/likes' })).toThrow(/Blocked LinkedIn write-like request/);
  });
});
