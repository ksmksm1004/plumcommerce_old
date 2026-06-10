#!/usr/bin/env bash
set -euo pipefail

cd /home/ssm-user/plumcommerce_old

# .env 체크 (기존 로직 유지)
if [[ ! -f .env ]]; then
  echo '/home/ssm-user/plumcommerce_old/.env is required.' >&2
  exit 1
fi

npm install --omit=dev
chown -R ssm-user:ssm-user /home/ssm-user/plumcommerce_old
