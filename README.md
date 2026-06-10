# Plum Commerce On-Premise Demo (Single EC2 Baseline)

Plum Commerce의 기존 온프레미스 이커머스(단일 서버) 데모입니다. Node.js(SSR), MySQL 8, 로컬 이미지 저장(`/image/<filename>`) 구조를 통해 AWS 마이그레이션 전 원본 시스템을 재현합니다.

## 1) 아키텍처(현재)
- Ubuntu 단일 서버에 **Web/WAS/DB 동시 탑재**
- Node.js + Express + EJS SSR
- MySQL 8 로컬 설치
- 세션 저장: `SESSION_BACKEND`로 전환 가능(현재 memory/db)
- 이미지 저장: 서버 로컬 `public/image`, 정적 제공 경로 `/image/*`

## 2) 기능
- 카테고리/검색 포함 상품 목록 `/products`
- 상품 상세 `/product/:id`
- 장바구니 `/cart`
- 사용자 로그인 `/login`
- 로그인 `/login` (admin 계정은 로그인 후 `/admin`으로 이동)
- 관리자 이미지 업로드 + thumbnail 생성 `/admin`
- Flash Sale(순간 트래픽 설명용) `/flash-sale`
- Health check `/health`
- 모의 결제 클라이언트(`src/services/paymentClient.js`)

## 3) 설치 및 실행
```bash
cp .env.example .env
npm install
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

### MySQL 준비
```sql
CREATE DATABASE plumcommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'plum'@'%' IDENTIFIED BY 'plum1234';
GRANT ALL PRIVILEGES ON plumcommerce.* TO 'plum'@'%';
FLUSH PRIVILEGES;
```

### 샘플 이미지 + 스키마/시드
```bash
npm run sample-images
npm run seed
```

### 앱 실행
```bash
npm start
# http://localhost:3000/products
```

## 4) 배치 작업 (하루 1회 조회 이력 집계)
```bash
python3 scripts/daily_view_aggregate.py
```
cron 예시:
```cron
0 1 * * * cd /opt/plumcommerce && /usr/bin/python3 scripts/daily_view_aggregate.py >> /var/log/plum_batch.log 2>&1
```

## 5) systemd 실행 예시
```ini
[Unit]
Description=Plum Commerce Node App
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/opt/plumcommerce
EnvironmentFile=/opt/plumcommerce/.env
ExecStart=/usr/bin/node src/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

## 6) 테스트
```bash
npm test
```

