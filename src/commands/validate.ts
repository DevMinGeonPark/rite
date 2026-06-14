import * as path from 'path';
import * as fs from 'fs';
import { exists, readTextOrNull, walkFiles } from '../core/fs';
import { readYaml } from '../core/yaml';
import { findRiteDir, repoRootFor } from '../core/paths';
import { runCommand } from '../core/exec';
import { gitDiffStat, checkBudget } from '../core/diff';

export interface ValidateOptions {
  cwd?: string;
  /** Run the configured test command and gate on its real exit code. */
  runTests?: boolean;
  /** Measure `git diff --numstat <base>` against budgets (e.g. "HEAD"). */
  diffBudgetBase?: string;
}

interface Issue {
  level: 'error' | 'warn';
  message: string;
}

class Report {
  issues: Issue[] = [];
  checks = 0;
  error(message: string) {
    this.issues.push({ level: 'error', message });
  }
  warn(message: string) {
    this.issues.push({ level: 'warn', message });
  }
  pass() {
    this.checks++;
  }
  get errors() {
    return this.issues.filter((i) => i.level === 'error');
  }
  get warnings() {
    return this.issues.filter((i) => i.level === 'warn');
  }
}

interface Roster {
  team?: Record<string, { role_file?: string; owns?: string[] }>;
}
interface State {
  current_project?: string | null;
  active_projects?: string[];
}
interface Config {
  commands?: { test?: string };
  budgets?: {
    max_files_changed_per_task?: number;
    max_lines_changed_per_task?: number;
  };
}
interface Blocker {
  id?: string;
  task?: string;
  status?: string;
}
interface Board {
  project?: string;
  phase?: string;
  lanes?: Record<string, string[]>;
  owners?: Record<string, { primary?: string; reviewer?: string }>;
  blockers?: Blocker[];
}
interface Task {
  id?: string;
  owner?: string;
  reviewer?: string;
  status?: string;
}
interface Tasks {
  tasks?: Task[];
}

/** Normalize a label for case/whitespace-insensitive comparison. */
const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

