# Pinterest Automation Skills

AI agent skills for the [Pinterest Automation Dashboard](https://github.com/prohunter00017/pinterest-automation-web) and the [KeysGithubScanner](#keysgithubscanner) toolkit. Install into Claude Code, Cursor, Replit Agent, or any other agent that supports the [agentskills.io](https://agentskills.io/) format with a single command.

## Install

```bash
# Full API reference (endpoints, auth, accounts, boards, pins, proxies, scheduling)
npx skills add prohunter00017/pinterest-automation-skills@pinterest-api

# CSV and upload file formats (pins, boards, save queue, cookies ZIP)
npx skills add prohunter00017/pinterest-automation-skills@pinterest-csv

# Step-by-step workflow recipes (onboarding, bulk scheduling, monitoring)
npx skills add prohunter00017/pinterest-automation-skills@pinterest-workflows

# Guide for building new GitHub API-key scanners (KeysGithubScanner toolkit)
npx skills add prohunter00017/pinterest-automation-skills@KeysGithubScanner
```

Each skill installs as a `SKILL.md` file under your agent's skills directory and is loaded on-demand when the agent decides it's relevant.

## Required Environment Variables

Some skills need credentials. Set these as environment variables in whatever environment runs the skill:

| Variable | Required by | Description |
|----------|-------------|-------------|
| `GITHUB_PERSONAL_ACCESS_TOKEN` | `KeysGithubScanner` | One or more GitHub Personal Access Tokens used to query the GitHub Search API. For multiple tokens, separate them with commas or newlines (e.g. `ghp_xxx,ghp_yyy`). The skill falls back to a local `tokens.txt` file if the env var is not set. |

## Skills

| Skill | What it covers |
|-------|----------------|
| [`pinterest-api`](skills/pinterest-api/SKILL.md) | Complete REST API reference for the dashboard — endpoints, authentication, accounts, boards, pins, proxies, scheduling. |
| [`pinterest-csv`](skills/pinterest-csv/SKILL.md) | All CSV and upload file formats — pins, boards, save queue, cookies/fingerprints ZIP. |
| [`pinterest-workflows`](skills/pinterest-workflows/SKILL.md) | Step-by-step recipes — onboarding accounts, bulk scheduling, proxy management, monitoring jobs. |
| [`KeysGithubScanner`](skills/KeysGithubScanner/SKILL.md) | Step-by-step guide for creating a new API key scanner — searching GitHub, downloading matches, extracting keys with regex, and validating against the service API. |

## Alternative: install via npm

If you prefer one package containing all skills with a CLI installer:

```bash
npx pinterest-automation-skills install --claude    # → .claude/skills/pinterest-automation/
npx pinterest-automation-skills install --cursor    # → .cursor/rules/pinterest-automation/
npx pinterest-automation-skills install --replit    # → .local/skills/pinterest-automation/
npx pinterest-automation-skills install --dir ./skills
```

See [`pinterest-automation-skills` on npm](https://www.npmjs.com/package/pinterest-automation-skills).

## License

MIT
