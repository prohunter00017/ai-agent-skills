# Pinterest Automation Skills

## Overview

A documentation web viewer for the [Pinterest Automation Skills](https://github.com/prohunter00017/pinterest-automation-skills) — a set of AI agent skills (agentskills.io format) for the Pinterest Automation Dashboard.

## Project Structure

```
/
├── server.js              # Simple Node.js HTTP server (no dependencies)
├── README.md              # Project overview and install instructions
├── skills/
│   ├── pinterest-api/
│   │   └── SKILL.md       # Full REST API reference
│   ├── pinterest-csv/
│   │   └── SKILL.md       # CSV and file upload format reference
│   └── pinterest-workflows/
│       └── SKILL.md       # Step-by-step automation recipes
```

## Architecture

- **Runtime**: Node.js 20 (no npm dependencies — uses only Node.js built-ins)
- **Server**: `server.js` — a plain `http` module server that reads the Markdown skill files and renders them as HTML
- **Port**: 5000 (0.0.0.0)
- **Markdown rendering**: Custom inline renderer (no external libraries)

## Running the App

```bash
node server.js
```

The server starts on `http://0.0.0.0:5000` and serves the skills content as a styled web page with navigation tabs for each skill.

## Skills Content

| Skill | Path | Description |
|-------|------|-------------|
| pinterest-api | `skills/pinterest-api/SKILL.md` | REST API reference for the dashboard |
| pinterest-csv | `skills/pinterest-csv/SKILL.md` | CSV/file upload format definitions |
| pinterest-workflows | `skills/pinterest-workflows/SKILL.md` | Automation workflow recipes |

## Deployment

Configured for autoscale deployment running `node server.js`.