export function runValidate(opts: ValidateOptions): number {
  const start = path.resolve(opts.cwd ?? process.cwd());
  const riteDir = findRiteDir(start);
  const report = new Report();

  if (!riteDir) {
    console.error(
      `rite validate: no .rite/ directory found from ${start}. Run \`rite init\` first.`
    );
    return 1;
  }
  const repo = repoRootFor(riteDir);
  console.log(`\nRite validate → ${riteDir}\n`);

  // --- runtime files ---
  requireFile(report, path.join(riteDir, 'config.yaml'), '.rite/config.yaml');
  requireFile(report, path.join(riteDir, 'state.yaml'), '.rite/state.yaml');

  // --- team roles (from roster.yaml) ---
  const rosterPath = path.join(riteDir, 'team', 'roster.yaml');
  if (requireFile(report, rosterPath, '.rite/team/roster.yaml')) {
    validateRoster(report, repo, rosterPath);
  }

  // --- state → active project must exist ---
  const state = readYaml<State>(path.join(riteDir, 'state.yaml'));
  const projectsDir = path.join(riteDir, 'projects');
  if (state?.current_project) {
    const p = path.join(projectsDir, state.current_project);
    if (!exists(p)) {
      report.error(
        `state.yaml current_project "${state.current_project}" has no project dir at .rite/projects/${state.current_project}/`
      );
    } else {
      report.pass();
    }
  }
  for (const id of state?.active_projects ?? []) {
    if (!exists(path.join(projectsDir, id))) {
      report.warn(`state.yaml active_projects lists "${id}" but no project dir exists`);
    }
  }

  // --- per-project artifacts ---
  if (exists(projectsDir)) {
    for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      validateProject(report, path.join(projectsDir, entry.name), entry.name);
    }
  }

  // --- optional: run the real test command (ground-truth oracle) ---
  if (opts.runTests) {
    const cfg = readYaml<Config>(path.join(riteDir, 'config.yaml'));
    const testCmd = cfg?.commands?.test;
    if (!testCmd) {
      report.error('--run-tests needs `commands.test` in .rite/config.yaml');
    } else {
      const res = runCommand(testCmd, { cwd: repo, timeoutMs: 20 * 60 * 1000 });
      console.log(`  ⟳ ran "${testCmd}" → exit ${res.exitCode} (${res.durationMs}ms)`);
      if (res.exitCode === 0) {
        report.pass();
      } else {
        report.error(`configured test command failed (exit ${res.exitCode}): ${testCmd}`);
        for (const file of donePassCards(riteDir)) {
          report.error(
            `evidence "${file}" states Test Result PASS but \`${testCmd}\` fails — hallucinated evidence`
          );
        }
      }
    }
  }

  // --- optional: measure diff budget against a base ref ---
  if (opts.diffBudgetBase) {
    const cfg = readYaml<Config>(path.join(riteDir, 'config.yaml'));
    const maxFiles = cfg?.budgets?.max_files_changed_per_task ?? 8;
    const maxLines = cfg?.budgets?.max_lines_changed_per_task ?? 500;
    const stat = gitDiffStat(opts.diffBudgetBase, repo);
    const chk = checkBudget(stat, maxFiles, maxLines);
    console.log(
      `  ⟳ diff vs ${opts.diffBudgetBase}: ${stat.files} files / ${stat.lines} lines (budget ${maxFiles}/${maxLines})`
    );
    if (!chk.over) {
      report.pass();
    } else if (hasWaiver(riteDir)) {
      report.warn(
        `diff budget exceeded (${stat.files}f/${stat.lines}l > ${maxFiles}/${maxLines}) but a waiver note is present`
      );
    } else {
      report.error(
        `diff budget exceeded: ${stat.files} files / ${stat.lines} lines > ${maxFiles}/${maxLines} (no waiver in evidence)`
      );
    }
  }

  // --- output ---
  for (const w of report.warnings) console.log(`  ⚠ ${w.message}`);
  for (const e of report.errors) console.log(`  ✗ ${e.message}`);

  if (report.errors.length === 0) {
    console.log(
      `\n✓ Valid. ${report.checks} checks passed` +
        (report.warnings.length ? `, ${report.warnings.length} warning(s).` : '.') +
        '\n'
    );
    return 0;
  }
  console.log(
    `\n✗ Invalid: ${report.errors.length} error(s)` +
      (report.warnings.length ? `, ${report.warnings.length} warning(s).` : '.') +
      '\n'
  );
  return 1;
}

function requireFile(report: Report, abs: string, label: string): boolean {
  if (exists(abs)) {
    report.pass();
    return true;
  }
  report.error(`missing required file: ${label}`);
  return false;
}

function validateRoster(report: Report, repo: string, rosterPath: string) {
  const roster = readYaml<Roster>(rosterPath);
  if (!roster?.team) {
    report.error('roster.yaml has no `team:` section');
    return;
  }
  for (const [role, def] of Object.entries(roster.team)) {
    if (!def?.role_file) {
      report.warn(`roster role "${role}" has no role_file`);
      continue;
    }
    const roleAbs = path.resolve(repo, def.role_file);
    if (!exists(roleAbs)) {
      report.error(`roster role "${role}" → role_file not found: ${def.role_file}`);
    } else {
      report.pass();
    }
  }
}

