#!/usr/bin/env node
/** Registers the installed IDI skill without copying it or using npm's cache. */
import { access, lstat, mkdir, readlink, symlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

const packageName = '@intent-driven-interface/skill';
const usage = `Usage: npx ${packageName} add-skill --agent <codex|claude>

Run from your project's package.json directory after installing:
  npm install --save-dev ${packageName}

Creates a project-local symlink to the installed skill:
  codex   .agents/skills/intent-driven-interface
  claude  .claude/skills/intent-driven-interface`;

/** Preserve the node_modules path so upgrades keep the link valid, even with hoisting. */
async function findInstalledSkill(projectDirectory) {
  let directory = projectDirectory;
  while (true) {
    const packageDirectory = join(directory, 'node_modules', packageName);
    try {
      await access(join(packageDirectory, 'SKILL.md'));
      return packageDirectory;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(
        `No installed ${packageName} found. Run npm install --save-dev ${packageName} first.`
      );
    }
    directory = parent;
  }
}

/** Add a relative directory symlink, accepting repeat runs without replacing user files. */
async function addSkill(agentDirectory) {
  const projectDirectory = process.cwd();
  await access(join(projectDirectory, 'package.json'));
  const packageDirectory = await findInstalledSkill(projectDirectory);
  const skillsDirectory = join(projectDirectory, agentDirectory, 'skills');
  const destination = join(skillsDirectory, 'intent-driven-interface');
  const target = relative(skillsDirectory, packageDirectory);

  process.stdout.write(`Adding skill: ${destination} → ${target}\n`);
  await mkdir(skillsDirectory, { recursive: true });
  try {
    await symlink(target, destination, 'dir');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await lstat(destination);
    if (
      existing.isSymbolicLink() &&
      resolve(skillsDirectory, await readlink(destination)) === packageDirectory
    ) {
      process.stdout.write('Skipped: the skill is already linked correctly.\n');
      return;
    }
    throw new Error(`Refusing to replace existing path: ${destination}`, {
      cause: error,
    });
  }
  process.stdout.write(
    'Skill linked. Dependency updates will update its content automatically.\n'
  );
}

/** Validate the explicit command and agent before making any filesystem changes. */
async function main() {
  const { values, positionals } = parseArgs({
    options: {
      agent: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  if (positionals.length !== 1 || positionals[0] !== 'add-skill') {
    throw new Error(usage);
  }
  switch (values.agent) {
    case 'codex':
      await addSkill('.agents');
      break;
    case 'claude':
      await addSkill('.claude');
      break;
    default:
      throw new Error(`Choose --agent codex or --agent claude.\n\n${usage}`);
  }
}

main().catch((error) => {
  process.stderr.write(`Could not add skill: ${error.message}\n`);
  process.exitCode = 1;
});
