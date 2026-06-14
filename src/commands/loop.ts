import * as path from 'path';
import * as fs from 'fs';
import { exists, ensureDir, readTextOrNull } from '../core/fs';
import { readYaml, stringifyYaml } from '../core/yaml';
import { findRiteDir, repoRootFor } from '../core/paths';
import { runValidate } from './validate';
import { LoopTask, LoopBoard, nextEligible, eligibleTasks } from '../core/select';
import { renderPacket } from '../core/packet';
import { spawnRunner } from '../core/runner';
import { runCommand } from '../core/exec';

export interface LoopOptions {
  cwd?: string;
  maxIterations?: number;
  dryRun?: boolean;
  /** Stamp for the run id; injected by callers/tests so the core stays pure-ish. */
  now?: string;
}

interface Config {
  commands?: { test?: string };
  loop?: {
    runner?: string;
    max_iterations_per_run?: number;
    max_consecutive_failures?: number;
    iteration_timeout_minutes?: number;
    on_report?: string;
  };
}
interface State {
  current_project?: string | null;
}
interface Tasks {
  tasks?: LoopTask[];
}

type StopReason =
  | 'all-done'
  | 'no-eligible-tasks'
  | 'iteration-cap'
  | 'hold'
  | 'dry-run'
  | 'config-error';

