# Pinterest Automation Skills

## Overview

A repository of AI agent skills (in the [agentskills.io](https://agentskills.io/) format) that other agents can install via `npx skills add ...`. This repo is **content-only** — there is no application to run. Each skill is a single `SKILL.md` file with frontmatter metadata that an agent loads on demand.

## Project Structure

```
/
├── README.md                                # Install instructions and skill index
├── skills/
│   ├── pinterest-api/SKILL.md               # Full REST API reference
│   ├── pinterest-csv/SKILL.md               # CSV and file upload format reference
│   ├── pinterest-workflows/SKILL.md         # Step-by-step automation recipes
│   └── KeysGithubScanner/SKILL.md           # Guide for creating new GitHub API-key scanners
└── show-skills.sh                           # Helper script that lists the available skills
```

## Skills Available

| Skill | Path | Install |
|-------|------|---------|
| pinterest-api | `skills/pinterest-api/SKILL.md` | `npx skills add prohunter00017/pinterest-automation-skills@pinterest-api` |
| pinterest-csv | `skills/pinterest-csv/SKILL.md` | `npx skills add prohunter00017/pinterest-automation-skills@pinterest-csv` |
| pinterest-workflows | `skills/pinterest-workflows/SKILL.md` | `npx skills add prohunter00017/pinterest-automation-skills@pinterest-workflows` |
| KeysGithubScanner | `skills/KeysGithubScanner/SKILL.md` | `npx skills add prohunter00017/pinterest-automation-skills@KeysGithubScanner` |

## Adding a New Skill

1. Create a directory under `skills/` (e.g. `skills/my-new-skill/`).
2. Add a `SKILL.md` file with YAML frontmatter:
   ```
   ---
   name: my-new-skill
   description: One-line description of what this skill helps an agent do.
   ---
   ```
3. Add the skill to the table in `README.md` with the install command.

## Required Environment Variables

| Variable | Used by | Description |
|----------|---------|-------------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | `KeysGithubScanner` | One or more GitHub PATs (comma- or newline-separated) for the GitHub Search API. The skill falls back to a `tokens.txt` file if the env var is not set. |

Set this as a Replit Secret (not a plain env var) so it stays out of the repository.

## Notes

- This repo has no build step, no server, and no runtime dependencies — the skills are plain Markdown.
- The Replit workflow simply prints the list of available skills and keeps the project alive for inspection.