function validateProject(report: Report, projDir: string, id: string) {
  const board = readYaml<Board>(path.join(projDir, 'board.yaml'));
  const tasksDoc = readYaml<Tasks>(path.join(projDir, 'tasks.yaml'));
  const tasks = tasksDoc?.tasks ?? [];
  const taskById = new Map<string, Task>();
  for (const t of tasks) if (t.id) taskById.set(t.id, t);

  // tasks: owner + reviewer present, and reviewer != owner
  for (const t of tasks) {
    if (!t.id) {
      report.error(`[${id}] tasks.yaml has a task with no id`);
      continue;
    }
    if (!t.owner) report.error(`[${id}] task "${t.id}" has no owner`);
    if (!t.reviewer) report.error(`[${id}] task "${t.id}" has no reviewer`);
    if (t.owner && t.reviewer && norm(t.owner) === norm(t.reviewer)) {
      report.error(
        `[${id}] task "${t.id}" has the same owner and reviewer ("${t.owner}") — separation of duties requires they differ`
      );
    }
    if (t.owner && t.reviewer && norm(t.owner) !== norm(t.reviewer)) report.pass();
  }

  // board owners: reviewer != primary
  for (const [tid, o] of Object.entries(board?.owners ?? {})) {
    if (o.primary && o.reviewer && norm(o.primary) === norm(o.reviewer)) {
      report.error(
        `[${id}] board owners for "${tid}": primary and reviewer are both "${o.primary}" — they must differ`
      );
    }
  }

  const lanes = board?.lanes ?? {};

  // lane consistency: a task may be in only one lane
  const seen = new Map<string, string>();
  for (const [lane, items] of Object.entries(lanes)) {
    for (const item of items ?? []) {
      if (seen.has(item)) {
        report.error(
          `[${id}] "${item}" appears in two lanes (${seen.get(item)} and ${lane}) — a task may be in only one lane`
        );
      } else {
        seen.set(item, lane);
      }
    }
  }
  if (Object.keys(lanes).length) report.pass();

  // fail-open guard: tasks exist but no board means board gates can't run
  if (!board && tasks.length) {
    report.warn(
      `[${id}] tasks.yaml exists but board.yaml is missing/empty — board lane gates cannot run`
    );
  }

  const doneLane = new Set(lanes['done'] ?? []);
  const readyLane = new Set(lanes['ready'] ?? []);

  // Which items must have a real evidence card?
  //   - anything in the board "done" lane that is a known task, AND
  //   - any task whose tasks.yaml status is "done" (covers board drift / fail-open)
  // Using tasks.yaml membership (not a "task-" prefix) closes the story-* rename bypass.
  const evidenceTargets = new Set<string>();
  for (const item of doneLane) if (taskById.has(item)) evidenceTargets.add(item);
  for (const t of tasks) if (t.id && norm(t.status) === 'done') evidenceTargets.add(t.id);

  const cards = collectEvidence(path.join(projDir, 'evidence'));
  for (const taskId of evidenceTargets) {
    // Canonical match: a card whose "## Task" value IS this task id.
    // (No more whole-file substring search — that allowed cross-contamination.)
    const card = cards.find((c) => c.task && norm(c.task) === norm(taskId));
    if (!card) {
      report.error(
        `[${id}] done task "${taskId}" has no evidence card whose "## Task" section is "${taskId}" — no evidence, no done`
      );
      continue;
    }

    let ok = true;
    const missing: string[] = [];
    if (!card.hasMapping) missing.push('Acceptance Criteria Mapping');
    if (!card.hasTestResult) missing.push('Test Result');
    if (!card.hasVerdict) missing.push('Reviewer Verdict');
    if (missing.length) {
      report.error(
        `[${id}] evidence card "${card.file}" for "${taskId}" is missing required section(s): ${missing.join(', ')}`
      );
      ok = false;
    }
    // Test Result must read PASS (or an explicit waiver) — failing tests can't be done.
    if (card.hasTestResult && !/\b(pass|waiv)/i.test(card.testResult ?? '')) {
      report.error(
        `[${id}] evidence card "${card.file}" for "${taskId}": Test Result is not PASS/waived ("${(card.testResult ?? '').split('\n')[0]}")`
      );
      ok = false;
    }
    // Separation of duties at the evidence layer: the card's reviewer must not be the task owner.
    const t = taskById.get(taskId);
    if (t?.owner && card.reviewer && norm(t.owner) === norm(card.reviewer)) {
      report.error(
        `[${id}] evidence card "${card.file}" for "${taskId}": reviewer ("${card.reviewer}") is the task owner — a builder cannot approve own work`
      );
      ok = false;
    }
    if (card.owner && card.reviewer && norm(card.owner) === norm(card.reviewer)) {
      report.error(
        `[${id}] evidence card "${card.file}" for "${taskId}": Owner and Reviewer are the same ("${card.owner}")`
      );
      ok = false;
    }
    if (ok) report.pass();
  }

  // board "done" lane ↔ tasks.yaml status must agree (board must match artifacts)
  for (const item of doneLane) {
    const t = taskById.get(item);
    if (t && norm(t.status) && norm(t.status) !== 'done') {
      report.error(
        `[${id}] "${item}" is in the board "done" lane but tasks.yaml status is "${t.status}" — board must match artifacts`
      );
    }
  }
  for (const t of tasks) {
    if (t.id && norm(t.status) === 'done' && !doneLane.has(t.id)) {
      report.error(
        `[${id}] task "${t.id}" has status "done" but is not in the board "done" lane — board must match artifacts`
      );
    }
  }

  // a blocked task (open blocker) cannot sit in the "ready" lane
  for (const b of board?.blockers ?? []) {
    if (norm(b.status) === 'open' && b.task && readyLane.has(b.task)) {
      report.error(
        `[${id}] task "${b.task}" is in "ready" but has an open blocker (${b.id ?? '?'}) — resolve the blocker first`
      );
    }
  }

  // referential integrity (warnings): board ↔ tasks.yaml
  const allLaneItems = new Set<string>();
  for (const arr of Object.values(lanes)) for (const i of arr ?? []) allLaneItems.add(i);
  for (const t of tasks) {
    if (t.id && !allLaneItems.has(t.id)) {
      report.warn(`[${id}] task "${t.id}" is defined in tasks.yaml but not on the board`);
    }
  }
  for (const item of allLaneItems) {
    if (item.startsWith('task-') && !taskById.has(item)) {
      report.warn(`[${id}] board item "${item}" is not defined in tasks.yaml`);
    }
  }
}

