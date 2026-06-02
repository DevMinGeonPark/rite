import * as path from 'path';
import { exists } from '../core/fs';
import { readYaml } from '../core/yaml';
import {
  findRiteDir,
  repoRootFor,
  SKILL_NAMES,
  CLAUDE_DIRNAME,
  AGENTS_DIRNAME,
  CODEX_DIRNAME,
} from '../core/paths';

export interface DoctorOptions {
  cwd?: string;
}

interface State {
  current_project?: string | null;
  current_phase?: string | null;
  current_task?: string | null;
  active_projects?: string[];
}

export function runDoctor(opts: DoctorOptions): number {
  const start = path.resolve(opts.cwd ?? process.cwd());
  const riteDir = findRiteDir(start);

  console.log('\nRite doctor\n');

  if (!riteDir) {
    console.log(`  ✗ No .rite/ runtime found from ${start}.`);
    console.log(`    → Run \`rite init --tool both\` to install Rite.\n`);
    return 1;
  }
  const repo = repoRootFor(riteDir);
  console.log(`  runtime:   ${riteDir}`);

  let problems = 0;

  // --- config / state health ---
  problems += reportFile(path.join(riteDir, 'config.yaml'), '.rite/config.yaml');
  problems += reportFile(path.join(riteDir, 'state.yaml'), '.rite/state.yaml');
  problems += reportParse(path.join(riteDir, 'config.yaml'), 'config.yaml');
  problems += reportParse(path.join(riteDir, 'state.yaml'), 'state.yaml');

  // --- adapters ---
  const claudeInstalled = exists(path.join(repo, CLAUDE_DIRNAME, 'skills', 'rite', 'SKILL.md'));
  const codexInstalled = exists(path.join(repo, AGENTS_DIRNAME, 'skills', 'rite', 'SKILL.md'));
  console.log('');
  console.log(`  adapters:`);
  console.log(`    claude (.claude/skills)  : ${claudeInstalled ? 'installed' : 'not installed'}`);
  console.log(`    codex  (.agents/skills)  : ${codexInstalled ? 'installed' : 'not installed'}`);
  if (!claudeInstalled && !codexInstalled) {
    console.log('    ✗ no tool adapter installed — run `rite init`');
    problems++;
  }

  // --- per-adapter skill completeness ---
  if (claudeInstalled) {
    problems += reportMissingSkills(repo, CLAUDE_DIRNAME, 'skills', 'claude');
  }
  if (codexInstalled) {
    problems += reportMissingSkills(repo, AGENTS_DIRNAME, 'skills', 'codex');
  }

  // --- instruction surface ---
  console.log('');
  console.log('  instructions:');
  console.log(`    AGENTS.md : ${exists(path.join(repo, 'AGENTS.md')) ? 'present' : 'absent'}`);
  console.log(`    CLAUDE.md : ${exists(path.join(repo, 'CLAUDE.md')) ? 'present' : 'absent'}`);
  if (codexInstalled && !exists(path.join(repo, 'AGENTS.md'))) {
    console.log('    ⚠ Codex is installed but AGENTS.md is missing (Codex reads AGENTS.md).');
  }
  const codexConfig = path.join(repo, CODEX_DIRNAME, 'config.toml');
  if (codexInstalled) {
    console.log(`    .codex/config.toml : ${exists(codexConfig) ? 'present' : 'absent'}`);
  }

  // --- active project ---
  console.log('');
  const state = readYaml<State>(path.join(riteDir, 'state.yaml'));
  if (state?.current_project) {
    const projDir = path.join(riteDir, 'projects', state.current_project);
    const ok = exists(projDir);
    console.log(`  active project: ${state.current_project}${ok ? '' : '  (✗ directory missing)'}`);
    console.log(`    phase: ${state.current_phase ?? '—'}   task: ${state.current_task ?? '—'}`);
    if (!ok) problems++;
  } else {
    console.log('  active project: none (run /rite-kickoff to start one)');
  }

  console.log(
    problems === 0
      ? '\n  ✓ No problems detected.\n'
      : `\n  ✗ ${problems} problem(s) detected. See above.\n`
  );
  return problems === 0 ? 0 : 1;
}

function reportFile(abs: string, label: string): number {
  if (exists(abs)) return 0;
  console.log(`  ✗ missing ${label}`);
  return 1;
}

function reportParse(abs: string, label: string): number {
  if (!exists(abs)) return 0;
  try {
    readYaml(abs);
    return 0;
  } catch (e) {
    console.log(`  ✗ ${label} is not valid YAML: ${e instanceof Error ? e.message : e}`);
    return 1;
  }
}

function reportMissingSkills(
  repo: string,
  toolDir: string,
  skillsSub: string,
  label: string
): number {
  const missing = SKILL_NAMES.filter(
    (name) => !exists(path.join(repo, toolDir, skillsSub, name, 'SKILL.md'))
  );
  if (missing.length === 0) {
    console.log(`    ${label}: all ${SKILL_NAMES.length} skills present`);
    return 0;
  }
  console.log(`    ✗ ${label}: missing skills → ${missing.join(', ')}`);
  return 1;
}
