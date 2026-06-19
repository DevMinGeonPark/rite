/**
 * Small statistics helpers for the evaluation harness. Pure — unit-testable.
 * The point: never report a bare rate without an interval. With tiny n (and
 * rates at the 0%/100% boundary), Wald intervals are wrong; use Wilson.
 */

export interface Interval {
  p: number; // point estimate x/n
  lo: number; // lower bound (clamped to [0,1])
  hi: number; // upper bound (clamped to [0,1])
  n: number;
  x: number;
  method: 'wilson';
  z: number;
}

/**
 * Wilson score interval for a binomial proportion. Default z=1.96 (95%).
 * Handles the boundary cases (x=0 or x=n) sensibly, unlike the Wald interval
 * which collapses to a zero-width interval there.
 */
export function wilson(x: number, n: number, z = 1.96): Interval {
  if (n <= 0) return { p: 0, lo: 0, hi: 1, n: 0, x: 0, method: 'wilson', z };
  const p = x / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const half = (z / denom) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return {
    p,
    lo: Math.max(0, center - half),
    hi: Math.min(1, center + half),
    n,
    x,
    method: 'wilson',
    z,
  };
}

/** Format an Interval as a percentage with its CI, e.g. "16.7% (CI 3.0–56.4%, n=6)". */
export function pct(iv: Interval): string {
  const f = (v: number) => (v * 100).toFixed(1);
  return `${f(iv.p)}% (95% CI ${f(iv.lo)}–${f(iv.hi)}%, n=${iv.n})`;
}

export interface Confusion {
  tp: number; // forged correctly rejected
  fp: number; // genuine wrongly rejected
  tn: number; // genuine correctly accepted
  fn: number; // forged wrongly accepted (the dangerous one)
}

/** Standard binary-classification metrics (GuardBench convention). */
export function classMetrics(c: Confusion) {
  const { tp, fp, tn, fn } = c;
  const safeDiv = (a: number, b: number) => (b === 0 ? 0 : a / b);
  const precision = safeDiv(tp, tp + fp);
  const recall = safeDiv(tp, tp + fn); // = 1 - FNR
  const f1 = safeDiv(2 * precision * recall, precision + recall);
  // Matthews correlation coefficient — robust to class imbalance.
  const denom = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const mcc = denom === 0 ? 0 : (tp * tn - fp * fn) / denom;
  return {
    precision,
    recall,
    f1,
    mcc,
    far: safeDiv(fn, fn + tp), // false-accept rate over forged
    frr: safeDiv(fp, fp + tn), // false-reject rate over genuine
  };
}
