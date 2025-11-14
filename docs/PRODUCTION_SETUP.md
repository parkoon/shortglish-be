# 프로덕션 설정 가이드

이 문서는 프로덕션 환경에 배포하기 위해 구현된 설정들에 대한 상세한 설명을 제공합니다.

## 📋 목차

1. [환경 변수 설정](#환경-변수-설정)
2. [보안 설정](#보안-설정)
3. [에러 처리](#에러-처리)
4. [로깅](#로깅)
5. [Graceful Shutdown](#graceful-shutdown)
6. [파일 구조](#파일-구조)
7. [배포 전 체크리스트](#배포-전-체크리스트)

---

## 환경 변수 설정

### 파일 위치

`src/config/env.ts`

### 목적

- 환경 변수의 타입 안전성 보장
- 필수 환경 변수 누락 시 앱 시작 방지
- 환경별 설정 관리

### 구현 내용

#### 1. Zod를 사용한 스키마 검증

```typescript
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("3000"),
  ALLOWED_ORIGINS: z.string().optional(),
  // ...
});
```

**이점:**

- 런타임에 환경 변수 검증
- 타입 안전성 보장
- 명확한 에러 메시지 제공

#### 2. 설정 객체 생성

```typescript
export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  allowedOrigins: env.ALLOWED_ORIGINS?.split(",").filter(Boolean) || [],
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS
      ? parseInt(env.RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000,
    max: env.RATE_LIMIT_MAX ? parseInt(env.RATE_LIMIT_MAX, 10) : 100,
  },
};
```

**설정 항목:**

- `nodeEnv`: 실행 환경 (development/production/test)
- `port`: 서버 포트 (기본값: 3000)
- `allowedOrigins`: CORS 허용 도메인 목록 (쉼표로 구분)
- `rateLimit`: Rate Limiting 설정

### 환경 변수 예시

#### 개발 환경 (.env)

```env
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### 프로덕션 환경 (Railway)

```env
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
```

---

## 보안 설정

### 파일 위치

`src/middleware/security.ts`

### 구현된 보안 기능

#### 1. Helmet.js

**목적:** 보안 관련 HTTP 헤더 설정

**적용되는 헤더:**

- `X-Content-Type-Options`: MIME 타입 스니핑 방지
- `X-Frame-Options`: Clickjacking 방지
- `X-XSS-Protection`: XSS 공격 방어
- `Strict-Transport-Security`: HTTPS 강제 (프로덕션)
- `Content-Security-Policy`: 콘텐츠 보안 정책

**코드:**

```typescript
app.use(helmet());
```

**참고:** Helmet은 기본 설정으로도 대부분의 공격을 방어합니다. 특별한 요구사항이 있으면 옵션을 커스터마이징할 수 있습니다.

#### 2. CORS 설정

**목적:** 허용된 도메인만 API 접근 가능

**동작 방식:**

- 개발 환경: 모든 도메인 허용 (개발 편의성)
- 프로덕션 환경: `ALLOWED_ORIGINS`에 명시된 도메인만 허용

**코드:**

```typescript
app.use(
  cors({
    origin:
      config.allowedOrigins.length > 0
        ? config.allowedOrigins
        : config.nodeEnv === "production"
        ? false
        : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
```

**주의사항:**

- 프로덕션에서는 반드시 `ALLOWED_ORIGINS`를 설정해야 합니다.
- `credentials: true`는 쿠키/인증 정보를 포함한 요청을 허용합니다.

#### 3. Rate Limiting

**목적:** DDoS 공격 및 과도한 요청 방지

**기본 설정:**

- 시간 윈도우: 15분
- 최대 요청 수: 100회
- 환경 변수로 커스터마이징 가능

**코드:**

```typescript
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    error: "Too many requests from this IP, please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

**적용 범위:**

- 모든 API 엔드포인트 (`/api/*`)
- 루트 경로와 헬스체크는 제외 (모니터링용)

**Rate Limit 헤더:**
응답에 다음 헤더가 포함됩니다:

- `RateLimit-Limit`: 최대 요청 수
- `RateLimit-Remaining`: 남은 요청 수
- `RateLimit-Reset`: 리셋 시간

---

## 에러 처리

### 파일 위치

`src/middleware/errorHandler.ts`

### 구현 내용

#### 1. 커스텀 에러 클래스 (AppError)

**목적:** HTTP 상태 코드와 함께 에러를 처리

**사용 예시:**

```typescript
throw new AppError(404, "User not found");
throw new AppError(400, "Invalid input data");
```

**특징:**

- `statusCode`: HTTP 상태 코드
- `isOperational`: 예상 가능한 에러인지 여부
- 스택 트레이스 자동 캡처

#### 2. 404 핸들러

**목적:** 존재하지 않는 라우트 처리

**응답 형식:**

```json
{
  "error": "Not Found",
  "message": "Cannot GET /nonexistent",
  "path": "/nonexistent"
}
```

**위치:** 모든 라우트 정의 이후에 배치

#### 3. 전역 에러 핸들러

**목적:** 모든 에러를 일관된 형식으로 처리

**동작 방식:**

1. `AppError` 인스턴스인 경우: 정의된 상태 코드 사용
2. 예상치 못한 에러인 경우: 500 에러 반환

**프로덕션 vs 개발:**

- 프로덕션: 상세한 에러 정보 숨김 (보안)
- 개발: 스택 트레이스 포함 (디버깅)

**응답 형식 (프로덕션):**

```json
{
  "error": "Internal Server Error"
}
```

**응답 형식 (개발):**

```json
{
  "error": "Error message",
  "stack": "Error stack trace...",
  "path": "/api/users"
}
```

---

## 로깅

### 파일 위치

`src/middleware/logging.ts`

### 구현 내용

#### Morgan 미들웨어

**목적:** HTTP 요청 로깅

**환경별 설정:**

- 개발 환경: `morgan('dev')` - 컬러 출력, 상세 정보
- 프로덕션 환경: `morgan('combined')` - 표준 Apache 로그 형식

**로그 예시 (개발):**

```
GET /api/users 200 15.234 ms - 1234
POST /api/login 401 8.123 ms - 45
```

**로그 예시 (프로덕션):**

```
::1 - - [25/Dec/2024:10:30:45 +0000] "GET /api/users HTTP/1.1" 200 1234
```

**제외된 경로:**

- `/health`: 헬스체크는 로그에서 제외 (너무 많은 로그 방지)

**향후 개선:**

- 구조화된 로깅 (JSON 형식)
- 로그 레벨 관리 (winston, pino)
- 파일 로깅 또는 외부 로그 서비스 연동

---

## Graceful Shutdown

### 파일 위치

`src/index.ts`

### 목적

서버 종료 시 진행 중인 요청을 완료한 후 안전하게 종료

### 구현 내용

#### 1. 시그널 핸들러

**처리하는 시그널:**

- `SIGTERM`: Railway 등에서 서버 종료 요청 시
- `SIGINT`: Ctrl+C 입력 시

**동작 순서:**

1. 시그널 수신
2. 새로운 요청 수락 중지 (`server.close()`)
3. 진행 중인 요청 완료 대기
4. 10초 타임아웃 후 강제 종료

#### 2. Unhandled Rejection 처리

**목적:** 처리되지 않은 Promise Rejection 방지

**동작:**

- 에러 로깅
- Graceful Shutdown 실행

#### 3. Uncaught Exception 처리

**목적:** 처리되지 않은 예외 방지

**동작:**

- 에러 로깅
- Graceful Shutdown 실행

**주의사항:**

- Uncaught Exception 발생 시 앱을 재시작하는 것이 일반적입니다.
- Railway는 자동으로 재시작하므로 현재 구현으로 충분합니다.

---

## 파일 구조

```
src/
├── config/
│   └── env.ts              # 환경 변수 검증 및 설정
├── middleware/
│   ├── security.ts          # 보안 미들웨어 (Helmet, CORS, Rate Limiting)
│   ├── errorHandler.ts     # 에러 핸들러 (404, 전역 에러)
│   └── logging.ts           # 로깅 미들웨어 (Morgan)
└── index.ts                 # 메인 앱 파일 (Graceful Shutdown 포함)
```

### 각 파일의 역할

- **env.ts**: 환경 변수 관리 및 검증
- **security.ts**: 보안 관련 미들웨어 설정
- **errorHandler.ts**: 에러 처리 로직
- **logging.ts**: 로깅 설정
- **index.ts**: 앱 초기화 및 서버 시작

---

## 배포 전 체크리스트

### 환경 변수 확인

- [ ] `NODE_ENV=production` 설정
- [ ] `ALLOWED_ORIGINS`에 프로덕션 도메인 설정
- [ ] `PORT` 설정 (Railway는 자동 설정)
- [ ] Rate Limiting 설정 확인 (필요시 조정)

### 보안 확인

- [ ] Helmet.js 활성화 확인
- [ ] CORS 설정 확인 (프로덕션 도메인만 허용)
- [ ] Rate Limiting 동작 확인
- [ ] HTTPS 사용 확인 (Railway 자동 제공)

### 에러 처리 확인

- [ ] 404 핸들러 동작 확인
- [ ] 전역 에러 핸들러 동작 확인
- [ ] 프로덕션 환경에서 에러 메시지가 숨겨지는지 확인

### 로깅 확인

- [ ] HTTP 요청 로그가 출력되는지 확인
- [ ] 에러 로그가 기록되는지 확인

### Graceful Shutdown 확인

- [ ] 서버 종료 시 진행 중인 요청이 완료되는지 확인
- [ ] Railway에서 재시작 시 정상 동작하는지 확인

---

## 테스트 방법

### 로컬 테스트

```bash
# 개발 환경에서 실행
npm run dev

# 프로덕션 모드로 테스트
NODE_ENV=production npm start
```

### Rate Limiting 테스트

```bash
# 100개 이상의 요청을 빠르게 보내기
for i in {1..110}; do curl http://localhost:3000/api/test; done
```

### CORS 테스트

```bash
# 허용되지 않은 도메인에서 요청 (프로덕션)
curl -H "Origin: https://malicious.com" http://localhost:3000/api/test
```

### 에러 핸들러 테스트

```bash
# 404 에러
curl http://localhost:3000/nonexistent

# 서버 에러 (테스트용 라우트 필요)
curl http://localhost:3000/api/error
```

---

## 문제 해결

### 환경 변수 에러

**증상:** 앱 시작 시 Zod 검증 에러
**해결:** 필수 환경 변수가 설정되었는지 확인

### CORS 에러

**증상:** 프론트엔드에서 API 호출 실패
**해결:** `ALLOWED_ORIGINS`에 프론트엔드 도메인 추가

### Rate Limiting 너무 엄격

**증상:** 정상적인 사용자가 차단됨
**해결:** `RATE_LIMIT_MAX` 또는 `RATE_LIMIT_WINDOW_MS` 조정

---

## 참고 자료

- [Express 보안 모범 사례](https://expressjs.com/en/advanced/best-practice-security.html)
- [Helmet.js 문서](https://helmetjs.github.io/)
- [CORS 설정 가이드](https://expressjs.com/en/resources/middleware/cors.html)
- [Express Rate Limit 문서](https://github.com/express-rate-limit/express-rate-limit)
- [Zod 문서](https://zod.dev/)

---

**마지막 업데이트:** 2024년
**작성자:** 개발팀
