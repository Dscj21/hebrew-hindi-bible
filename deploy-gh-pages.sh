#!/usr/bin/env bash
# Rebuild data and publish to GitHub Pages (repo main branch, root). Needs: gh auth login (once).
set -euo pipefail
cd "$(dirname "$0")"
[ "${1:-}" = "--build" ] && python3 scripts/build.py
git add -A
git commit -m "${MSG:-update $(date +%F_%H%M)}" || echo "nothing to commit"
git push origin main
echo "Live (after ~1 min): https://dscj21.github.io/hebrew-hindi-bible/"
