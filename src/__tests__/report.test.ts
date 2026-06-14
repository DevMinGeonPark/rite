import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import { runLoop } from '../commands/loop';
import { makeRepo, rmRepo, setConfig, setState, writeProject, quiet } from './helpers';

const NOW = '2026-03-03T00:00:00Z';
const RUN_DIR = (repo: string) =>
  path.join(repo, '.rite', 'projects', 'p', 'loops', `loop-${NOW.replace(/[:.]/g, '-')}`);

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

test('report.md and report.json are written for every run', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { loop: { runner: '', max_iterations_per_run: 3 } });
    writeProject(repo, 'p', { board: BOARD_READY, tasks: AUTO_READY });
    quiet(() => runLoop({ cwd: repo, dryRun: true, now: NOW }));
    assert.ok(fs.existsSync(path.join(RUN_DIR(repo), 'report.md')));
    assert.ok(fs.existsSync(path.join(RUN_DIR(repo), 'report.json')));
  } finally {
    rmRepo(repo);
  }
});

test('report.json records the stop reason and iteration list', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    setConfig(repo, { loop: { runner: '', max_iterations_per_run: 3 } });
    writeProject(repo, 'p', { board: BOARD_READY, tasks: AUTO_READY });
    quiet(() => runLoop({ cwd: repo, dryRun: true, now: NOW }));
    const j = JSON.parse(fs.readFileSync(path.join(RUN_DIR(repo), 'report.json'), 'utf8'));
    assert.equal(j.stop, 'dry-run');
    assert.equal(j.project, 'p');
    assert.ok(Array.isArray(j.iterations));
    assert.equal(j.iterations[0].taskId, 'task-001');
  } finally {
    rmRepo(repo);
  }
});

test('on_report hook fires with the report path', () => {
  const repo = makeRepo();
  try {
    setState(repo, 'p');
    const marker = path.join(repo, 'hook-ran.txt');
    setConfig(repo, {
      loop: { runner: '', max_iterations_per_run: 3, on_report: `touch ${marker} #` },
    });
    writeProject(repo, 'p', { board: BOARD_READY, tasks: AUTO_READY });
    quiet(() => runLoop({ cwd: repo, dryRun: true, now: NOW }));
    assert.ok(fs.existsSync(marker), 'on_report hook should have run');
  } finally {
    rmRepo(repo);
  }
});