interface IterationRecord {
  iteration: number;
  taskId: string;
  verdict: 'PROMOTE' | 'FAIL' | 'DRY';
  detail: string;
  runnerExit?: number;
  costUsd?: number;
  turns?: number;
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

export function runLoop(opts: LoopOptions): number {
  const start = path.resolve(opts.cwd ?? process.cwd());
  const riteDir = findRiteDir(start);
  if (!riteDir) {
    console.error(`rite loop: no .rite/ found from ${start}. Run \`rite init\` first.`);
    return 1;
  }
  const repo = repoRootFor(riteDir);
  const cfg = readYaml<Config>(path.join(riteDir, 'config.yaml')) ?? {};
  const state = readYaml<State>(path.join(riteDir, 'state.yaml'));
  const projectId = state?.current_project;
  if (!projectId) {
    console.error('rite loop: state.yaml has no current_project. Run /rite-kickoff first.');
    return 1;
  }
  const projDir = path.join(riteDir, 'projects', projectId);
  if (!exists(projDir)) {
    console.error(`rite loop: project dir not found: .rite/projects/${projectId}/`);
    return 1;
  }

  const runnerCmd = cfg.loop?.runner ?? '';
  const configCap = cfg.loop?.max_iterations_per_run ?? 6;
  // --max-iterations can only lower the cap, never raise it (runtime authority).
  const maxIterations = Math.max(1, Math.min(opts.maxIterations ?? configCap, configCap));
  const maxConsecFail = cfg.loop?.max_consecutive_failures ?? 2;
  const timeoutMs = (cfg.loop?.iteration_timeout_minutes ?? 30) * 60 * 1000;

  const stamp = (opts.now ?? new Date().toISOString()).replace(/[:.]/g, '-');
  const runId = `loop-${stamp}`;
  const runDir = path.join(projDir, 'loops', runId);
  ensureDir(runDir);

  console.log(`\nRite loop → ${projectId}  (run ${runId})`);
  console.log(
    `  caps: max_iterations=${maxIterations}, max_consecutive_failures=${maxConsecFail}, dry_run=${!!opts.dryRun}\n`
  );

  const records: IterationRecord[] = [];
  let consecutiveFailures = 0;
  let stop: StopReason = 'iteration-cap';
  let iteration = 0;
  let completed = false;

  for (; iteration < maxIterations; iteration++) {
    const tasks = readYaml<Tasks>(path.join(projDir, 'tasks.yaml'))?.tasks ?? [];
    const board = readYaml<LoopBoard>(path.join(projDir, 'board.yaml')) ?? {};
    const task = nextEligible(tasks, board);

    if (!task || !task.id) {
      stop = allDone(tasks) ? 'all-done' : 'no-eligible-tasks';
      completed = true;
      break;
    }

    const packet = buildPacket(riteDir, projDir, projectId, task);
    const packetPath = path.join(runDir, `packet-${task.id}.md`);
    fs.writeFileSync(packetPath, packet);
    console.log(
      `  [${iteration + 1}/${maxIterations}] task ${task.id} — packet ${path.relative(repo, packetPath)}`
    );

    if (opts.dryRun) {
      records.push({
        iteration: iteration + 1,
        taskId: task.id,
        verdict: 'DRY',
        detail: 'dry-run: packet rendered, runner not spawned',
      });
      stop = 'dry-run';
      completed = true;
      break;
    }

    if (!runnerCmd) {
      console.error('  ✗ loop.runner not configured in .rite/config.yaml — use --dry-run to preview.');
      records.push({
        iteration: iteration + 1,
        taskId: task.id,
        verdict: 'FAIL',
        detail: 'loop.runner not configured',
      });
      stop = 'config-error';
      completed = true;
      break;
    }

    const base = currentHead(repo);
    const outcome = spawnRunner(runnerCmd, packetPath, { cwd: repo, timeoutMs });
    console.log(
      `      runner exit ${outcome.exitCode}${outcome.timedOut ? ' (timeout)' : ''} (${outcome.durationMs}ms)`
    );

    // GATE — the runtime decides, not the runner's stdout.
    const gate = gateTask(repo, projDir, task.id, base);
    records.push({
      iteration: iteration + 1,
      taskId: task.id,
      verdict: gate.verdict,
      detail: gate.detail,
      runnerExit: outcome.exitCode,
      costUsd: outcome.reportedCostUsd,
      turns: outcome.reportedTurns,
    });
    console.log(`      gate: ${gate.verdict} — ${gate.detail}`);

    if (gate.verdict === 'PROMOTE') {
      consecutiveFailures = 0;
      appendStatusLog(projDir, runId, `${task.id} PROMOTED to done by loop.`);
    } else {
      consecutiveFailures++;
      if (consecutiveFailures >= maxConsecFail) {
        stop = 'hold';
        completed = true;
        break;
      }
    }
  }

  if (!completed && iteration >= maxIterations) stop = 'iteration-cap';

  writeReport(repo, runDir, runId, projectId, records, stop);
  appendStatusLog(
    projDir,
    runId,
    `loop finished: ${records.length} iteration(s), stop=${stop}.`
  );
  fireHook(cfg.loop?.on_report, path.join(runDir, 'report.md'), repo);

  if (stop === 'hold') return 2;
  if (stop === 'config-error') return 1;
  return 0;
}

// ---------- helpers ----------

function buildPacket(riteDir: string, projDir: string, projectId: string, task: LoopTask): string {
  const constitution = readTextOrNull(path.join(riteDir, 'context', 'constitution.md')) ?? '';
  const spec = readTextOrNull(path.join(projDir, 'spec.md')) ?? '';
  const lessons = readTextOrNull(path.join(riteDir, 'context', 'lessons.md')) ?? '';
  const taskBlock = stringifyYaml({ task });
  return renderPacket({
    projectId,
    taskId: task.id ?? '(unknown)',
    constitution,
    spec,
    taskBlock,
    lessons,
  });
}

interface GateResult {
  verdict: 'PROMOTE' | 'FAIL';
  detail: string;
}

/**
 * Tentatively promote the task to done, then let `rite validate` (tests + diff
 * budget + evidence/structure gates) be the judge. Pass → PROMOTE; fail → roll
 * the board back to review and FAIL. This reuses every gate validate enforces,
 * so the loop cannot accept what validate would reject.
 */
function gateTask(repo: string, projDir: string, taskId: string, base: string | undefined): GateResult {
  moveTaskToLane(projDir, taskId, 'done', 'done');
  const v = runValidateQuiet({ cwd: repo, runTests: true, diffBudgetBase: base || undefined });
  if (v === 0) {
    return { verdict: 'PROMOTE', detail: 'validate passed (tests + diff budget + evidence)' };
  }
  moveTaskToLane(projDir, taskId, 'review', 'review');
  return { verdict: 'FAIL', detail: 'validate failed; board rolled back to review (diff preserved)' };
}

function runValidateQuiet(opts: Parameters<typeof runValidate>[0]): number {
  const orig = console.log;
  console.log = () => {};
  try {
    return runValidate(opts);
  } finally {
    console.log = orig;
  }
}

/** Move a task into exactly one lane and sync its status in board + tasks.yaml. */
function moveTaskToLane(projDir: string, taskId: string, lane: string, status: string): void {
  const boardPath = path.join(projDir, 'board.yaml');
  const board = readYaml<Record<string, unknown>>(boardPath) ?? {};
  const lanes = ((board.lanes ??= {}) as Record<string, string[]>);
  for (const key of Object.keys(lanes)) {
    lanes[key] = (lanes[key] ?? []).filter((x) => x !== taskId);
  }
  (lanes[lane] ??= []).push(taskId);
  const owners = board.owners as Record<string, { status?: string }> | undefined;
  if (owners?.[taskId]) owners[taskId].status = status;
  fs.writeFileSync(boardPath, stringifyYaml(board));

  const tasksPath = path.join(projDir, 'tasks.yaml');
  const td = readYaml<{ tasks?: { id?: string; status?: string }[] }>(tasksPath) ?? {};
  for (const t of td.tasks ?? []) if (t.id === taskId) t.status = status;
  fs.writeFileSync(tasksPath, stringifyYaml(td));
}

function allDone(tasks: LoopTask[]): boolean {
  return tasks.length > 0 && tasks.every((t) => norm(t.status) === 'done');
}

function currentHead(repo: string): string | undefined {
  const res = runCommand('git rev-parse HEAD', { cwd: repo });
  if (res.exitCode !== 0) return undefined;
  return res.stdout.trim() || undefined;
}

function appendStatusLog(projDir: string, runId: string, message: string): void {
  const boardPath = path.join(projDir, 'board.yaml');
  const board = readYaml<Record<string, unknown>>(boardPath);
  if (!board) return;
  const log = ((board.status_log ??= []) as unknown[]);
  log.push({ at: new Date().toISOString(), by: 'rite-loop', run: runId, message });
  fs.writeFileSync(boardPath, stringifyYaml(board));
}

function writeReport(
  repo: string,
  runDir: string,
  runId: string,
  projectId: string,
  records: IterationRecord[],
  stop: StopReason
): void {
  const promoted = records.filter((r) => r.verdict === 'PROMOTE').length;
  const failed = records.filter((r) => r.verdict === 'FAIL').length;

  const rows = records.length
    ? records
        .map(
          (r) =>
            `| ${r.iteration} | ${r.taskId} | ${r.verdict} | ${r.detail}${
              r.costUsd != null ? ` | $${r.costUsd}` : ' | —'
            }${r.turns != null ? ` | ${r.turns}` : ' | —'} |`
        )
        .join('\n')
    : '| — | (none) | — | no iterations | — | — |';

  const md = [
    `# Loop report — ${projectId}`,
    ``,
    `- Run: \`${runId}\``,
    `- Stop reason: **${stop}**`,
    `- Iterations: ${records.length}  ·  PROMOTE ${promoted}  ·  FAIL ${failed}`,
    ``,
    `| # | task | verdict | detail | cost | turns |`,
    `|---|------|---------|--------|------|-------|`,
    rows,
    ``,
    `> Verdicts are runtime judgments (\`rite validate\`: tests + diff budget +`,
    `> evidence). Runner stdout is not the judge. Merge/deploy remain human.`,
    ``,
  ].join('\n');

  fs.writeFileSync(path.join(runDir, 'report.md'), md);
  fs.writeFileSync(
    path.join(runDir, 'report.json'),
    JSON.stringify({ runId, project: projectId, stop, promoted, failed, iterations: records }, null, 2)
  );

  console.log(`\n  report: ${path.relative(repo, path.join(runDir, 'report.md'))}`);
  console.log(`  stop: ${stop} — ${promoted} promoted, ${failed} failed\n`);
}

function fireHook(hook: string | undefined, reportPath: string, repo: string): void {
  if (!hook) return;
  const cmd = hook.includes('{report_path}')
    ? hook.split('{report_path}').join(reportPath)
    : `${hook} ${reportPath}`;
  runCommand(cmd, { cwd: repo, timeoutMs: 60 * 1000 });
}
