#!/usr/bin/env bash
set -euo pipefail

cd /home/ssm-user/plumcommerce_old

# ssm-user 권한으로 PM2 리로드 실행 (없으면 새로 시작)
sudo -u ssm-user pm2 reload plum-commerce || sudo -u ssm-user pm2 start src/server.js --name "plum-commerce"
