# 클라이언트 연동 가이드

React + TypeScript + Vite 클라이언트에서 Shortglish Backend API를 연동하는 가이드입니다.

## 목차

1. [환경 설정](#환경-설정)
2. [API 응답 구조](#api-응답-구조)
3. [API 개요](#api-개요)
4. [토스 로그인 플로우](#토스-로그인-플로우)
5. [API 상세 설명](#api-상세-설명)
6. [타입 정의](#타입-정의)
7. [유의사항](#유의사항)
8. [에러 처리](#에러-처리)

---

## 환경 설정

### 1. API 서버 URL 설정

프로젝트 루트에 `.env` 파일을 생성하고 API 서버 URL을 설정하세요:

```env
# VITE_API_BASE_URL=https://shortglish-be-production.up.railway.app/
```

### 2. CORS 설정 확인

서버의 `ALLOWED_ORIGINS` 환경 변수에 클라이언트 도메인이 포함되어 있어야 합니다:

- **개발 환경**: `http://localhost:5173` (Vite 기본 포트) 또는 사용 중인 포트
- **프로덕션 환경**: 실제 배포 도메인 (예: `https://yourdomain.com`)

CORS 설정이 올바르지 않으면 브라우저에서 API 호출이 차단됩니다.

---

## API 응답 구조

모든 API는 일관된 응답 구조를 사용합니다.

### 성공 응답

```typescript
{
  success: true,
  data: {
    // 실제 데이터
  },
  message?: string,  // 선택적 메시지
  meta?: {           // 선택적 메타데이터
    timestamp?: string,
    pagination?: {
      page: number,
      limit: number,
      total: number,
      totalPages: number,
      hasNext: boolean,
      hasPrev: boolean
    },
    // 기타 메타데이터...
  }
}
```

**예시**:

```json
{
  "success": true,
  "data": {
    "userKey": 12345,
    "name": "홍길동",
    "phone": "010-1234-5678"
  },
  "message": "사용자 정보를 성공적으로 조회했습니다.",
  "meta": {
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

### 에러 응답

```typescript
{
  success: false,
  error: string,      // 에러 메시지
  message?: string,   // 추가 메시지 (404 등)
  path?: string,      // 개발 환경에서만 (요청 경로)
  stack?: string      // 개발 환경에서만 (스택 트레이스)
}
```

**예시**:

```json
{
  "success": false,
  "error": "authorizationCode와 referrer는 필수입니다."
}
```

### 응답 구조의 장점

1. **일관성**: 모든 API가 동일한 구조 사용
2. **명확성**: `success` 필드로 성공/실패 즉시 판단 가능
3. **확장성**: `meta` 필드로 pagination, timestamp 등 추가 가능
4. **타입 안전성**: TypeScript로 타입 정의 용이
5. **MongoDB 연동**: `data` 필드에 배열이나 객체를 넣기 쉬움

---

## API 개요

### 기본 엔드포인트

| 메서드 | 경로      | 설명                   |
| ------ | --------- | ---------------------- |
| `GET`  | `/`       | 서버 상태 확인         |
| `GET`  | `/health` | 헬스 체크 (모니터링용) |

### 토스 인증 API

| 메서드 | 경로                                    | 설명                      |
| ------ | --------------------------------------- | ------------------------- |
| `POST` | `/api/toss/auth/generate-token`         | AccessToken 발급          |
| `POST` | `/api/toss/auth/refresh-token`          | AccessToken 재발급        |
| `POST` | `/api/toss/auth/remove-by-access-token` | AccessToken으로 연결 끊기 |
| `POST` | `/api/toss/auth/remove-by-user-key`     | userKey로 연결 끊기       |

### 토스 사용자 정보 API

| 메서드 | 경로                          | 설명                              |
| ------ | ----------------------------- | --------------------------------- |
| `GET`  | `/api/toss/user/me`           | 사용자 정보 조회 (암호화된 상태)  |
| `GET`  | `/api/toss/user/me/decrypted` | 사용자 정보 조회 및 복호화 (권장) |
| `POST` | `/api/toss/user/decrypt`      | 사용자 정보 복호화                |

---

## 토스 로그인 플로우

### 전체 플로우

```
1. 클라이언트: 토스 SDK의 appLogin() 호출
   ↓
2. 사용자: 토스 앱에서 로그인 및 약관 동의
   ↓
3. 토스 SDK: authorizationCode와 referrer 반환
   ↓
4. 클라이언트: POST /api/toss/auth/generate-token 호출
   ↓
5. 서버: 토스 API에 인가 코드 전송하여 AccessToken 발급
   ↓
6. 클라이언트: AccessToken과 RefreshToken 저장
   ↓
7. 클라이언트: GET /api/toss/user/me/decrypted 호출하여 사용자 정보 조회
```

### 토큰 관리

- **AccessToken**: 사용자 정보 조회 등에 사용 (유효기간: 1시간)
- **RefreshToken**: AccessToken 재발급에 사용 (유효기간: 14일)
- **저장 위치**: localStorage 또는 sessionStorage (프로젝트 구조에 맞게 선택)
- **자동 갱신**: AccessToken 만료 시 RefreshToken으로 자동 재발급 권장

---

## API 상세 설명

### 1. AccessToken 발급

**엔드포인트**: `POST /api/toss/auth/generate-token`

**설명**: 토스 SDK의 `appLogin()`으로 받은 인가 코드로 AccessToken과 RefreshToken을 발급받습니다.

**요청 Body**:

```typescript
{
  authorizationCode: string; // 토스 SDK에서 받은 인가 코드
  referrer: string; // "DEFAULT" 또는 "sandbox"
}
```

**응답**:

```typescript
{
  success: true,
  data: {
    tokenType: "Bearer",
    accessToken: string,      // 저장 필요
    refreshToken: string,    // 저장 필요
    expiresIn: number,       // 초 단위 (기본 3600)
    scope: string           // 인가된 scope 목록
  },
  message: "토큰이 성공적으로 발급되었습니다."
}
```

**유의사항**:

- 인가 코드는 **10분** 내에 사용해야 합니다. 만료되면 다시 `appLogin()`을 호출해야 합니다.
- 같은 인가 코드로 중복 요청하면 에러가 발생합니다.
- `referrer`는 토스 SDK에서 반환된 값을 그대로 사용하세요.

**에러 응답**:

- `400`: 인가 코드가 만료되었거나 유효하지 않음
- `500`: 서버 내부 오류

---

### 2. AccessToken 재발급

**엔드포인트**: `POST /api/toss/auth/refresh-token`

**설명**: RefreshToken으로 새로운 AccessToken을 발급받습니다. AccessToken이 만료되었을 때 사용합니다.

**요청 Body**:

```typescript
{
  refreshToken: string; // 저장해둔 RefreshToken
}
```

**응답**:

```typescript
{
  success: true,
  data: {
    tokenType: "Bearer",
    accessToken: string,      // 새로 발급된 토큰 (업데이트 필요)
    refreshToken: string,    // 새로 발급된 토큰 (업데이트 필요)
    expiresIn: number,
    scope: string
  },
  message: "토큰이 성공적으로 재발급되었습니다."
}
```

**유의사항**:

- RefreshToken은 **14일** 동안 유효합니다.
- RefreshToken도 만료되면 다시 로그인해야 합니다.
- 새로운 AccessToken과 RefreshToken을 모두 저장해야 합니다.

**에러 응답**:

- `400`: RefreshToken이 만료되었거나 유효하지 않음
- `500`: 서버 내부 오류

---

### 3. 사용자 정보 조회 (복호화된 상태) - 권장

**엔드포인트**: `GET /api/toss/user/me/decrypted`

**설명**: AccessToken으로 사용자 정보를 조회하고 자동으로 복호화합니다. 가장 간편한 방법입니다.

**요청 헤더**:

```
Authorization: Bearer {accessToken}
```

**응답**:

```typescript
{
  success: true,
  data: {
    userKey: number,              // 사용자 식별자
    scope: string,                 // 인가된 scope
    agreedTerms: string[],         // 동의한 약관 목록
    name?: string,                 // 복호화된 이름
    phone?: string,                 // 복호화된 전화번호
    birthday?: string,             // 복호화된 생년월일 (yyyyMMdd)
    ci?: string,                   // 복호화된 CI
    gender?: string,               // 복호화된 성별 (MALE/FEMALE)
    nationality?: string,          // 복호화된 내/외국인 여부 (LOCAL/FOREIGNER)
    email?: string | null          // 복호화된 이메일
  },
  meta: {
    timestamp: string
  }
}
```

**유의사항**:

- 이 엔드포인트는 **복호화까지 자동으로 처리**하므로 가장 편리합니다.
- 개인정보 필드는 scope에 따라 `null`일 수 있습니다.
- `di` 필드는 항상 `null`입니다 (토스 스펙).

**에러 응답**:

- `401`: AccessToken이 유효하지 않음 (토큰 재발급 필요)
- `500`: 서버 내부 오류

---

### 4. 사용자 정보 조회 (암호화된 상태)

**엔드포인트**: `GET /api/toss/user/me`

**설명**: AccessToken으로 사용자 정보를 조회합니다. 암호화된 상태로 반환되므로 별도로 복호화해야 합니다.

**요청 헤더**:

```
Authorization: Bearer {accessToken}
```

**응답**:

```typescript
{
  success: true,
  data: {
    userKey: number,
    scope: string,
    agreedTerms: string[],
    name?: string,        // 암호화된 값 (Base64)
    phone?: string,       // 암호화된 값 (Base64)
    birthday?: string,    // 암호화된 값 (Base64)
    ci?: string,          // 암호화된 값 (Base64)
    di: string | null,    // 항상 null
    gender?: string,      // 암호화된 값 (Base64)
    nationality?: string, // 암호화된 값 (Base64)
    email?: string | null // 암호화된 값 (Base64)
  }
}
```

**유의사항**:

- 이 엔드포인트는 암호화된 데이터를 반환합니다.
- 복호화하려면 `/api/toss/user/decrypt` 엔드포인트를 사용하거나, `/api/toss/user/me/decrypted`를 사용하는 것을 권장합니다.

---

### 5. 사용자 정보 복호화

**엔드포인트**: `POST /api/toss/user/decrypt`

**설명**: 암호화된 사용자 정보 필드를 복호화합니다.

**요청 Body**:

```typescript
{
  name?: string;          // 암호화된 이름 (선택)
  phone?: string;         // 암호화된 전화번호 (선택)
  birthday?: string;      // 암호화된 생년월일 (선택)
  ci?: string;           // 암호화된 CI (선택)
  gender?: string;       // 암호화된 성별 (선택)
  nationality?: string;  // 암호화된 내/외국인 여부 (선택)
  email?: string;        // 암호화된 이메일 (선택)
  // 최소 하나의 필드는 필요
}
```

**응답**:

```typescript
{
  success: true,
  data: {
    name?: string;
    phone?: string;
    birthday?: string;
    ci?: string;
    gender?: string;
    nationality?: string;
    email?: string | null;
  }
}
```

**유의사항**:

- 복호화할 필드가 하나 이상 필요합니다.
- 일반적으로 `/api/toss/user/me/decrypted`를 사용하는 것이 더 편리합니다.
- 이 엔드포인트는 암호화된 데이터를 직접 받아서 복호화할 때 사용합니다.

---

### 6. 로그인 연결 끊기 (userKey)

**엔드포인트**: `POST /api/toss/auth/remove-by-user-key`

**설명**: userKey로 토스 로그인 연결을 끊습니다. 로그아웃 시 사용합니다.

**요청 헤더**:

```
Authorization: Bearer {accessToken}
```

**요청 Body**:

```typescript
{
  userKey: number; // 사용자 식별자
}
```

**응답**:

```typescript
{
  success: true,
  data: {
    userKey: number;
  },
  message: "로그인 연결이 해제되었습니다.";
}
```

**유의사항**:

- 로그아웃 시 이 API를 호출한 후, 클라이언트에서도 토큰을 제거해야 합니다.
- 하나의 userKey에 연결된 AccessToken이 많을 경우 3초 타임아웃이 발생할 수 있습니다.
- 타임아웃 발생 시 재시도하지 말고, 일정 시간 후 다시 시도하세요.

**에러 응답**:

- `400`: userKey가 없음
- `401`: Authorization 헤더가 없음
- `500`: 서버 내부 오류

---

### 7. 로그인 연결 끊기 (AccessToken)

**엔드포인트**: `POST /api/toss/auth/remove-by-access-token`

**설명**: 현재 사용 중인 AccessToken으로 로그인 연결을 끊습니다.

**요청 헤더**:

```
Authorization: Bearer {accessToken}
```

**응답**:

```typescript
{
  success: true,
  data: null,
  message: "로그인 연결이 해제되었습니다.";
}
```

**유의사항**:

- 이 엔드포인트는 현재 AccessToken만 무효화합니다.
- 같은 userKey의 다른 AccessToken은 여전히 유효합니다.
- 완전한 로그아웃을 위해서는 `remove-by-user-key`를 사용하는 것이 좋습니다.

---

## 타입 정의

클라이언트에서 사용할 TypeScript 타입 정의입니다:

```typescript
// AccessToken 발급 요청
export type GenerateTokenRequest = {
  authorizationCode: string;
  referrer: string;
};

// AccessToken 발급 응답
export type ApiResponse<T> = {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp?: string;
    [key: string]: unknown;
  };
};

export type ApiErrorResponse = {
  success: false;
  error: string;
  message?: string;
  path?: string;
  stack?: string; // 개발 환경에서만
};

export type GenerateTokenResponse = ApiResponse<{
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}>;

// RefreshToken 요청
export type RefreshTokenRequest = {
  refreshToken: string;
};

// RefreshToken 응답
export type RefreshTokenResponse = ApiResponse<{
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}>;

// 복호화된 사용자 정보
export type DecryptedUserInfo = {
  userKey: number;
  scope: string;
  agreedTerms: string[];
  name?: string;
  phone?: string;
  birthday?: string; // yyyyMMdd 형식
  ci?: string;
  gender?: "MALE" | "FEMALE";
  nationality?: "LOCAL" | "FOREIGNER";
  email?: string | null;
};

// 로그인 끊기 요청
export type RemoveTokenRequest = {
  userKey: number;
};
```

---

## 유의사항

### 1. 인증 (Authorization)

- 대부분의 API는 `Authorization: Bearer {accessToken}` 헤더가 필요합니다.
- AccessToken은 localStorage나 sessionStorage에 저장하고, 모든 API 요청에 포함해야 합니다.
- AccessToken이 만료되면 (401 에러) RefreshToken으로 자동 재발급하는 로직을 구현하는 것을 권장합니다.

### 2. 토큰 만료 시간

- **AccessToken**: 1시간 (3600초)
- **RefreshToken**: 14일
- **인가 코드**: 10분

토큰 만료 전에 갱신하거나, 만료 시 자동으로 재발급하는 로직을 구현하세요.

### 3. Rate Limiting

서버는 Rate Limiting을 적용하고 있습니다:

- 기본 설정: **15분당 100회** 요청
- Rate Limit 헤더 확인:
  - `RateLimit-Limit`: 최대 요청 수
  - `RateLimit-Remaining`: 남은 요청 수
  - `RateLimit-Reset`: 리셋 시간 (Unix timestamp)

429 에러 발생 시 응답 헤더를 확인하여 재시도 시간을 결정하세요.

### 4. CORS

- 개발 환경: 서버가 모든 도메인을 허용하도록 설정되어 있습니다.
- 프로덕션 환경: 서버의 `ALLOWED_ORIGINS` 환경 변수에 클라이언트 도메인이 포함되어 있어야 합니다.
- CORS 에러 발생 시 서버 설정을 확인하세요.

### 5. 에러 응답 형식

모든 API는 일관된 에러 응답 형식을 사용합니다:

```typescript
{
  error: string;        // 에러 메시지
  // 개발 환경에서만 포함:
  stack?: string;       // 스택 트레이스
  path?: string;        // 요청 경로
}
```

프로덕션 환경에서는 상세한 에러 정보가 숨겨집니다.

### 6. 사용자 정보 필드

- 개인정보 필드(`name`, `phone`, `birthday` 등)는 **scope에 따라 `null`일 수 있습니다**.
- `di` 필드는 항상 `null`입니다 (토스 스펙).
- 필드가 없을 경우를 대비한 null 체크를 구현하세요.

### 7. 토스 SDK 연동

- 토스 로그인을 사용하려면 **토스 Bedrock SDK**가 필요합니다.
- `appLogin()` 함수로 인가 코드를 받은 후, 서버의 `/api/toss/auth/generate-token`으로 토큰을 발급받습니다.
- SDK 설치 및 사용법은 [토스 개발자 문서](https://developers.toss.im/docs/apps-in-toss/login/intro)를 참고하세요.

---

## 에러 처리

### HTTP 상태 코드

| 코드  | 의미            | 처리 방법                  |
| ----- | --------------- | -------------------------- |
| `200` | 성공            | 정상 처리                  |
| `400` | 잘못된 요청     | 요청 데이터 확인           |
| `401` | 인증 실패       | 토큰 재발급 또는 재로그인  |
| `404` | 리소스 없음     | 요청 경로 확인             |
| `429` | Rate Limit 초과 | 재시도 시간 확인 후 재시도 |
| `500` | 서버 오류       | 잠시 후 재시도             |

### 에러 처리 권장사항

1. **401 에러**: AccessToken 만료 시 RefreshToken으로 자동 재발급
2. **429 에러**: Rate Limit 헤더 확인 후 적절한 시간 대기
3. **네트워크 에러**: 재시도 로직 구현 (exponential backoff 권장)
4. **에러 로깅**: 사용자에게는 간단한 메시지, 개발자에게는 상세 로그

### 에러 응답 예시

```typescript
// 400 Bad Request
{
  success: false,
  error: "authorizationCode와 referrer는 필수입니다.";
}

// 401 Unauthorized
{
  success: false,
  error: "유효하지 않은 토큰입니다. 토큰을 재발급해주세요.";
}

// 429 Too Many Requests
{
  success: false,
  error: "Too many requests from this IP, please try again later.";
}
```

---

## 문제 해결

### CORS 에러

**증상**: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`

**해결**:

1. 서버의 `ALLOWED_ORIGINS` 환경 변수에 클라이언트 도메인 추가
2. 개발 환경에서는 서버가 모든 도메인을 허용하도록 설정되어 있는지 확인

### 401 Unauthorized

**증상**: `401 Unauthorized` 응답

**해결**:

1. AccessToken이 localStorage/sessionStorage에 저장되어 있는지 확인
2. Authorization 헤더 형식 확인: `Bearer {token}` (공백 포함)
3. 토큰 만료 시 RefreshToken으로 자동 재발급 로직 구현

### Rate Limit 에러

**증상**: `429 Too Many Requests` 응답

**해결**:

1. 응답 헤더의 `RateLimit-Reset` 확인
2. 해당 시간까지 요청 중단
3. 요청 빈도 줄이기 (캐싱 활용 등)

### 네트워크 에러

**증상**: 네트워크 연결 실패

**해결**:

1. API 서버 URL 확인 (`VITE_API_BASE_URL`)
2. 서버가 실행 중인지 확인
3. 방화벽 또는 네트워크 설정 확인

---

## 참고 자료

- [토스 로그인 문서](https://developers.toss.im/docs/apps-in-toss/login/intro)
- [토스 Bedrock SDK](https://github.com/tosspayments/bedrock-sdk)
- [Express 공식 문서](https://expressjs.com/)

---

**마지막 업데이트**: 2024년
