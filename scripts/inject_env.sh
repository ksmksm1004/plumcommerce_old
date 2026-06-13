#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="/home/ssm-user/plumcommerce_old"
PARAMETER_NAME="/config/plumcommerce/production/.env"
REGION="ap-northeast-2"

echo "==== AWS Parameter Store에서 .env 다운로드 시작 ===="

# Parameter Store에서 SecureString을 복호화하여 가져옵니다.
aws ssm get-parameter \
    --name "$PARAMETER_NAME" \
    --with-decryption \
    --region "$REGION" \
    --query "Parameter.Value" \
    --output text > "$TARGET_DIR/.env"

echo "==== .env 파일 다운로드 및 복사 성공 ===="

# 소유권을 ssm-user로 지정하고 보안 권한(600)을 설정합니다.
chown ssm-user:ssm-user "$TARGET_DIR/.env"
chmod 600 "$TARGET_DIR/.env"
