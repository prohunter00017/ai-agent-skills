#!/usr/bin/env bash
# Lists the skills available in this repository. This repo is content-only —
# the skills are installed into other agents via `npx skills add ...`.

set -e

echo "================================================================"
echo "  AI Agent Skills — content-only skills repository"
echo "================================================================"
echo
echo "Available skills (each is a single SKILL.md file):"
echo

for dir in skills/*/; do
  name=$(basename "$dir")
  skill_file="$dir/SKILL.md"
  if [ -f "$skill_file" ]; then
    desc=$(awk '/^description:/{sub(/^description:[ ]*/, ""); print; exit}' "$skill_file")
    printf "  - %-22s %s\n" "$name" "$desc"
  fi
done

echo
echo "Install any skill into your agent with:"
echo "  npx skills add prohunter00017/ai-agent-skills@<skill-name>"
echo
echo "See README.md for full details."
echo

# Keep the workflow alive so logs stay visible in the Replit console.
tail -f /dev/null
