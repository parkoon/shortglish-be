# Shortglish Backend

Express + TypeScript 기반 백엔드 API 서버

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

개발 서버는 `http://localhost:4000`에서 실행됩니다.

### 3. 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 디렉토리에 생성됩니다.

### 4. 프로덕션 실행

```bash
npm start
```

## Railway 배포

Railway는 자동으로 다음을 감지합니다:

- `package.json`의 `start` 스크립트를 사용하여 앱을 실행합니다
- `build` 스크립트가 있으면 빌드를 자동으로 실행합니다
- `PORT` 환경 변수를 자동으로 설정합니다

### 배포 단계

1. Railway에 GitHub 저장소 연결
2. 프로젝트 선택 및 배포 시작
3. Railway가 자동으로 빌드 및 배포를 진행합니다

### 환경 변수

필요한 경우 Railway 대시보드에서 환경 변수를 설정할 수 있습니다:

- `NODE_ENV`: `production` (선택사항)
- `PORT`: Railway가 자동으로 설정합니다

## mTLS 인증서 설정

토스 API 통신을 위해서는 mTLS 인증서가 필요합니다.

### 로컬 개발 환경

#### 1. 인증서 파일 준비

토스 콘솔에서 발급받은 인증서 파일을 `certs/` 디렉토리에 배치하세요:

```
certs/
├── client-cert.pem  # 인증서 파일
└── client-key.pem   # 키 파일
```

#### 2. 환경 변수 설정 (선택사항)

기본 경로가 아닌 다른 위치에 인증서가 있는 경우:

```env
TOSS_MTLS_CERT_PATH=/path/to/cert.pem
TOSS_MTLS_KEY_PATH=/path/to/key.pem
```

### Railway 배포 환경

Railway에서는 **환경 변수로 Base64 인코딩된 인증서**를 설정해야 합니다.

#### 1. 인증서를 Base64로 인코딩

로컬에서 다음 명령어로 인증서를 Base64로 인코딩하세요:

```bash
# 인증서 파일 인코딩
base64 -i certs/client-cert.pem | tr -d '\n'

# 키 파일 인코딩
base64 -i certs/client-key.pem | tr -d '\n'
```

또는 한 줄로:

```bash
# macOS/Linux
cat certs/client-cert.pem | base64 | tr -d '\n'
cat certs/client-key.pem | base64 | tr -d '\n'
```

#### 2. Railway 환경 변수 설정

**방법 1: Railway CLI 사용 (권장)**

**자동 스크립트 사용 (가장 간편):**

```bash
# 1. 프로젝트 연결 (처음 한 번만)
railway link

# 2. .env 파일의 모든 토스 관련 환경 변수를 Railway에 설정
./set-railway-env.sh
```

이 스크립트는 `.env` 파일과 `certs/` 디렉토리의 인증서를 읽어서 Railway에 자동으로 설정합니다.

**수동 설정:**

```bash
# 프로젝트 연결 (처음 한 번만)
railway link

# mTLS 인증서 설정
railway variables --set "TOSS_MTLS_CERT_BASE64=$(cat certs/client-cert.pem | base64 | tr -d '\n')"
railway variables --set "TOSS_MTLS_KEY_BASE64=$(cat certs/client-key.pem | base64 | tr -d '\n')"

# 토스 로그인 관련 환경 변수 설정
railway variables --set "TOSS_DECRYPTION_KEY=your_base64_encoded_decryption_key"
railway variables --set "TOSS_AAD=TOSS"
railway variables --set "TOSS_CALLBACK_BASIC_AUTH_USERNAME=your_username"
railway variables --set "TOSS_CALLBACK_BASIC_AUTH_PASSWORD=your_password"

# CORS 설정 (프로덕션 도메인)
railway variables --set "ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com"
railway variables --set "NODE_ENV=production"

# 환경 변수 확인
railway variables
```

**방법 2: Railway 대시보드 사용**

1. Railway 프로젝트 → Variables 탭
2. 다음 환경 변수 추가:

```
TOSS_MTLS_CERT_BASE64=<위에서 인코딩한 인증서 문자열>
TOSS_MTLS_KEY_BASE64=<위에서 인코딩한 키 문자열>
TOSS_DECRYPTION_KEY=<복호화 키>
TOSS_AAD=TOSS
TOSS_CALLBACK_BASIC_AUTH_USERNAME=<사용자명>
TOSS_CALLBACK_BASIC_AUTH_PASSWORD=<비밀번호>
ALLOWED_ORIGINS=<프로덕션 도메인>
```

**주의사항:**

- Base64 문자열은 매우 길 수 있습니다. 전체를 복사해야 합니다.
- 환경 변수 값에 공백이나 줄바꿈이 포함되지 않도록 주의하세요.
- Railway는 환경 변수 변경 시 자동으로 재배포합니다.

#### 3. 인증서 확인

서버 시작 시 다음 메시지가 출력되면 정상입니다:

```
[mTLS] 환경 변수에서 인증서를 로드했습니다.
[mTLS] 인증서가 성공적으로 로드되었습니다.
```

### 보안 주의사항

- 인증서 파일은 Git에 커밋하지 마세요 (`.gitignore`에 포함됨)
- Railway에서는 환경 변수로 관리 (파일 시스템 사용 불가)
- 로컬 개발 시 파일 권한 설정: `chmod 400 certs/*.pem` (읽기 전용)
- Base64 인코딩된 값도 민감한 정보이므로 안전하게 관리하세요

## API 엔드포인트

- `GET /`: 기본 정보
- `GET /health`: 헬스 체크
