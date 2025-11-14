# 클라이언트 사용자 관리 가이드

React + TypeScript + Vite 클라이언트에서 토스 로그인 및 사용자 관리 API를 사용하는 가이드입니다.

## 목차

1. [토스 로그인 플로우](#토스-로그인-플로우)
2. [API 엔드포인트](#api-엔드포인트)
3. [사용 예시](#사용-예시)
4. [타입 정의](#타입-정의)
5. [에러 처리](#에러-처리)

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
   → AccessToken, RefreshToken 받아서 저장
   ↓
5. 클라이언트: GET /api/users/me 호출
   → 서버에서 자동으로:
     - 토스 API로 사용자 정보 조회
     - 복호화
     - Supabase에 저장/업데이트
   → User 객체 반환
```

### 중요 사항

- **단일 엔드포인트**: 클라이언트는 `/api/users/me`만 호출하면 됩니다.
- **자동 처리**: 서버에서 토스 API 호출, 복호화, DB 저장/업데이트를 모두 처리합니다.
- **효율적**: 토스 API 호출은 한 번만 수행되며, 미들웨어에서 재사용됩니다.

---

## API 엔드포인트

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

### 사용자 관리 API (Supabase)

| 메서드 | 경로            | 설명                                    |
| ------ | --------------- | --------------------------------------- |
| `GET`  | `/api/users/me` | Supabase에서 사용자 정보 조회           |
| `POST` | `/api/users/me` | 토스 정보로 사용자 정보 동기화          |
| `DELETE` | `/api/users/me` | 사용자 탈퇴 (Soft Delete)               |

---

## API 상세 설명

### 1. 사용자 정보 조회 (자동 저장/업데이트)

**엔드포인트**: `GET /api/users/me`

**설명**: 
- **클라이언트에서 사용하는 주요 엔드포인트입니다.**
- 서버에서 자동으로:
  1. 토스 API로 사용자 정보 조회 (토큰 검증)
  2. 사용자 정보 복호화
  3. Supabase에 저장/업데이트 (없으면 생성, 있으면 업데이트)
  4. DB의 사용자 정보 반환

**요청 헤더**:
```
Authorization: Bearer {accessToken}
```

**응답**:
```typescript
{
  success: true,
  data: {
    id: string,                    // Supabase UUID
    authProvider: "TOSS",
    externalUserId: string,         // 토스 userKey (문자열)
    name?: string | null,
    phone?: string | null,
    birthday?: string | null,
    ci?: string | null,
    gender?: "MALE" | "FEMALE" | null,
    nationality?: "LOCAL" | "FOREIGNER" | null,
    email?: string | null,
    nickname?: string | null,
    agreedTerms?: string[] | null,
    marketingConsent: boolean,
    notificationEnabled: boolean,
    lastLoginAt?: string | null,
    deletedAt?: string | null,
    createdAt: string,
    updatedAt: string
  }
}
```

**유의사항**:
- 사용자가 DB에 없으면 토스에서 정보를 가져와서 저장한 후 반환합니다.
- `lastLoginAt`은 로그인 시점에 자동으로 업데이트됩니다.
- `deletedAt`이 null이 아닌 경우 탈퇴한 사용자입니다.

---

### 3. 사용자 정보 업데이트 (토스 동기화)

**엔드포인트**: `POST /api/users/me`

**설명**: 
- 토스에서 최신 사용자 정보를 가져와서 Supabase에 업데이트합니다.
- 사용자가 없으면 생성합니다.

**요청 헤더**:
```
Authorization: Bearer {accessToken}
```

**응답**:
```typescript
{
  success: true,
  data: {
    id: string,
    authProvider: "TOSS",
    externalUserId: string,
    // ... 사용자 정보 필드들
  },
  message: "사용자 정보가 업데이트되었습니다."
}
```

**유의사항**:
- 토스에서 받은 최신 정보로 DB를 업데이트합니다.
- `lastLoginAt`이 자동으로 업데이트됩니다.

---

### 4. 사용자 탈퇴

**엔드포인트**: `DELETE /api/users/me`

**설명**: 
- 사용자 탈퇴를 처리합니다.
- Soft Delete 방식으로 `deletedAt` 필드에 탈퇴 시점을 기록합니다.

**요청 헤더**:
```
Authorization: Bearer {accessToken}
```

**응답**:
```typescript
{
  success: true,
  data: {
    message: "탈퇴가 완료되었습니다."
  },
  message: "탈퇴가 완료되었습니다."
}
```

**유의사항**:
- 탈퇴 후에는 `GET /api/users/me`로 조회할 수 없습니다.
- 클라이언트에서도 토큰을 제거해야 합니다.
- 탈퇴한 사용자는 토스 로그인 연결도 끊어야 합니다 (`POST /api/toss/auth/remove-by-user-key`).

---

## 사용 예시

### 토스 로그인 및 사용자 정보 조회

```typescript
import { appLogin } from "@tosspayments/bedrock-sdk";
import { apiClient } from "@/lib/api";

// 1. 토스 SDK로 로그인
const { authorizationCode, referrer } = await appLogin();

// 2. 토큰 발급
const tokenResponse = await apiClient.post("/api/toss/auth/generate-token", {
  authorizationCode,
  referrer,
});

const { accessToken, refreshToken } = tokenResponse.data.data;

// 토큰 저장
localStorage.setItem("accessToken", accessToken);
localStorage.setItem("refreshToken", refreshToken);

// 3. 사용자 정보 조회 (서버에서 자동으로 토스 API 호출, 복호화, DB 저장/업데이트)
// apiClient의 인터셉터가 자동으로 Authorization 헤더에 토큰 추가
const userResponse = await apiClient.get("/api/users/me");

const user = userResponse.data.data;
// { id, authProvider, externalUserId, name, phone, ..., createdAt, updatedAt }
// 서버에서 자동으로:
// - 토스 API로 사용자 정보 조회
// - 복호화
// - Supabase에 저장/업데이트
// - DB 정보 반환
```

### 사용자 정보 업데이트

```typescript
// 토스에서 최신 정보로 동기화
const updateResponse = await apiClient.post(
  "/api/users/me",
  {},
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);

const updatedUser = updateResponse.data.data;
```

### 사용자 탈퇴

```typescript
// 1. Supabase에서 탈퇴 처리
await apiClient.delete("/api/users/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});

// 2. 토스 로그인 연결 끊기
const userKey = dbUser.externalUserId; // 또는 tossUserInfo.userKey
await apiClient.post(
  "/api/toss/auth/remove-by-user-key",
  { userKey: Number(userKey) },
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);

// 3. 클라이언트에서 토큰 제거
localStorage.removeItem("accessToken");
localStorage.removeItem("refreshToken");
```

---

## 타입 정의

```typescript
// 토스 사용자 정보 (복호화된 상태)
export type TossUserInfo = {
  userKey: number;
  scope: string;
  agreedTerms: string[];
  name?: string;
  phone?: string;
  birthday?: string;
  ci?: string;
  gender?: "MALE" | "FEMALE";
  nationality?: "LOCAL" | "FOREIGNER";
  email?: string | null;
};

// Supabase 사용자 정보
export type User = {
  id: string;
  authProvider: string;
  externalUserId: string;
  name?: string | null;
  phone?: string | null;
  birthday?: string | null;
  ci?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  nationality?: "LOCAL" | "FOREIGNER" | null;
  email?: string | null;
  nickname?: string | null;
  agreedTerms?: string[] | null;
  marketingConsent: boolean;
  notificationEnabled: boolean;
  lastLoginAt?: string | null;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

// API 응답 타입
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
```

---

## 에러 처리

### HTTP 상태 코드

| 코드 | 의미 | 처리 방법 |
|------|------|----------|
| `200` | 성공 | 정상 처리 |
| `400` | 잘못된 요청 | 요청 데이터 확인 |
| `401` | 인증 실패 | 토큰 재발급 또는 재로그인 |
| `404` | 리소스 없음 | 요청 경로 확인 |
| `429` | Rate Limit 초과 | 재시도 시간 확인 후 재시도 |
| `500` | 서버 오류 | 잠시 후 재시도 |

### 에러 응답 예시

```typescript
// 401 Unauthorized
{
  success: false,
  error: "인증되지 않은 사용자입니다."
}

// 500 Internal Server Error
{
  success: false,
  error: "사용자 조회 실패"
}
```

---

## 권장 사용 패턴

### 권장 사용 패턴

```typescript
// GET /api/users/me만 호출하면 됩니다
// 서버에서 모든 처리를 자동으로 수행합니다
const response = await apiClient.get("/api/users/me");
const user = response.data.data;
// { id, authProvider, externalUserId, name, phone, ..., createdAt, updatedAt, lastLoginAt }
```

**장점**:
- 단일 API 호출로 모든 처리 완료
- 토스 API 호출은 미들웨어에서 한 번만 수행 (효율적)
- 자동으로 DB에 저장/업데이트
- DB의 추가 정보 (id, createdAt, updatedAt, lastLoginAt 등) 포함

---

## 주의사항

1. **단일 엔드포인트**: 클라이언트는 `/api/users/me`만 호출하면 됩니다. 토스 사용자 정보 조회 API를 별도로 호출할 필요 없습니다.
2. **토큰 관리**: AccessToken은 localStorage에 저장하고, apiClient의 인터셉터가 자동으로 헤더에 추가합니다.
3. **자동 처리**: 서버에서 토스 API 호출, 복호화, DB 저장/업데이트를 모두 처리합니다.
4. **탈퇴 처리**: 탈퇴 시 Supabase와 토스 모두에서 연결을 끊어야 합니다.

---

## 참고 자료

- [토스 로그인 문서](https://developers.toss.im/docs/apps-in-toss/login/intro)
- [클라이언트 연동 가이드](./CLIENT_INTEGRATION.md)
- [백엔드 사용자 관리 가이드](./BACKEND_USER_MANAGEMENT.md)

---

**마지막 업데이트**: 2024년

