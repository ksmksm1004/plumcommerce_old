#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="/home/ssm-user/plumcommerce_old"
PARAMETER_NAME="/config/plumcommerce/production/.env"
REGION="ap-northeast-2"

echo "==== AWS CLI 설치 여부 확인 및 환경 점검 ===="

# 🌟 [핵심 방어 코드] 만약 aws 명령어가 없다면 자동으로 다운로드하여 설치합니다.
if ! command -v aws &> /dev/null; then
    echo "AWS CLI가 발견되지 않았습니다. 실시간 설치를 시작합니다..."
    cd /tmp
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    
    # unzip 명령어가 없을 경우를 대비해 설치 진행
    if ! command -v unzip &> /dev/null; then
        apt-get update && apt-get install -y unzip || yum install -y unzip
    fi
    
    unzip -q awscliv2.zip
    ./aws/install --update
    rm -rf awscliv2.zip aws
    echo "AWS CLI 설치 완료!"
fi

# 설치 직후 배포 에러 방지를 위해 가용 경로 강제 로드
export PATH=$PATH:/usr/local/bin

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
