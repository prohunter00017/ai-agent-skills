# Pinterest Automation Skills

AI agent skills for the [Pinterest Automation Dashboard](https://github.com/prohunter00017/pinterest-automation-web). Install into Claude Code, Cursor, Replit Agent, or any other agent that supports the [agentskills.io](https://agentskills.io/) format with a single command.

## Install

```bash
# Full API reference (endpoints, auth, accounts, boards, pins, proxies, scheduling)
npx skills add prohunter00017/pinterest-automation-skills@pinterest-api

# CSV and upload file formats (pins, boards, save queue, cookies ZIP)
npx skills add prohunter00017/pinterest-automation-skills@pinterest-csv

# Step-by-step workflow recipes (onboarding, bulk scheduling, monitoring)
npx skills add prohunter00017/pinterest-automation-skills@pinterest-workflows
```

Each skill installs as a `SKILL.md` file under your agent's skills directory and is loaded on-demand when the agent decides it's relevant.

## Skills

| Skill | What it covers |
|-------|----------------|
| [`pinterest-api`](skills/pinterest-api/SKILL.md) | Complete REST API reference for the dashboard — endpoints, authentication, accounts, boards, pins, proxies, scheduling. |
| [`pinterest-csv`](skills/pinterest-csv/SKILL.md) | All CSV and upload file formats — pins, boards, save queue, cookies/fingerprints ZIP. |
| [`pinterest-workflows`](skills/pinterest-workflows/SKILL.md) | Step-by-step recipes — onboarding accounts, bulk scheduling, proxy management, monitoring jobs. |

## Alternative: install via npm

If you prefer one package containing all three skills with a CLI installer:

```bash
npx pinterest-automation-skills install --claude    # → .claude/skills/pinterest-automation/
npx pinterest-automation-skills install --cursor    # → .cursor/rules/pinterest-automation/
npx pinterest-automation-skills install --replit    # → .local/skills/pinterest-automation/
npx pinterest-automation-skills install --dir ./skills
```

See [`pinterest-automation-skills` on npm](https://www.npmjs.com/package/pinterest-automation-skills).

## License

MIT
