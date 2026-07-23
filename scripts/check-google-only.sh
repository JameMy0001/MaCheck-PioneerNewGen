#!/usr/bin/env bash
# MaCheck Vendor Compliance Scanner
# Ensures 100% Google Cloud + NVIDIA RAPIDS compliance with zero prohibited third-party vendor SDKs

set -e

echo "=== Running MaCheck Google-Only Vendor Compliance Scan ==="

BANNED_PATTERNS=("supabase" "vercel" "openai" "anthropic" "nim.nvidia.com")
SEARCH_PATHS=("mobile/src" "functions/src" "platform/analytics")

VIOLATIONS=0

for pattern in "${BANNED_PATTERNS[@]}"; do
  echo "Checking for pattern: '$pattern'..."
  for path in "${SEARCH_PATHS[@]}"; do
    if [ -d "$path" ]; then
      FOUND=$(grep -rn --ignore-case "$pattern" "$path" 2>/dev/null || true)
      if [ -n "$FOUND" ]; then
        echo "❌ Violation found in $path:"
        echo "$FOUND"
        VIOLATIONS=$((VIOLATIONS + 1))
      fi
    fi
  done
done

if [ "$VIOLATIONS" -eq 0 ]; then
  echo "✅ Vendor Compliance Scan Passed: 0 banned vendor references found."
  exit 0
else
  echo "❌ Vendor Compliance Scan Failed: $VIOLATIONS violation(s) detected."
  exit 1
fi
