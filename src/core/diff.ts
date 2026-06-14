import { runCommand } from './exec';

export interface DiffStat {
  files: number;
  insertions: number;
  deletions: number;
  lines: number; // insertions + deletions
}

export interface BudgetCheck {
  stat: DiffStat;
  maxFiles: number;
  maxLines: number;
  filesOver: boolean;
  linesOver: boolean;
  over: boolean;
}

/**
 * Parse `git diff --numstat` output into a {files, insertions, deletions}
 * count. Pure — unit-testable without git. Binary files report "-\t-\t<path>";
 * they count as a changed file but contribute 0 lines.
 */
export function parseNumstat(numstat: string): DiffStat {
  let files = 0;
  let insertions = 0;
  let deletions = 0;
  for (const raw of numstat.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split('\t');
    if (cols.length < 3) continue;
    files++;
    const added = cols[0] === '-' ? 0 : parseInt(cols[0], 10) || 0;
    const deleted = cols[1] === '-' ? 0 : parseInt(cols[1], 10) || 0;
    insertions += added;
    deletions += deleted;
  }
  return { files, insertions, deletions, lines: insertions + deletions };
}

/** Run `git diff --numstat <base>` in `cwd` and parse the result. */
export function gitDiffStat(base: string, cwd: string): DiffStat {
  const res = runCommand(`git diff --numstat ${base}`, { cwd });
  return parseNumstat(res.stdout);
}

/** Compare a DiffStat against configured budgets. */
export function checkBudget(stat: DiffStat, maxFiles: number, maxLines: number): BudgetCheck {
  const filesOver = stat.files > maxFiles;
  const linesOver = stat.lines > maxLines;
  return { stat, maxFiles, maxLines, filesOver, linesOver, over: filesOver || linesOver };
}