## 7) 주요 환경변수 (.env)
- DB 연결: `DB_WRITER_HOST/DB_READER_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
- 이미지 저장: `S3_BUCKET/S3_ORIGIN_PREFIX/S3_THUMBNAIL_PREFIX/IMAGE_BASE_URL` (`IMAGE_DIR`은 기존 로컬 샘플 호환용)
- 세션 백엔드: `SESSION_BACKEND=memory|db|valkey` (`valkey` 사용 시 `VALKEY_PRIMARY_ENDPOINT`, `VALKEY_TLS`)
- 결제 mock: `PAYMENT_BASE_URL`, `PAYMENT_TIMEOUT_MS`, `ALLOWLISTED_EGRESS_IP`

## 8) AWS 전환 포인트 (명시)
1. **MySQL -> RDS/Aurora**: writer/reader endpoint를 분리하고 TLS로 연결.
2. **/image 로컬 -> S3 + CloudFront**: 관리자는 원본만 S3에 업로드하고 Lambda가 thumbnail prefix에 리사이즈 결과를 생성.
3. **로컬 세션 -> ElastiCache**: `SESSION_BACKEND=valkey`로 Valkey 세션 저장소 사용.
4. **단일 서버 -> ALB + Auto Scaling**: Node 앱을 무상태화(세션 외부화), 다중 인스턴스 배포.
5. **수동 배포 -> CI/CD**: GitHub Actions/CodePipeline로 빌드/배포 자동화.

## 9) 프로젝트 구조
```
.
├── package.json
├── requirements.txt
├── sql/
│   └── schema.sql
├── scripts/
│   ├── seed.js
│   ├── generate_sample_images.py
│   └── daily_view_aggregate.py
├── src/
│   ├── server.js
│   ├── config/env.js
│   ├── db/pool.js
│   ├── middlewares/auth.js
│   ├── routes/index.js
│   ├── services/
│   │   ├── paymentClient.js
│   │   └── imageStorage.js
│   ├── session/
│   │   ├── backend.js
│   │   ├── memoryBackend.js
│   │   ├── dbBackend.js
│   │   ├── valkeyBackend.js
│   │   └── valkeyStore.js
│   └── views/
└── tests/health.test.js
```

## 10) AWS 운영 구성

### Aurora

애플리케이션은 `DB_WRITER_HOST`와 `DB_READER_HOST`를 분리합니다. `SELECT`, `SHOW`, `DESCRIBE`, `EXPLAIN`은 reader endpoint로 전송하고, 데이터 변경과 스키마 초기화는 writer endpoint를 사용합니다. 스키마 변경은 `AUTO_MIGRATE_SCHEMA=true`인 단일 관리 작업에서만 실행하고 ASG 인스턴스에서는 `false`로 유지해야 합니다. Aurora 보안 그룹은 애플리케이션 인스턴스 보안 그룹에서 오는 3306/TCP만 허용하고, 운영 자격 증명은 AMI나 저장소가 아니라 SSM Parameter Store 또는 Secrets Manager를 통해 `/opt/plumcommerce/.env`에 공급해야 합니다.

### S3 이미지와 Lambda

관리자는 원본 이미지 하나만 업로드합니다. 애플리케이션은 `s3://sm-plum-615299743460-ap-northeast-2-an/image/origin/<unique-name>`에 저장하고 DB에는 원본 키와 예상 썸네일 키(`image/thumbnail/<unique-name>`)를 기록합니다. Lambda의 S3 이벤트 필터는 `image/origin/` prefix로 제한해야 재귀 호출을 막을 수 있으며, 리사이즈 결과는 동일한 파일명으로 `image/thumbnail/`에 저장해야 합니다. EC2 instance profile에는 최소한 원본 `PutObject`와 두 prefix의 `DeleteObject` 권한이 필요합니다. 브라우저 제공은 S3 공개 설정 대신 CloudFront + OAC를 권장하며 이 경우 `IMAGE_BASE_URL`을 CloudFront 도메인으로 지정합니다.

### ElastiCache와 Auto Scaling

`SESSION_BACKEND=valkey`일 때 세션 읽기/쓰기는 메인 가용영역 2a의 `cache-0001-001.cache.kjbeur.apn2.cache.amazonaws.com:6379`에 연결합니다. 가용영역 2c의 `cache-0001-002.cache.kjbeur.apn2.cache.amazonaws.com:6379`는 replica 노드이므로 애플리케이션의 세션 쓰기 대상으로 사용하지 않습니다. `VALKEY_TLS=true`이면 `rediss://` 연결을 사용하며, 인증 토큰이 있다면 `VALKEY_URL`로 전체 연결 URL을 재정의할 수 있습니다. ALB health check는 DB 및 Valkey 장애와 분리된 `/health`를 사용합니다.

CodeDeploy는 `appspec.yml`의 `file_exists_behavior: OVERWRITE`로 기존 AMI 코드 위에 artifact를 덮어씁니다. 배포 hook은 의존성 설치, systemd 등록/재시작, `/health` 검증을 수행합니다. 새 인스턴스가 배포 전에 트래픽을 받지 않도록 Auto Scaling lifecycle hook 또는 CodeDeploy deployment group의 load balancer 연동을 구성해야 합니다.

> 운영 권장: 위 주소가 개별 노드 endpoint라면 장애조치 후 역할이 바뀌어도 DNS가 primary를 계속 가리키는 ElastiCache replication group의 **Primary endpoint**를 `VALKEY_URL`에 사용하는 것이 안전합니다. 현재 설정은 제공된 정보에 따라 2a 노드를 primary로 사용합니다.
