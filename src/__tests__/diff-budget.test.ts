import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNumstat, checkBudget } from '../core/diff';

test('parseNumstat: counts files, insertions, deletions, lines', () => {
  const s = parseNumstat('1\t2\ta.ts\n3\t0\tb.ts\n');
  assert.equal(s.files, 2);
  assert.equal(s.insertions, 4);
  assert.equal(s.deletions, 2);
  assert.equal(s.lines, 6);
});

test('parseNumstat: binary files count as a file but 0 lines', () => {
  const s = parseNumstat('-\t-\timg.png\n5\t1\tcode.ts\n');
  assert.equal(s.files, 2);
  assert.equal(s.lines, 6); // only code.ts contributes
});

test('parseNumstat: empty / blank input → zeros', () => {
  assert.equal(parseNumstat('').files, 0);
  assert.equal(parseNumstat('\n\n').lines, 0);
});

test('checkBudget: over files → over', () => {
  const c = checkBudget({ files: 9, insertions: 0, deletions: 0, lines: 0 }, 8, 500);
  assert.equal(c.filesOver, true);
  assert.equal(c.over, true);
});

test('checkBudget: over lines → over', () => {
  const c = checkBudget({ files: 1, insertions: 600, deletions: 0, lines: 600 }, 8, 500);
  assert.equal(c.linesOver, true);
  assert.equal(c.over, true);
});

test('checkBudget: within budget → not over', () => {
  const c = checkBudget({ files: 2, insertions: 100, deletions: 40, lines: 140 }, 8, 500);
  assert.equal(c.over, false);
});
