#!/usr/bin/env bash
# PostToolUse hook (Write|Edit): formats the touched file with Prettier and
# runs `eslint --fix` on JS/TS files. Remaining lint errors are reported back
# to Claude (exit 2) so they get fixed in the same turn.

project_dir="${CLAUDE_PROJECT_DIR:-$(pwd)}"
file="$(jq -r '.tool_input.file_path // .tool_response.filePath // empty')"

# Only act on existing files inside this project.
[ -n "$file" ] && [ -f "$file" ] || exit 0
case "$file" in
  "$project_dir"/*) ;;
  *) exit 0 ;;
esac

cd "$project_dir" || exit 0

problems=""

# Prettier: --ignore-unknown skips file types it can't format; .gitignore and
# .prettierignore are respected automatically.
if ! out="$(npx --no-install prettier --write --ignore-unknown --log-level warn "$file" 2>&1)"; then
  problems+="Prettier failed on $file:"$'\n'"$out"$'\n'
fi

case "$file" in
  *.js | *.jsx | *.mjs | *.cjs | *.ts | *.tsx | *.mts | *.cts)
    if ! out="$(npx --no-install eslint --fix --no-warn-ignored "$file" 2>&1)"; then
      problems+="ESLint found problems it could not auto-fix in $file:"$'\n'"$out"$'\n'
    fi
    ;;
esac

if [ -n "$problems" ]; then
  printf '%s' "$problems" >&2
  exit 2
fi
exit 0
