import { readFile } from 'node:fs/promises';

export type SurfaceTemplate = {
  id: string;
  label: string;
  length?: string;
  structure: string[];
};

export type BrandProfile = {
  id: string;
  name: string;
  owner?: string;
  promise: string;
  audience: string[];
  corePointOfView: string[];
  soundLike: string[];
  avoid: string[];
  preferTopics: string[];
  sourceSaveRules: string[];
  surfaces: SurfaceTemplate[];
  sourcePath: string;
  version: string;
};

function valueAfter(label: string, text: string): string | undefined {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^${escaped}:\\s*(.+)$`, 'mi'));
  return match?.[1]?.replace(/`/g, '').trim();
}

function section(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^## ${escaped}\\s*\\n([\\s\\S]*?)(?=^## |\\z)`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function subsection(text: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`^### ${escaped}\\s*\\n([\\s\\S]*?)(?=^### |^## |\\z)`, 'm'));
  return match?.[1]?.trim() ?? '';
}

function bullets(block: string): string[] {
  return block.split('\n')
    .map((line) => line.trim())
    .filter((line) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line))
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean);
}

function paragraph(block: string): string {
  return block.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('#')).join(' ').trim();
}

function surface(id: string, label: string, block: string): SurfaceTemplate {
  const lines = bullets(block);
  const length = lines.find((line) => line.toLowerCase().startsWith('length:'))?.replace(/^Length:\s*/i, '');
  return { id, label, length, structure: lines };
}

export async function loadBrandProfileFromMarkdown(path: string): Promise<BrandProfile> {
  const markdown = await readFile(path, 'utf8');
  const id = valueAfter('Brand ID', markdown);
  const name = valueAfter('Brand/site name', markdown);
  if (!id || !name) throw new Error(`Brand profile ${path} missing Brand ID or Brand/site name`);
  const voice = section(markdown, 'Voice rules');
  const content = section(markdown, 'Content rules');
  const website = subsection(markdown, 'Website article / evergreen blog') || subsection(markdown, 'Website article');
  const social = subsection(markdown, 'LinkedIn short post') || subsection(markdown, 'Short social post');
  const essay = subsection(markdown, 'Essay/newsletter');
  const surfaces = [
    website ? surface('website_article', 'Website article', website) : undefined,
    social ? surface('short_social_post', 'Short social post', social) : undefined,
    essay ? surface('essay_newsletter', 'Essay/newsletter', essay) : undefined
  ].filter(Boolean) as SurfaceTemplate[];
  const profile: BrandProfile = {
    id,
    name,
    owner: valueAfter('Owner', markdown),
    promise: paragraph(section(markdown, 'Brand promise')),
    audience: bullets(section(markdown, 'Audience')),
    corePointOfView: bullets(section(markdown, 'Core point of view')),
    soundLike: bullets(subsection(voice, 'Sound like')),
    avoid: bullets(subsection(voice, 'Do not sound like')),
    preferTopics: bullets(subsection(content, 'Prefer topics')),
    sourceSaveRules: bullets(subsection(content, 'Source-save selection rules')),
    surfaces,
    sourcePath: path,
    version: valueAfter('Created', markdown) ?? new Date().toISOString().slice(0, 10)
  };
  validateBrandProfile(profile);
  return profile;
}

export function validateBrandProfile(profile: BrandProfile): void {
  const missing: string[] = [];
  if (!profile.promise) missing.push('Brand promise');
  if (profile.audience.length === 0) missing.push('Audience');
  if (profile.corePointOfView.length === 0) missing.push('Core point of view');
  if (profile.surfaces.length === 0) missing.push('Surface templates');
  if (missing.length > 0) throw new Error(`Brand profile ${profile.id} missing required sections: ${missing.join(', ')}`);
}
