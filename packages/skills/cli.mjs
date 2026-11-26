#!/usr/bin/env node
/** Registers the installed IDI skills without copying them or using npm's cache. */
import { access, lstat, mkdir, readlink, symlink } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { parseArgs } from 'node:util';

import manifest from './package.json' with { type: 'json' };

const packageName = manifest.name;
const registrationCommand = 'add-skills';
const skillNames = ['idi-setup', 'idi-components'];
const defaultAgentName = 'default';
const agentDirectories = new Map([
  [defaultAgentName, '.agents/skills'],
  ['claude', '.claude/skills'],
  ['github', '.github/skills'],
  ['cline', '.cline/skills'],
]);
const usage = `Usage: npx ${packageName} ${registrationCommand} [--agent <agent[,agent...]>]

Run from your project's package.json directory after installing:
  npm install --save-dev ${packageName}

Creates project-local symlinks for ${skillNames.join(' and ')}:
${Array.from(agentDirectories, ([agent, directory]) => `  ${agent.padEnd(7)} ${directory}/`).join('\n')}

Omit --agent to use ${defaultAgentName}. To select multiple agent directories:
  npx ${packageName} ${registrationCommand} --agent ${Array.from(agentDirectories.keys()).join(', ')}`;

/** Preserve the node_modules path so upgrades keep the link valid, even with hoisting. */
async function findInstalledSkillPackage(projectDirectory) {
  let directory = projectDirectory;
  while (true) {
    const packageDirectory = join(directory, 'node_modules', packageName);
    try {
      await access(join(packageDirectory, 'package.json'));
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
async function linkSkill(skillsDirectory, sourceDirectory, skillName) {
  const skillDirectory = join(sourceDirectory, skillName);
  const destination = join(skillsDirectory, skillName);
  const target = relative(skillsDirectory, skillDirectory);

  process.stdout.write(`Adding skill: ${destination} → ${target}\n`);
  try {
    await symlink(target, destination, 'dir');
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await lstat(destination);
    if (
      existing.isSymbolicLink() &&
      resolve(skillsDirectory, await readlink(destination)) === skillDirectory
    ) {
      process.stdout.write('Skipped: the skill is already linked correctly.\n');
      return;
    }
    throw new Error(`Refusing to replace existing path: ${destination}`, {
      cause: error,
    });
  }
}

async function addSkills(skillsDirectories) {
  const projectDirectory = process.cwd();
  await access(join(projectDirectory, 'package.json'));
  const packageDirectory = await findInstalledSkillPackage(projectDirectory);
  const sourceDirectory = join(packageDirectory, 'skills');
  await Promise.all(
    skillNames.map((name) => access(join(sourceDirectory, name, 'SKILL.md')))
  );

  for (const directory of skillsDirectories) {
    const skillsDirectory = join(projectDirectory, directory);
    await mkdir(skillsDirectory, { recursive: true });
    for (const skillName of skillNames) {
      await linkSkill(skillsDirectory, sourceDirectory, skillName);
    }
  }
  process.stdout.write(
    'Skills registered. Dependency updates will update their content automatically.\n'
  );
}

function getSkillsDirectories(agentList) {
  const agents = agentList.split(',').map((agent) => agent.trim());
  return Array.from(new Set(agents), (agent) => {
    const directory = agentDirectories.get(agent);
    if (!directory) {
      throw new Error(
        `Invalid --agent value: ${JSON.stringify(agent)}.\n\n${usage}`
      );
    }
    return directory;
  });
}

/** Validate all targets before making any filesystem changes. */
async function main() {
  const { values, tokens } = parseArgs({
    options: {
      agent: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
    tokens: true,
  });
  if (values.help) {
    process.stdout.write(`${usage}\n`);
    return;
  }
  const [command, agentOption, ...agentContinuations] = tokens;
  if (command?.kind !== 'positional' || command.value !== registrationCommand) {
    throw new Error(usage);
  }
  if (!agentOption) {
    await addSkills(getSkillsDirectories(defaultAgentName));
    return;
  }
  if (
    agentOption.kind !== 'option' ||
    agentOption.name !== 'agent' ||
    agentContinuations.some((token) => token.kind !== 'positional')
  ) {
    throw new Error(usage);
  }

  // Spaces after commas can split the list into several shell arguments.
  const agentList = [
    agentOption.value,
    ...agentContinuations.map((token) => token.value),
  ].join(' ');
  await addSkills(getSkillsDirectories(agentList));
}

main().catch((error) => {
  process.stderr.write(`Could not register IDI skills: ${error.message}\n`);
  process.exitCode = 1;
});
