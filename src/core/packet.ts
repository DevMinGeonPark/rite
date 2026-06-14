/**
 * Render the per-iteration "run packet" — the fresh context handed to the
 * runner each loop iteration (Ralph pattern: rebuild from disk every time, no
 * growing conversation). Pure string assembly so it is unit-testable; the
 * caller is responsible for reading the source files from `.rite/`.
 *
 * Trust boundary: the packet is built ONLY from `.rite/` artifacts + the task.
 * The loop never injects fetched/web content here (prompt-injection defense).
 */

export interface PacketParts {
  projectId: string;
  taskId: string;
  constitution: string; // hard-rules excerpt
  spec: string;
  taskBlock: string; // the single task, serialized
  lessons: string;
}

const ROLE_INSTRUCTIONS = `## Your role this iteration

You are the **Builder**, then the **Verifier**, for exactly ONE task (below).

1. Implement only this task. Touch only its expected files (plus genuinely
   necessary neighbors — explain any deviation in your notes).
2. Run the project's tests. Write an evidence card at
   \`evidence/<task-id>-evidence.md\` with these sections: \`## Task\`,
   \`## Owner\`, \`## Reviewer\` (must differ), \`## Acceptance Criteria Mapping\`,
   \`## Test Result\` (PASS/FAIL), \`## Reviewer Verdict\`.
3. Move the board lane to \`review\` and set the task status. **Do NOT mark the
   task done** — the Rite runtime gates "done" via \`rite validate\`. Your
   stdout is not the judge; the gate is.
4. Respect the diff budget. Make no unrelated edits, no deploy, no merge.`;

export function renderPacket(p: PacketParts): string {
  return [
    `# Rite run packet — ${p.projectId} / ${p.taskId}`,
    ``,
    `Built fresh from .rite/ for this iteration. Follow the hard rules; the`,
    `runtime, not your self-report, decides completion.`,
    ``,
    `## Constitution (hard rules)`,
    ``,
    p.constitution.trim() || '(constitution unavailable)',
    ``,
    `## Project spec`,
    ``,
    p.spec.trim() || '(spec unavailable)',
    ``,
    `## The one task`,
    ``,
    '```yaml',
    p.taskBlock.trim(),
    '```',
    ``,
    `## Lessons so far`,
    ``,
    p.lessons.trim() || '(no lessons recorded yet)',
    ``,
    ROLE_INSTRUCTIONS,
    ``,
  ].join('\n');
}
