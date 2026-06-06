import { describe, expect, it } from 'vitest';
import { loadBrandProfileFromMarkdown } from '../src/brand/profile.js';

describe('brand profiles', () => {
  it('loads required sections from Amit profile markdown', async () => {
    const profile = await loadBrandProfileFromMarkdown('brand-voices/amit-tiwari-site.md');
    expect(profile.id).toBe('amit-tiwari-site');
    expect(profile.name).toBe('Amit Tiwari personal site');
    expect(profile.corePointOfView.length).toBeGreaterThan(5);
    expect(profile.surfaces.some((surface) => surface.id === 'website_article')).toBe(true);
  });
});