interface EvidenceCard {
  file: string;
  task: string | null;
  owner: string | null;
  reviewer: string | null;
  hasMapping: boolean;
  hasTestResult: boolean;
  testResult: string | null;
  hasVerdict: boolean;
}

/** Return the body text under a `## <heading>` section, or null if absent. */
function sectionBody(content: string, heading: string): string | null {
  const lines = content.split('\n');
  const target = `## ${heading}`.toLowerCase();
  const idx = lines.findIndex((l) => l.trim().toLowerCase() === target);
  if (idx === -1) return null;
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    out.push(lines[i]);
  }
  return out.join('\n').trim();
}

function firstNonEmpty(s: string | null): string | null {
  if (s == null) return null;
  for (const line of s.split('\n')) {
    const t = line.trim();
    if (t) return t;
  }
  return null;
}

function parseEvidenceCard(file: string, content: string): EvidenceCard {
  const testResult = sectionBody(content, 'Test Result');
  return {
    file,
    task: firstNonEmpty(sectionBody(content, 'Task')),
    owner: firstNonEmpty(sectionBody(content, 'Owner')),
    reviewer: firstNonEmpty(sectionBody(content, 'Reviewer')),
    hasMapping: sectionBody(content, 'Acceptance Criteria Mapping') !== null,
    hasTestResult: testResult !== null,
    testResult,
    hasVerdict: sectionBody(content, 'Reviewer Verdict') !== null,
  };
}

function collectEvidence(evidenceDir: string): EvidenceCard[] {
  if (!exists(evidenceDir)) return [];
  return walkFiles(evidenceDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => parseEvidenceCard(path.basename(f), readTextOrNull(f) ?? ''));
}

/** Every evidence card across all projects (for repo-wide run-tests checks). */
function allEvidenceCards(riteDir: string): EvidenceCard[] {
  const projectsDir = path.join(riteDir, 'projects');
  if (!exists(projectsDir)) return [];
  const out: EvidenceCard[] = [];
  for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    out.push(...collectEvidence(path.join(projectsDir, entry.name, 'evidence')));
  }
  return out;
}

/** Cards whose Test Result claims PASS — used to flag hallucinated evidence. */
function donePassCards(riteDir: string): string[] {
  return allEvidenceCards(riteDir)
    .filter((c) => c.testResult && /\bpass\b/i.test(c.testResult))
    .map((c) => c.file);
}

/** True if any evidence card mentions a waiver (relaxes the diff-budget gate). */
function hasWaiver(riteDir: string): boolean {
  const projectsDir = path.join(riteDir, 'projects');
  if (!exists(projectsDir)) return false;
  return walkFiles(projectsDir)
    .filter((f) => f.includes(`${path.sep}evidence${path.sep}`) && f.endsWith('.md'))
    .some((f) => /waiv/i.test(readTextOrNull(f) ?? ''));
}
