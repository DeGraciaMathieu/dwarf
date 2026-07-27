#!/usr/bin/env bash
# Hook Stop : bloque la fin de tâche si la suite de tests échoue.
# Gère la ré-entrance (stop_hook_active) pour éviter une boucle infinie.
input=$(cat)
if printf '%s' "$input" | grep -Eq '"stop_hook_active" *: *true'; then
  exit 0
fi
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
log=$(mktemp)
if ! node --test tests/*.test.js >"$log" 2>&1; then
  echo "La suite de tests échoue — corrige avant de terminer la tâche :" >&2
  grep -A 8 "^not ok" "$log" >&2
  grep -E "^# (tests|pass|fail)" "$log" >&2
  rm -f "$log"
  exit 2
fi
rm -f "$log"
exit 0
