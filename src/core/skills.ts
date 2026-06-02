import * as path from 'path';
import { readTextOrNull } from './fs';
import { readYaml, stringifyYaml } from './yaml';
import { skillsTemplate } from './paths';

/**
 * One canonical skill, described by templates/skills/manifest.yaml. The body
 * lives in templates/skills/<name>/SKILL.md and is shared verbatim across
 * Claude Code and Codex — only the frontmatter (and Codex's optional
 * agents/openai.yaml) differs per platform.
 */
export interface SkillSpec {
  name: string;
  description: string;
  when_to_use?: string;
  argument_hint?: string;
  /** Side-effecting workflows: user-triggered only, never auto-invoked. */
  side_effecting?: boolean;
  /** Tools pre-approved while the skill is active (Claude Code). */
  allowed_tools?: string[];
}

interface Manifest {
  skills: SkillSpec[];
}

export function loadSkillManifest(): SkillSpec[] {
  const manifestPath = path.join(skillsTemplate(), 'manifest.yaml');
  const manifest = readYaml<Manifest>(manifestPath);
  if (!manifest || !Array.isArray(manifest.skills)) {
    throw new Error(`Skill manifest not found or malformed: ${manifestPath}`);
  }
  return manifest.skills;
}

export function loadSkillBody(name: string): string {
  const bodyPath = path.join(skillsTemplate(), name, 'SKILL.md');
  const body = readTextOrNull(bodyPath);
  if (body === null) {
    throw new Error(`Skill body not found: ${bodyPath}`);
  }
  return body.trimEnd() + '\n';
}

function frontmatterBlock(obj: Record<string, unknown>): string {
  // stringifyYaml preserves insertion order, giving us deterministic output.
  return `---\n${stringifyYaml(obj)}---\n`;
}

/**
 * Render a skill for Claude Code: .claude/skills/<name>/SKILL.md
 * The directory name is what sets the /command; `name` is the display label
 * and must equal the directory name (verified against agentskills.io).
 */
export function renderClaudeSkill(spec: SkillSpec, body: string): string {
  const fm: Record<string, unknown> = {
    name: spec.name,
    description: spec.description,
  };
  if (spec.when_to_use) fm.when_to_use = spec.when_to_use;
  if (spec.argument_hint) fm['argument-hint'] = spec.argument_hint;
  // Side-effecting Rite rituals are user-invoked only (no silent auto-trigger).
  if (spec.side_effecting) fm['disable-model-invocation'] = true;
  if (spec.allowed_tools && spec.allowed_tools.length) {
    fm['allowed-tools'] = spec.allowed_tools;
  }
  return frontmatterBlock(fm) + '\n' + body;
}

/**
 * Render a skill for Codex: .agents/skills/<name>/SKILL.md
 * Codex requires name + description; missing frontmatter is a hard parse
 * error. Invocation policy lives in agents/openai.yaml, not the frontmatter.
 */
export function renderCodexSkill(spec: SkillSpec, body: string): string {
  const fm: Record<string, unknown> = {
    name: spec.name,
    description: spec.description,
  };
  if (spec.when_to_use) {
    fm.metadata = { 'short-description': truncate(spec.when_to_use, 1024) };
  }
  return frontmatterBlock(fm) + '\n' + body;
}

/**
 * Codex per-skill metadata. Only emitted for side-effecting skills so we can
 * set allow_implicit_invocation: false — the Codex analog of Claude's
 * disable-model-invocation. Parsed fail-open by Codex, so it never blocks load.
 */
export function renderCodexOpenaiYaml(spec: SkillSpec): string | null {
  if (!spec.side_effecting) return null;
  const doc = {
    interface: {
      display_name: titleCase(spec.name),
      short_description: truncate(spec.description, 200),
    },
    policy: {
      allow_implicit_invocation: false,
    },
  };
  return (
    `# Codex-specific metadata for the "${spec.name}" skill.\n` +
    `# allow_implicit_invocation: false mirrors Claude's disable-model-invocation —\n` +
    `# Rite rituals with side effects are user-triggered, never auto-run.\n` +
    stringifyYaml(doc)
  );
}

/**
 * Legacy Claude Code slash-command shim: .claude/commands/<name>.md
 * Commands merged into skills (~v2.1.3) and the skill wins on name collision,
 * so this exists only for the spec's acceptance test / older Claude Code.
 */
export function renderClaudeCommandShim(spec: SkillSpec): string {
  const fm = frontmatterBlock({
    description: spec.description,
    ...(spec.argument_hint ? { 'argument-hint': spec.argument_hint } : {}),
  });
  return (
    fm +
    '\n' +
    `Run the **${spec.name}** skill.\n\n` +
    `> Legacy shim. Custom commands have been merged into skills; the real ` +
    `logic lives in \`.claude/skills/${spec.name}/SKILL.md\`, which takes ` +
    `precedence on name collision. This file exists for older Claude Code ` +
    `versions that predate the command→skill merge.\n\n` +
    (spec.argument_hint ? 'Arguments: $ARGUMENTS\n' : '') +
    `\nFollow the instructions in the ${spec.name} skill exactly.\n`
  );
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

function titleCase(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
