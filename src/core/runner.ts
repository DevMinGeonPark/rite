import { runCommand, ExecResult } from './exec';

export interface RunnerOutcome extends ExecResult {
  reportedCostUsd?: number;
  reportedTurns?: number;
}

/**
 * Spawn the external headless runner (the inner agentic loop) for one packet.
 * `{packet_path}` in the configured command is substituted with the packet
 * file; if the placeholder is absent, the path is appended.
 *
 * The runner's stdout is treated as INFORMATION only (we opportunistically
 * parse cost/turns from Claude-Code-style JSON). It is never the completion
 * judgment — the loop gates "done" via `rite validate`, not this output.
 */
export function spawnRunner(
  runnerCmd: string,
  packetPath: string,
  opts: { cwd?: string; timeoutMs?: number }
): RunnerOutcome {
  const cmd = runnerCmd.includes('{packet_path}')
    ? runnerCmd.split('{packet_path}').join(packetPath)
    : `${runnerCmd} ${packetPath}`;
  const res = runCommand(cmd, opts);

  let reportedCostUsd: number | undefined;
  let reportedTurns: number | undefined;
  try {
    const j = JSON.parse(res.stdout);
    if (j && typeof j === 'object') {
      reportedCostUsd = pickNumber(j, ['total_cost_usd', 'cost_usd', 'costUSD']);
      reportedTurns = pickNumber(j, ['num_turns', 'turns', 'numTurns']);
    }
  } catch {
    // non-JSON output is fine; cost/turns simply stay undefined
  }

  return { ...res, reportedCostUsd, reportedTurns };
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'number') return v;
  }
  return undefined;
}
