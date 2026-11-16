# @intent-driven-interface/skill

Agent instructions for authoring IDI components and integrating `@intent-driven-interface/frontend` and `@intent-driven-interface/backend`.

## Add to your project

Requires Node.js 22+ and npm. Run these commands from the project directory containing your `package.json`:

```sh
npm install --save-dev @intent-driven-interface/skill
npx @intent-driven-interface/skill add-skill --agent codex
```

For Claude Code, use `--agent claude` instead.

The command creates a relative symlink at `.agents/skills/intent-driven-interface` for Codex or `.claude/skills/intent-driven-interface` for Claude Code. The link points to the installed package in `node_modules`, so dependency updates update the skill without rerunning the command. Restart your agent session if it has already loaded the previous instructions.

There is no `postinstall` script. Repeating `add-skill` leaves a correct link unchanged and refuses to overwrite any other existing path. The command requires an installed dependency; it never links into the temporary npm execution cache.

You can commit the symlink so teammates only need to install dependencies, including dev dependencies. Symlink creation and checkout must be supported by their operating system; Windows may require Developer Mode or elevated permissions. Removing `node_modules` leaves the link unavailable until dependencies are reinstalled.

## Skill contents

See [SKILL.md](SKILL.md) for the instructions. This directory is also the canonical Git-hosted skill source.
