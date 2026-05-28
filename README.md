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
- 관리자 로그인 `/admin/login`
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
- DB 연결: `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME`
- 이미지 경로: `IMAGE_DIR`
- 세션 백엔드: `SESSION_BACKEND=memory|db`
- 결제 mock: `PAYMENT_BASE_URL`, `PAYMENT_TIMEOUT_MS`, `ALLOWLISTED_EGRESS_IP`

## 8) AWS 전환 포인트 (명시)
1. **MySQL -> RDS/Aurora**: `.env` DB endpoint/credential만 변경, SQL 스키마 동일 사용.
2. **/image 로컬 -> S3 + CloudFront**: `IMAGE_DIR`/정적 라우팅과 업로드 로직(`multer/sharp`)을 S3 SDK 기반으로 교체.
3. **로컬 세션 -> ElastiCache**: `SessionBackend` 인터페이스 구현체 추가(예: RedisStoreBackend).
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
│   ├── services/paymentClient.js
│   ├── session/
│   │   ├── backend.js
│   │   ├── memoryBackend.js
│   │   └── dbBackend.js
│   └── views/
└── tests/health.test.js
```
