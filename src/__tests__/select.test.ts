import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  eligibleTasks,
  nextEligible,
  doneTaskIds,
  openBlockerTaskIds,
  LoopTask,
  LoopBoard,
} from '../core/select';

const readyAuto: LoopTask = { id: 'task-001', status: 'ready', autonomy: 'auto' };
const board = (lanes: Record<string, string[]>, blockers?: LoopBoard['blockers']): LoopBoard => ({
  lanes,
  blockers,
});

test('auto + ready + no deps → eligible', () => {
  const e = eligibleTasks([readyAuto], board({ ready: ['task-001'] }));
  assert.equal(e.length, 1);
});

test('absent autonomy → NOT eligible (fail-closed)', () => {
  const e = eligibleTasks([{ id: 'task-001', status: 'ready' }], board({ ready: ['task-001'] }));
  assert.equal(e.length, 0);
});

test('autonomy assisted/human-only → NOT eligible', () => {
  const tasks: LoopTask[] = [
    { id: 'a', status: 'ready', autonomy: 'assisted' },
    { id: 'b', status: 'ready', autonomy: 'human-only' },
  ];
  assert.equal(eligibleTasks(tasks, board({ ready: ['a', 'b'] })).length, 0);
});

test('status not ready → NOT eligible', () => {
  const e = eligibleTasks(
    [{ id: 'task-001', status: 'in_progress', autonomy: 'auto' }],
    board({ in_progress: ['task-001'] })
  );
  assert.equal(e.length, 0);
});

test('dependency not done → NOT eligible; done → eligible', () => {
  const t: LoopTask = { id: 'task-002', status: 'ready', autonomy: 'auto', depends_on: ['task-001'] };
  // dep not done
  assert.equal(eligibleTasks([t], board({ ready: ['task-002'] })).length, 0);
  // dep done (in done lane)
  const tasks = [{ id: 'task-001', status: 'done' }, t];
  assert.equal(eligibleTasks(tasks, board({ done: ['task-001'], ready: ['task-002'] })).length, 1);
});

test('open blocker → NOT eligible', () => {
  const e = eligibleTasks(
    [readyAuto],
    board({ ready: ['task-001'] }, [{ id: 'b1', task: 'task-001', status: 'open' }])
  );
  assert.equal(e.length, 0);
});

test('resolved blocker does not block', () => {
  const e = eligibleTasks(
    [readyAuto],
    board({ ready: ['task-001'] }, [{ id: 'b1', task: 'task-001', status: 'resolved' }])
  );
  assert.equal(e.length, 1);
});

test('nextEligible returns first eligible, null when none', () => {
  assert.equal(nextEligible([readyAuto], board({ ready: ['task-001'] }))?.id, 'task-001');
  assert.equal(nextEligible([], board({})), null);
});

test('doneTaskIds: union of done lane and status:done', () => {
  const ids = doneTaskIds(
    [{ id: 'x', status: 'done' }, { id: 'y', status: 'ready' }],
    board({ done: ['z'] })
  );
  assert.ok(ids.has('x') && ids.has('z') && !ids.has('y'));
});

test('openBlockerTaskIds: only open blockers', () => {
  const ids = openBlockerTaskIds(
    board({}, [
      { task: 'a', status: 'open' },
      { task: 'b', status: 'resolved' },
    ])
  );
  assert.ok(ids.has('a') && !ids.has('b'));
});
