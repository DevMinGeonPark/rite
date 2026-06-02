#!/usr/bin/env node
import { Command } from 'commander';
import { runInit } from './commands/init';
import { runValidate } from './commands/validate';
import { runDoctor } from './commands/doctor';
import { runExport } from './commands/export';

const TOOL_CHOICES = ['claude', 'codex', 'both'] as const;
export type Tool = (typeof TOOL_CHOICES)[number];

function parseTool(value: string): Tool {
  if (!(TOOL_CHOICES as readonly string[]).includes(value)) {
    throw new Error(`--tool must be one of: ${TOOL_CHOICES.join(', ')}`);
  }
  return value as Tool;
}

const program = new Command();

program
  .name('rite')
  .description(
    'Rite — an artifact-first AI development team manager for Claude Code and Codex.\nRite before write.'
  )
  .version('0.1.0');

program
  .command('init')
  .description('Install Rite (.rite/ runtime + skill packs) into the current repository')
  .option('--tool <tool>', 'which tool adapters to generate: claude | codex | both', 'both')
  .option('--force', 'overwrite existing files (default: never overwrite)', false)
  .option('--cwd <dir>', 'target directory (default: current directory)')
  .action((opts) => {
    const tool = parseTool(opts.tool);
    const code = runInit({ tool, force: !!opts.force, cwd: opts.cwd });
    process.exit(code);
  });

program
  .command('validate')
  .description('Validate the .rite/ runtime and project artifacts for consistency')
  .option('--cwd <dir>', 'directory to validate from (default: current directory)')
  .action((opts) => {
    const code = runValidate({ cwd: opts.cwd });
    process.exit(code);
  });

program
  .command('doctor')
  .description('Report installed adapters, missing files, and active project status')
  .option('--cwd <dir>', 'directory to inspect (default: current directory)')
  .action((opts) => {
    const code = runDoctor({ cwd: opts.cwd });
    process.exit(code);
  });

program
  .command('export')
  .description('(Re)generate tool adapter files (skills/commands/AGENTS.md) from templates')
  .requiredOption('--tool <tool>', 'which tool to export: claude | codex | both')
  .option('--cwd <dir>', 'target directory (default: current directory)')
  .action((opts) => {
    const tool = parseTool(opts.tool);
    const code = runExport({ tool, cwd: opts.cwd });
    process.exit(code);
  });

program.parseAsync(process.argv).catch((err) => {
  console.error(`rite: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
