#!/usr/bin/env bash
set -euo pipefail
for _ in {1..12}; do
  if curl --fail --silent http://127.0.0.1:3000/health >/dev/null; then
    exit 0
  fi
  sleep 5
done
systemctl status plumcommerce.service --no-pager || true
exit 1
