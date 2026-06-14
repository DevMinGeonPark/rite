import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { copyTree } from '../core/fs';
import { readYaml, stringifyYaml } from '../core/yaml';
import { riteTemplate } from '../core/paths';

let counter = 0;

/** Temp repo with a clean .rite/ copied from the real templates. */
export function makeRepo(): string {
  const dir = path.join(os.tmpdir(), `rite-test-${process.pid}-${counter++}`);
  fs.mkdirSync(dir, { recursive: true });
  copyTree(riteTemplate(), path.join(dir, '.rite'));
  return dir;
}

export function rmRepo(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Shallow-merge a patch into .rite/config.yaml. */
export function setConfig(repo: string, patch: Record<string, unknown>): void {
  const p = path.join(repo, '.rite', 'config.yaml');
  const cfg = (readYaml<Record<string, unknown>>(p) ?? {}) as Record<string, unknown>;
  fs.writeFileSync(p, stringifyYaml({ ...cfg, ...patch }));
}

export function setState(repo: string, currentProject: string): void {
  const p = path.join(repo, '.rite', 'state.yaml');
  fs.writeFileSync(p, stringifyYaml({ current_project: currentProject, active_projects: [currentProject] }));
}

export function writeProject(
  repo: string,
  id: string,
  files: { board?: string; tasks?: string; evidence?: { file: string; content: string }[] }
): string {
  const projDir = path.join(repo, '.rite', 'projects', id);
  fs.mkdirSync(projDir, { recursive: true });
  if (files.board) fs.writeFileSync(path.join(projDir, 'board.yaml'), files.board);
  if (files.tasks) fs.writeFileSync(path.join(projDir, 'tasks.yaml'), files.tasks);
  fs.writeFileSync(path.join(projDir, 'spec.md'), '# Spec\nplaceholder spec.\n');
  if (files.evidence) {
    const evDir = path.join(projDir, 'evidence');
    fs.mkdirSync(evDir, { recursive: true });
    for (const e of files.evidence) fs.writeFileSync(path.join(evDir, e.file), e.content);
  }
  return projDir;
}

/** A complete, honest evidence card that satisfies every gate. */
export function fullCard(
  taskId: string,
  opts: { owner?: string; reviewer?: string; testResult?: string } = {}
): string {
  return [
    `# Evidence Card: ${taskId}`,
    `## Task`,
    taskId,
    `## Owner`,
    opts.owner ?? 'builder',
    `## Reviewer`,
    opts.reviewer ?? 'verifier',
    `## Acceptance Criteria Mapping`,
    `- [x] works`,
    `## Test Result`,
    opts.testResult ?? 'PASS (1 test)',
    `## Reviewer Verdict`,
    `Approved.`,
    ``,
  ].join('\n');
}

/** Run fn with console.log suppressed (validate/loop are chatty). */
export function quiet<T>(fn: () => T): T {
  const orig = console.log;
  console.log = () => {};
  try {
    return fn();
  } finally {
    console.log = orig;
  }
}
