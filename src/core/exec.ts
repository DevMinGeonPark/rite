import { spawnSync } from 'child_process';

export interface ExecResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

/**
 * Run a shell command and capture its result. Used as the ground-truth oracle
 * for `validate --run-tests` and for spawning the loop runner — the parts of
 * Rite that must observe reality rather than trust an agent's claim.
 *
 * Synchronous on purpose: validate/loop are sequential CLI flows, and a
 * blocking call keeps control flow (and timeouts) simple and deterministic.
 */
export function runCommand(
  command: string,
  opts: { cwd?: string; timeoutMs?: number; env?: NodeJS.ProcessEnv } = {}
): ExecResult {
  const start = process.hrtime.bigint();
  const res = spawnSync(command, {
    shell: true,
    cwd: opts.cwd,
    timeout: opts.timeoutMs,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: opts.env ?? process.env,
  });
  const durationMs = Number(process.hrtime.bigint() - start) / 1e6;

  // spawnSync sets .signal (e.g. SIGTERM) when killed by timeout.
  const timedOut = res.signal != null && opts.timeoutMs != null;
  // status is null when the process was killed by a signal; treat as failure.
  const exitCode = res.status ?? (timedOut ? 124 : 1);

  return {
    command,
    exitCode,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    durationMs: Math.round(durationMs),
    timedOut,
  };
}
