import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wilson, classMetrics } from '../core/stats';

test('wilson: boundary x=0 stays in [0,1] with non-zero upper bound', () => {
  const iv = wilson(0, 3);
  assert.equal(iv.p, 0);
  assert.equal(iv.lo, 0);
  assert.ok(iv.hi > 0 && iv.hi < 1, `0/3 upper should be wide, got ${iv.hi}`);
});

test('wilson: 1/6 has a wide interval (small-n honesty)', () => {
  const iv = wilson(1, 6);
  assert.ok(Math.abs(iv.p - 1 / 6) < 1e-9);
  assert.ok(iv.lo > 0 && iv.lo < 0.1, `lower ~3%, got ${iv.lo}`);
  assert.ok(iv.hi > 0.4 && iv.hi < 0.7, `upper ~56%, got ${iv.hi}`);
});

test('wilson: x=n upper bound is 1, lower < 1', () => {
  const iv = wilson(5, 5);
  assert.equal(iv.hi, 1);
  assert.ok(iv.lo < 1 && iv.lo > 0.5);
});

test('wilson: n=0 returns the maximally-uncertain interval', () => {
  const iv = wilson(0, 0);
  assert.equal(iv.lo, 0);
  assert.equal(iv.hi, 1);
});

test('classMetrics: perfect gate (no errors) → F1=1, FAR=0, FRR=0, MCC=1', () => {
  const m = classMetrics({ tp: 6, fp: 0, tn: 3, fn: 0 });
  assert.equal(m.far, 0);
  assert.equal(m.frr, 0);
  assert.equal(m.f1, 1);
  assert.ok(Math.abs(m.mcc - 1) < 1e-9);
});

test('classMetrics: one forged slips through → FAR > 0, recall < 1', () => {
  const m = classMetrics({ tp: 5, fp: 0, tn: 3, fn: 1 }); // the OFF condition
  assert.ok(Math.abs(m.far - 1 / 6) < 1e-9);
  assert.equal(m.frr, 0);
  assert.ok(m.recall < 1 && m.precision === 1);
});
