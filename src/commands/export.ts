import * as path from 'path';
import { formatAction, summarize, FileAction } from '../core/fs';
import { loadSkillManifest } from '../core/skills';
import {
  installClaudeSkills,
  installCodexSkills,
  installCodexConfig,
  installInstructions,
} from './init';
import type { Tool } from '../cli';

export interface ExportOptions {
  tool: Tool;
  cwd?: string;
}

const wantsClaude = (t: Tool) => t === 'claude' || t === 'both';
const wantsCodex = (t: Tool) => t === 'codex' || t === 'both';

/**
 * Regenerate tool adapter files from canonical templates. Skill/command/openai
 * files are generated artifacts, so they are force-rewritten; the AGENTS.md /
 * CLAUDE.md instruction surface is left alone if the user has edited it.
 */
export function runExport(opts: ExportOptions): number {
  const repo = path.resolve(opts.cwd ?? process.cwd());
  const specs = loadSkillManifest();
  const actions: FileAction[] = [];

  console.log(`\nRite export → ${repo}  (tool: ${opts.tool})\n`);

  if (wantsClaude(opts.tool)) {
    actions.push(...installClaudeSkills(repo, specs, true));
  }
  if (wantsCodex(opts.tool)) {
    actions.push(...installCodexSkills(repo, specs, true));
    actions.push(...installCodexConfig(repo, true));
  }
  // Never clobber a user-edited instruction file.
  actions.push(...installInstructions(repo, opts.tool, false));

  for (const a of actions) console.log(formatAction(a, repo));
  const s = summarize(actions);
  console.log(
    `\n  ${s.created} created, ${s.overwritten} regenerated, ${s.skipped} unchanged.\n`
  );
  return 0;
}
