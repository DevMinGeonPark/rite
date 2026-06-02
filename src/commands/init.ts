import * as path from 'path';
import {
  copyTree,
  exists,
  writeFileSafe,
  formatAction,
  summarize,
  readText,
  FileAction,
} from '../core/fs';
import {
  riteTemplate,
  codexTemplate,
  RITE_DIRNAME,
  CLAUDE_DIRNAME,
  AGENTS_DIRNAME,
  CODEX_DIRNAME,
} from '../core/paths';
import {
  loadSkillManifest,
  loadSkillBody,
  renderClaudeSkill,
  renderCodexSkill,
  renderCodexOpenaiYaml,
  renderClaudeCommandShim,
  SkillSpec,
} from '../core/skills';
import type { Tool } from '../cli';

export interface InitOptions {
  tool: Tool;
  force: boolean;
  cwd?: string;
}

const wantsClaude = (t: Tool) => t === 'claude' || t === 'both';
const wantsCodex = (t: Tool) => t === 'codex' || t === 'both';

export function runInit(opts: InitOptions): number {
  const repo = path.resolve(opts.cwd ?? process.cwd());
  const force = opts.force;

  console.log(`\nRite init → ${repo}`);
  console.log(`  tool: ${opts.tool}${force ? '  (--force)' : ''}\n`);

  if (!exists(path.join(repo, '.git'))) {
    console.log(
      '  ⚠ Not a git repository. Rite works best under version control; ' +
        'consider `git init` so artifacts and diffs are tracked.\n'
    );
  }

  const actions: FileAction[] = [];

  // 1) The .rite/ runtime is the source of truth — always installed.
  actions.push(...copyTree(riteTemplate(), path.join(repo, RITE_DIRNAME), { force }));

  const specs = loadSkillManifest();

  // 2) Claude Code adapter: .claude/skills + legacy .claude/commands shims.
  if (wantsClaude(opts.tool)) {
    actions.push(...installClaudeSkills(repo, specs, force));
  }

  // 3) Codex adapter: .agents/skills (+ agents/openai.yaml), .codex/ config & rules.
  if (wantsCodex(opts.tool)) {
    actions.push(...installCodexSkills(repo, specs, force));
    actions.push(...installCodexConfig(repo, force));
  }

  // 4) Shared instruction surface (AGENTS.md / CLAUDE.md bridge).
  actions.push(...installInstructions(repo, opts.tool, force));

  // Report.
  for (const a of actions) console.log(formatAction(a, repo));
  const s = summarize(actions);
  console.log(
    `\n  ${s.created} created, ${s.overwritten} overwritten, ${s.skipped} skipped (already present).`
  );

  printNextSteps(opts.tool);
  return 0;
}

export function installClaudeSkills(
  repo: string,
  specs: SkillSpec[],
  force: boolean
): FileAction[] {
  const out: FileAction[] = [];
  for (const spec of specs) {
    const body = loadSkillBody(spec.name);
    const skillPath = path.join(repo, CLAUDE_DIRNAME, 'skills', spec.name, 'SKILL.md');
    out.push({
      path: skillPath,
      result: writeFileSafe(skillPath, renderClaudeSkill(spec, body), { force }),
    });
    const cmdPath = path.join(repo, CLAUDE_DIRNAME, 'commands', `${spec.name}.md`);
    out.push({
      path: cmdPath,
      result: writeFileSafe(cmdPath, renderClaudeCommandShim(spec), { force }),
    });
  }
  return out;
}

export function installCodexSkills(
  repo: string,
  specs: SkillSpec[],
  force: boolean
): FileAction[] {
  const out: FileAction[] = [];
  for (const spec of specs) {
    const body = loadSkillBody(spec.name);
    const skillPath = path.join(repo, AGENTS_DIRNAME, 'skills', spec.name, 'SKILL.md');
    out.push({
      path: skillPath,
      result: writeFileSafe(skillPath, renderCodexSkill(spec, body), { force }),
    });
    const openai = renderCodexOpenaiYaml(spec);
    if (openai) {
      const metaPath = path.join(
        repo,
        AGENTS_DIRNAME,
        'skills',
        spec.name,
        'agents',
        'openai.yaml'
      );
      out.push({ path: metaPath, result: writeFileSafe(metaPath, openai, { force }) });
    }
  }
  return out;
}

export function installCodexConfig(repo: string, force: boolean): FileAction[] {
  const out: FileAction[] = [];
  // config.toml (project-scoped, benign + educational) and a correct .rules file.
  const cfgSrc = path.join(codexTemplate(), 'config', 'config.toml');
  const cfgDest = path.join(repo, CODEX_DIRNAME, 'config.toml');
  if (exists(cfgSrc)) {
    out.push({ path: cfgDest, result: writeFileSafe(cfgDest, readText(cfgSrc), { force }) });
  }
  const rulesSrc = path.join(codexTemplate(), 'rules', 'rite.rules');
  const rulesDest = path.join(repo, CODEX_DIRNAME, 'rules', 'rite.rules');
  if (exists(rulesSrc)) {
    out.push({ path: rulesDest, result: writeFileSafe(rulesDest, readText(rulesSrc), { force }) });
  }
  return out;
}

/**
 * Wire up the shared Rite instruction pointer.
 * - Codex reads AGENTS.md, so emit it whenever Codex is targeted.
 * - Claude reads CLAUDE.md (NOT AGENTS.md). When both tools are targeted we
 *   bridge with an `@AGENTS.md` import; for Claude-only we write the guidance
 *   straight into CLAUDE.md. Existing files are never overwritten.
 */
export function installInstructions(repo: string, tool: Tool, force: boolean): FileAction[] {
  const out: FileAction[] = [];
  const guidance = readText(path.join(codexTemplate(), 'AGENTS.md'));

  if (wantsCodex(tool)) {
    const agentsDest = path.join(repo, 'AGENTS.md');
    out.push({ path: agentsDest, result: writeFileSafe(agentsDest, guidance, { force }) });
  }

  if (wantsClaude(tool)) {
    const claudeDest = path.join(repo, 'CLAUDE.md');
    const content = wantsCodex(tool)
      ? `# Project agent instructions\n\nThis repository uses **Rite** (\`.rite/\` is the runtime).\n\n@AGENTS.md\n`
      : guidance;
    out.push({ path: claudeDest, result: writeFileSafe(claudeDest, content, { force }) });
  }

  return out;
}

function printNextSteps(tool: Tool): void {
  console.log('\nNext steps:');
  console.log('  1. Review .rite/context/project-rules.md and constitution.md.');
  if (wantsClaude(tool)) {
    console.log('  2. In Claude Code, run:   /rite-kickoff "your first feature"');
  }
  if (wantsCodex(tool)) {
    console.log('  2. In Codex, type:        $rite-kickoff  (or /skills → rite-kickoff)');
  }
  console.log('  3. Then:                  /rite-plan → /rite-board → /rite-run');
  console.log('  4. Validate any time:     rite validate\n');
}
