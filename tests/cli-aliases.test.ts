import { access, mkdtemp, readFile, lstat, rm } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);

describe('easy CLI aliases', () => {
  it('exposes package bin aliases that do not require npm run dev', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
    expect(packageJson.bin).toMatchObject({
      'linkedin-saves-engine': 'bin/linkedin-saves-engine',
      'li-saves': 'bin/linkedin-saves-engine',
      'linkedin-content-ideas': 'bin/linkedin-saves-engine'
    });
    await access('bin/linkedin-saves-engine', constants.X_OK);
  });

  it('keeps zsh launcher and installer parseable', async () => {
    await execFileAsync('zsh', ['-n', 'bin/linkedin-saves-engine']);
    await execFileAsync('zsh', ['-n', 'scripts/install_cli.zsh']);
  });


  it('installer creates global symlink aliases from a clean temp bin dir', async () => {
    const tempBin = await mkdtemp(join(tmpdir(), 'linkedin-cli-bin-'));
    try {
      const { stdout } = await execFileAsync('zsh', ['scripts/install_cli.zsh'], {
        env: { ...process.env, LINKEDIN_SAVES_GLOBAL_BIN_DIR: tempBin, PATH: `${tempBin}:${process.env.PATH ?? ''}` }
      });
      expect(stdout).toContain('Run: li-saves --env .env sync --dry-run --limit 10');
      for (const aliasName of ['linkedin-saves-engine', 'li-saves', 'linkedin-content-ideas']) {
        const stat = await lstat(join(tempBin, aliasName));
        expect(stat.isSymbolicLink()).toBe(true);
      }
    } finally {
      await rm(tempBin, { recursive: true, force: true });
    }
  });
});
