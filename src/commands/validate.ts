import * as path from 'path';
import * as fs from 'fs';
import { exists, readTextOrNull, walkFiles } from '../core/fs';
import { readYaml } from '../core/yaml';
import { findRiteDir, repoRootFor } from '../core/paths';

export interface ValidateOptions {
  cwd?: string;
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
interface Board {
  project?: string;
  phase?: string;
  lanes?: Record<string, string[]>;
  owners?: Record<string, { primary?: string; reviewer?: string }>;
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
    if (t.owner && t.reviewer && t.owner === t.reviewer) {
      report.error(
        `[${id}] task "${t.id}" has the same owner and reviewer ("${t.owner}") — separation of duties requires they differ`
      );
    }
    if (t.owner && t.reviewer && t.owner !== t.reviewer) report.pass();
  }

  // board owners: reviewer != primary
  for (const [tid, o] of Object.entries(board?.owners ?? {})) {
    if (o.primary && o.reviewer && o.primary === o.reviewer) {
      report.error(
        `[${id}] board owners for "${tid}": primary and reviewer are both "${o.primary}" — they must differ`
      );
    }
  }

  // lane consistency: a task may be in only one lane
  const lanes = board?.lanes ?? {};
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

  // done tasks must have an evidence card
  const evidence = collectEvidence(path.join(projDir, 'evidence'));
  for (const doneItem of lanes['done'] ?? []) {
    // stories never need evidence; only task-* items are gated
    if (!doneItem.startsWith('task-')) continue;
    if (!hasEvidenceFor(evidence, doneItem)) {
      report.error(
        `[${id}] done task "${doneItem}" has no evidence card in evidence/ — no evidence, no done`
      );
    } else {
      report.pass();
    }
  }
}

interface EvidenceFile {
  file: string;
  content: string;
}

function collectEvidence(evidenceDir: string): EvidenceFile[] {
  if (!exists(evidenceDir)) return [];
  return walkFiles(evidenceDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ file: path.basename(f), content: readTextOrNull(f) ?? '' }));
}

/** A task is "covered" if its id appears in any evidence file (name or body). */
function hasEvidenceFor(evidence: EvidenceFile[], taskId: string): boolean {
  return evidence.some(
    (e) => e.file.includes(taskId) || e.content.includes(taskId)
  );
}
