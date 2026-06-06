import { describe, expect, it } from 'vitest';
import { buildContentIdeaProperties } from '../src/notion/schema.js';
import type { ContentIdea } from '../src/ideas/generator.js';

describe('Content Idea Notion mapping', () => {
  it('maps generated ideas to Notion properties', () => {
    const idea: ContentIdea = {
      name: 'Field guide: AI context maps',
      rawSaveDedupKey: 'linkedin:urn:li:activity:555',
      brandProfileId: 'amit-tiwari-site',
      brandName: 'Amit Tiwari personal site',
      brandVoiceVersion: '2026-06-06',
      surfaceId: 'website_article',
      format: 'Website article',
      audience: 'Senior engineers',
      hook: 'Most teams treat AI context as prompt work.',
      thesis: 'Repos need context maps.',
      outline: ['Name the failure', 'Show the fix'],
      sourceEvidence: ['Agents fail when context is hidden.'],
      noveltyScore: 80,
      fitScore: 95,
      confidence: 85,
      status: 'Generated',
      createdAt: '2026-06-06T00:00:00.000Z'
    };
    const props = buildContentIdeaProperties(idea);
    expect(props.Name.title[0].text.content).toBe('Field guide: AI context maps');
    expect(props['Brand Profile ID'].rich_text[0].text.content).toBe('amit-tiwari-site');
    expect(props['Fit Score'].number).toBe(95);
  });
});
