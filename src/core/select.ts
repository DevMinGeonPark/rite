/**
 * Task eligibility for the autonomous loop. Pure functions over already-parsed
 * board/tasks data, so they unit-test without an LLM, git, or the filesystem.
 *
 * Eligibility is FAIL-CLOSED: a task is only auto-runnable when it explicitly
 * declares `autonomy: auto`. A missing/blank autonomy field means "not
 * eligible" — the loop must never pick up judgment work by default.
 */

export interface LoopTask {
  id?: string;
  status?: string;
  depends_on?: string[];
  autonomy?: string;
  owner?: string;
  reviewer?: string;
}

export interface LoopBoard {
  lanes?: Record<string, string[]>;
  blockers?: { id?: string; task?: string; status?: string }[];
}

const norm = (s?: string | null) => (s ?? '').trim().toLowerCase();

/** Ids considered done: present in the board "done" lane OR status: done. */
export function doneTaskIds(tasks: LoopTask[], board: LoopBoard): Set<string> {
  const ids = new Set<string>();
  for (const item of board.lanes?.done ?? []) ids.add(item);
  for (const t of tasks) if (t.id && norm(t.status) === 'done') ids.add(t.id);
  return ids;
}

/** Tasks named by an open blocker. */
export function openBlockerTaskIds(board: LoopBoard): Set<string> {
  const s = new Set<string>();
  for (const b of board.blockers ?? []) {
    if (norm(b.status) === 'open' && b.task) s.add(b.task);
  }
  return s;
}

export interface EligibilityReason {
  eligible: boolean;
  reason: string;
}

/** Explain why a single task is or isn't loop-eligible. */
export function explainEligibility(
  t: LoopTask,
  done: Set<string>,
  blocked: Set<string>
): EligibilityReason {
  if (norm(t.autonomy) !== 'auto') {
    return { eligible: false, reason: `autonomy is "${t.autonomy ?? '(unset)'}" not "auto"` };
  }
  if (norm(t.status) !== 'ready') {
    return { eligible: false, reason: `status is "${t.status ?? '(unset)'}" not "ready"` };
  }
  if (!t.id) return { eligible: false, reason: 'task has no id' };
  if (blocked.has(t.id)) return { eligible: false, reason: 'has an open blocker' };
  for (const d of t.depends_on ?? []) {
    if (!done.has(d)) return { eligible: false, reason: `dependency "${d}" is not done` };
  }
  return { eligible: true, reason: 'ready' };
}

export function isEligible(t: LoopTask, done: Set<string>, blocked: Set<string>): boolean {
  return explainEligibility(t, done, blocked).eligible;
}

export function eligibleTasks(tasks: LoopTask[], board: LoopBoard): LoopTask[] {
  const done = doneTaskIds(tasks, board);
  const blocked = openBlockerTaskIds(board);
  return tasks.filter((t) => isEligible(t, done, blocked));
}

/** The next task the loop should attempt, or null if none are eligible. */
export function nextEligible(tasks: LoopTask[], board: LoopBoard): LoopTask | null {
  return eligibleTasks(tasks, board)[0] ?? null;
}
