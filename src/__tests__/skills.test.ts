import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderClaudeSkill,
  renderCodexSkill,
  renderCodexOpenaiYaml,
  renderClaudeCommandShim,
  SkillSpec,
} from '../core/skills';

const sideEffecting: SkillSpec = {
  name: 'rite-run',
  description: 'Implements one ready task as the Builder.',
  argument_hint: '[next | <task-id>]',
  side_effecting: true,
  allowed_tools: ['Read', 'Write', 'Bash(git status *)'],
};

const pure: SkillSpec = {
  name: 'rite-board',
  description: 'Shows current team status like a standup.',
  side_effecting: false,
  allowed_tools: ['Read', 'Grep'],
};

const BODY = '# Heading\n\nSkill body text.\n';

test('renderClaudeSkill: side-effecting skill gets disable-model-invocation + allowed-tools', () => {
  const out = renderClaudeSkill(sideEffecting, BODY);
  assert.match(out, /^---\n/); // frontmatter block
  assert.match(out, /name: rite-run/);
  assert.match(out, /description: /);
  assert.match(out, /argument-hint:/);
  assert.match(out, /disable-model-invocation: true/);
  assert.match(out, /allowed-tools:/);
  assert.match(out, /Bash\(git status \*\)/);
  assert.ok(out.includes(BODY), 'body is appended verbatim');
});

test('renderClaudeSkill: non-side-effecting skill has NO disable-model-invocation', () => {
  const out = renderClaudeSkill(pure, BODY);
  assert.match(out, /name: rite-board/);
  assert.ok(!out.includes('disable-model-invocation'), 'auto-invocable skill must not disable model invocation');
  assert.match(out, /allowed-tools:/);
});

test('renderCodexSkill: emits name + description, but NOT Claude-only invocation fields', () => {
  const out = renderCodexSkill(sideEffecting, BODY);
  assert.match(out, /^---\n/);
  assert.match(out, /name: rite-run/);
  assert.match(out, /description: /);
  // disable-model-invocation is a Claude frontmatter key; Codex uses openai.yaml instead.
  assert.ok(!out.includes('disable-model-invocation'), 'Codex frontmatter must not carry disable-model-invocation');
  assert.ok(out.includes(BODY), 'body is shared verbatim across platforms');
});

test('renderCodexOpenaiYaml: only side-effecting skills get a fail-safe policy file', () => {
  const yes = renderCodexOpenaiYaml(sideEffecting);
  assert.ok(yes !== null, 'side-effecting skill must emit agents/openai.yaml');
  assert.match(yes as string, /allow_implicit_invocation: false/);
  assert.match(yes as string, /interface:/);

  const no = renderCodexOpenaiYaml(pure);
  assert.equal(no, null, 'non-side-effecting skill must NOT emit a policy file');
});

test('renderClaudeCommandShim: is a legacy shim that points back to the skill', () => {
  const out = renderClaudeCommandShim(sideEffecting);
  assert.match(out, /description: /);
  assert.match(out, /argument-hint:/);
  assert.match(out, /Legacy/);
  assert.match(out, /\.claude\/skills\/rite-run\/SKILL\.md/);
});
