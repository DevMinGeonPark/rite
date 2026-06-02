import * as fs from 'fs';
import * as path from 'path';

/**
 * Locate the bundled `templates/` directory regardless of whether we are
 * running from compiled `dist/` or via ts-node from `src/`.
 */
export function templatesRoot(): string {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'templates'), // dist/core/paths.js
    path.resolve(__dirname, '..', 'templates'),
    path.resolve(process.cwd(), 'templates'),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[0];
}

export function riteTemplate(): string {
  return path.join(templatesRoot(), 'rite');
}

export function skillsTemplate(): string {
  return path.join(templatesRoot(), 'skills');
}

export function claudeTemplate(): string {
  return path.join(templatesRoot(), 'claude');
}

export function codexTemplate(): string {
  return path.join(templatesRoot(), 'codex');
}

/**
 * Walk up from `start` looking for a directory that contains a `.rite/`
 * folder. Returns the absolute path to that `.rite/` directory, or null.
 */
export function findRiteDir(start: string = process.cwd()): string | null {
  let dir = path.resolve(start);
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = path.join(dir, '.rite');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** The repository root that owns a given `.rite/` directory. */
export function repoRootFor(riteDir: string): string {
  return path.dirname(riteDir);
}

export const RITE_DIRNAME = '.rite';
export const CLAUDE_DIRNAME = '.claude';
export const AGENTS_DIRNAME = '.agents';
export const CODEX_DIRNAME = '.codex';

/** The nine Rite skills, in canonical order. */
export const SKILL_NAMES = [
  'rite',
  'rite-kickoff',
  'rite-plan',
  'rite-board',
  'rite-run',
  'rite-review',
  'rite-sync',
  'rite-retro',
  'rite-wf',
] as const;

export type SkillName = (typeof SKILL_NAMES)[number];
