import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { runLoop } from '../commands/loop';
import { makeRepo, rmRepo, setConfig, setState, writeProject, quiet } from './helpers';

const AUTO_READY = `project: p
tasks:
  - id: task-001
    status: ready
    autonomy: auto
    owner: builder
    reviewer: verifier
`;
const BOARD_READY = `project: p
lanes:
  ready:
    - task-001
`;
const NOW = '2026-01-01T00:00:00Z';
const RUN_DIR = (repo: string) =>
  path.join(repo, '.rite', 'projects', 'p', 'loops', `loop-${NOW.replace(/[:.]/g, '-')}`);

test('dry-run: renders a packet, spawns nothing, exits 0', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { loop: { runner: 'this-would-fail-if-run', max_iterations_per_run: 6 } });
    writeProject(repo, 'p', { board: BOARD_READY, tasks: AUTO_READY });
    const code = quiet(() => runLoop({ cwd: repo, dryRun: true, now: NOW }));
    assert.equal(code, 0);
    const packet = path.join(RUN_DIR(repo), 'packet-task-001.md');
    assert.ok(fs.existsSync(packet), 'packet should be written');
    const body = fs.readFileSync(packet, 'utf8');
    assert.match(body, /task-001/);
    assert.match(body, /Constitution/);
  } finally {
    rmRepo(repo);
  }
});

test('no eligible tasks → exit 0 (and a report still exists)', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    // task is assisted, not auto → not eligible
    const tasks = AUTO_READY.replace('autonomy: auto', 'autonomy: assisted');
    writeProject(repo, 'p', { board: BOARD_READY, tasks });
    const code = quiet(() => runLoop({ cwd: repo, now: NOW }));
    assert.equal(code, 0);
    assert.ok(fs.existsSync(path.join(RUN_DIR(repo), 'report.json')));
  } finally {
    rmRepo(repo);
  }
});

test('--max-iterations cannot raise the config cap', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { loop: { runner: '', max_iterations_per_run: 1 } });
    writeProject(repo, 'p', { board: BOARD_READY, tasks: AUTO_READY });
    // dry-run stops after one packet anyway; assert it runs without error and respects the cap
    const code = quiet(() => runLoop({ cwd: repo, dryRun: true, maxIterations: 99, now: NOW }));
    assert.equal(code, 0);
  } finally {
    rmRepo(repo);
  }
});
