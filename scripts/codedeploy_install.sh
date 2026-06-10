#!/usr/bin/env bash
set -euo pipefail
cd /opt/plumcommerce
if [[ ! -f .env ]]; then
  echo '/opt/plumcommerce/.env is required (provision it from SSM/Secrets Manager before deployment).' >&2
  exit 1
fi
npm install --omit=dev
install -m 0644 deploy/plumcommerce.service /etc/systemd/system/plumcommerce.service
chown -R ec2-user:ec2-user /opt/plumcommerce
systemctl daemon-reload
systemctl enable plumcommerce.service
