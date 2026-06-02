import * as fs from 'fs';
import * as path from 'path';

export type WriteResult = 'created' | 'skipped' | 'overwritten';

export interface FileAction {
  path: string;
  result: WriteResult;
}

export function exists(p: string): boolean {
  return fs.existsSync(p);
}

export function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

export function readText(p: string): string {
  return fs.readFileSync(p, 'utf8');
}

export function readTextOrNull(p: string): string | null {
  try {
    return fs.readFileSync(p, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Write `content` to `dest`, creating parent directories.
 * Idempotent: by default never overwrites an existing file (returns 'skipped').
 * Pass `force` to overwrite. Also skips writes when the existing content is
 * byte-identical, so reruns are quiet.
 */
export function writeFileSafe(
  dest: string,
  content: string,
  opts: { force?: boolean } = {}
): WriteResult {
  if (exists(dest)) {
    const current = readTextOrNull(dest);
    if (current === content) return 'skipped';
    if (!opts.force) return 'skipped';
    ensureDir(path.dirname(dest));
    fs.writeFileSync(dest, content, 'utf8');
    return 'overwritten';
  }
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, content, 'utf8');
  return 'created';
}

/** Recursively copy a directory tree, file-by-file, via writeFileSafe. */
export function copyTree(
  srcDir: string,
  destDir: string,
  opts: { force?: boolean } = {}
): FileAction[] {
  const actions: FileAction[] = [];
  if (!exists(srcDir)) return actions;
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const from = path.join(srcDir, entry.name);
    const to = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      actions.push(...copyTree(from, to, opts));
    } else if (entry.isFile()) {
      const result = writeFileSafe(to, readText(from), opts);
      actions.push({ path: to, result });
    }
  }
  return actions;
}

/** List files recursively under `dir`, returning absolute paths. */
export function walkFiles(dir: string): string[] {
  const out: string[] = [];
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

/** Pretty-print a single file action relative to a base directory. */
export function formatAction(action: FileAction, base: string): string {
  const rel = path.relative(base, action.path) || action.path;
  const mark =
    action.result === 'created'
      ? '＋ created   '
      : action.result === 'overwritten'
        ? '↻ overwrote  '
        : '· skipped    ';
  return `  ${mark} ${rel}`;
}

export function summarize(actions: FileAction[]): {
  created: number;
  overwritten: number;
  skipped: number;
} {
  return {
    created: actions.filter((a) => a.result === 'created').length,
    overwritten: actions.filter((a) => a.result === 'overwritten').length,
    skipped: actions.filter((a) => a.result === 'skipped').length,
  };
}
