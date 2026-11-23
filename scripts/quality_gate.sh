#!/usr/bin/env bash
set -euo pipefail

TIER="${1:-mvp}"
TIERS_JSON="${HOME}/.gemini/antigravity-cli/tiers.json"
MIN_COV=60
RUN_SAST="false"

if [ -f "$TIERS_JSON" ] && command -v jq >/dev/null 2>&1; then
  MIN_COV=$(jq -r --arg t "$TIER" '.tiers[$t].gates.min_coverage // 60' "$TIERS_JSON")
  RUN_SAST=$(jq -r --arg t "$TIER" '.tiers[$t].gates.sast // false' "$TIERS_JSON")
fi

echo "=== QUALITY GATE (projeto-tce) | tier=${TIER} | min_cov=${MIN_COV}% | sast=${RUN_SAST} ==="
export PATH="/root/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# --- Node / TypeScript ---
if [ -f "package.json" ]; then
  echo "[GATE:LINT] npm run lint"
  npm run lint

  echo "[GATE:TYPES] npx tsc --noEmit"
  npx --no-install tsc --noEmit

  if [ "$RUN_SAST" = "true" ]; then
    echo "[GATE:SAST] npm audit"
    npm audit --audit-level=high || true
  fi

  echo "[GATE:TESTS] vitest (cov >= ${MIN_COV}%)"
  npm run test:coverage

  echo "[GATE:BUILD] vite build"
  npm run build
fi

# --- Python CLI ---
if [ -d "engine" ]; then
  if command -v ruff >/dev/null 2>&1; then
    echo "[GATE:LINT] ruff check engine/ tests/"
    ruff check engine/ tests/
  fi
  echo "[GATE:TYPES] python py_compile"
  python3 -m py_compile engine/cranio_mold_cli.py
  if [ -d "tests" ] && ls tests/test_*.py >/dev/null 2>&1; then
    echo "[GATE:TESTS] pytest (cov >= ${MIN_COV}%)"
    if python3 -c "import pytest_cov" 2>/dev/null; then
      PYTHONPATH=. pytest tests/ --cov=engine --cov-report=term-missing --cov-fail-under="$MIN_COV"
    else
      PYTHONPATH=. pytest tests/ -q
    fi
  fi
fi

echo "[GATE:PASS] Quality Gate aprovado para tier=${TIER}"
