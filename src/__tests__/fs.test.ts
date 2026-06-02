import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { writeFileSafe, copyTree, readText, exists } from '../core/fs';

let counter = 0;
function tmpDir(): string {
  const d = path.join(os.tmpdir(), `rite-fs-test-${process.pid}-${counter++}`);
  fs.mkdirSync(d, { recursive: true });
  return d;
}

test('writeFileSafe: new file → created', () => {
  const dir = tmpDir();
  try {
    const f = path.join(dir, 'a', 'b.txt'); // also exercises parent-dir creation
    assert.equal(writeFileSafe(f, 'hello'), 'created');
    assert.equal(readText(f), 'hello');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('writeFileSafe: identical content → skipped (quiet rerun)', () => {
  const dir = tmpDir();
  try {
    const f = path.join(dir, 'x.txt');
    writeFileSafe(f, 'same');
    assert.equal(writeFileSafe(f, 'same'), 'skipped');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('writeFileSafe: different content WITHOUT force → skipped, original preserved', () => {
  const dir = tmpDir();
  try {
    const f = path.join(dir, 'user.txt');
    writeFileSafe(f, 'original');
    const res = writeFileSafe(f, 'incoming');
    assert.equal(res, 'skipped', 'must not overwrite a user-modified file by default');
    assert.equal(readText(f), 'original', 'original content must survive');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('writeFileSafe: different content WITH force → overwritten', () => {
  const dir = tmpDir();
  try {
    const f = path.join(dir, 'gen.txt');
    writeFileSafe(f, 'old');
    assert.equal(writeFileSafe(f, 'new', { force: true }), 'overwritten');
    assert.equal(readText(f), 'new');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('copyTree: recursively copies files and is idempotent on rerun', () => {
  const src = tmpDir();
  const dest = tmpDir();
  try {
    fs.mkdirSync(path.join(src, 'sub'), { recursive: true });
    fs.writeFileSync(path.join(src, 'top.txt'), 'T');
    fs.writeFileSync(path.join(src, 'sub', 'nested.txt'), 'N');

    const first = copyTree(src, dest);
    assert.equal(first.length, 2);
    assert.ok(first.every((a) => a.result === 'created'));
    assert.ok(exists(path.join(dest, 'sub', 'nested.txt')));

    const second = copyTree(src, dest);
    assert.ok(second.every((a) => a.result === 'skipped'), 'second copy is a no-op');
  } finally {
    fs.rmSync(src, { recursive: true, force: true });
    fs.rmSync(dest, { recursive: true, force: true });
  }
});
