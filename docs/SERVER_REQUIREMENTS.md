# 서버 구현 요구사항 (클라이언트 기준)

클라이언트 구현에 맞춘 서버 API 요구사항입니다.

## 목차

1. [클라이언트 플로우](#클라이언트-플로우)
2. [API 엔드포인트 요구사항](#api-엔드포인트-요구사항)
3. [응답 형식](#응답-형식)
4. [에러 처리](#에러-처리)
5. [구현 체크리스트](#구현-체크리스트)

---

## 클라이언트 플로우

### 토스 로그인 플로우

```
1. 클라이언트: 토스 SDK로 인가 코드 받기
   ↓
2. 클라이언트: POST /api/toss/auth/generate-token 호출
   → AccessToken, RefreshToken 받아서 localStorage에 저장
   ↓
3. 클라이언트: GET /api/users/me 호출
   → Authorization: Bearer {accessToken} 헤더 자동 추가
   → 서버에서 토스 API로 사용자 정보 조회 및 DB 저장/업데이트
   → User 객체 반환
```

### 중요 사항

- **클라이언트는 토큰을 자동으로 헤더에 추가합니다** (`api-client.ts`의 인터셉터)
- **클라이언트는 `/api/users/me`만 호출합니다** (토스 사용자 정보 조회 API를 별도로 호출하지 않음)
- **서버에서 토스 API 호출과 DB 저장을 모두 처리해야 합니다**

---

## API 엔드포인트 요구사항

### GET /api/users/me

**역할**: 현재 로그인한 사용자 정보 조회 및 자동 저장/업데이트

**요청 헤더**:
```
Authorization: Bearer {tossAccessToken}
```

**서버 처리 로직**:

1. **토큰 검증 및 사용자 정보 조회**
   - `Authorization` 헤더에서 토스 AccessToken 추출
   - 토스 API로 사용자 정보 조회 (`GET /api-partner/v1/apps-in-toss/user/oauth2/me`)
   - 사용자 정보 복호화

2. **DB 조회/생성/업데이트**
   - `auth_provider = 'TOSS'`, `external_user_id = String(userKey)`로 사용자 조회
   - 사용자가 없으면 생성:
     ```typescript
     {
       authProvider: 'TOSS',
       externalUserId: String(tossUserInfo.userKey),
       agreedTerms: tossUserInfo.agreedTerms || [],
       name: tossUserInfo.name || null,
       phone: tossUserInfo.phone || null,
       birthday: tossUserInfo.birthday || null,
       ci: tossUserInfo.ci || null,
       gender: tossUserInfo.gender || null,
       nationality: tossUserInfo.nationality || null,
       email: tossUserInfo.email || null,
     }
     ```
   - 사용자가 있으면 업데이트:
     - `last_login_at` 업데이트
     - `agreedTerms` 업데이트
     - 토스에서 받은 정보로 필드 업데이트 (name, phone, birthday 등)

3. **응답 반환**
   - `ApiSuccessResponse<User>` 형식으로 반환

**응답 예시**:
```typescript
{
  success: true,
  data: {
    id: "uuid-string",
    authProvider: "TOSS",
    externalUserId: "518165018",  // userKey를 문자열로 저장
    name: "홍길동" | null,
    phone: "010-1234-5678" | null,
    birthday: "19900101" | null,
    ci: "ci-string" | null,
    gender: "MALE" | "FEMALE" | null,
    nationality: "LOCAL" | "FOREIGNER" | null,
    email: "user@example.com" | null,
    nickname: null,
    agreedTerms: ["TERMS_1", "TERMS_2"] | null,
    marketingConsent: false,
    notificationEnabled: true,
    lastLoginAt: "2024-01-01T00:00:00.000Z" | null,
    deletedAt: null,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z"
  }
}
```

---

## 응답 형식

### 성공 응답

모든 API는 다음 형식을 따라야 합니다:

```typescript
{
  success: true,
  data: T,  // 실제 데이터
  message?: string,  // 선택적 메시지
  meta?: {
    timestamp?: string,
    [key: string]: unknown
  }
}
```

### 에러 응답

```typescript
{
  success: false,
  error: string,  // 에러 메시지 (필수)
  message?: string,  // 선택적 상세 메시지
  meta?: {
    timestamp?: string,
    [key: string]: unknown
  }
}
```

---

## 에러 처리

### HTTP 상태 코드

| 코드 | 의미 | 클라이언트 동작 |
|------|------|----------------|
| `200` | 성공 | 정상 처리 |
| `401` | 인증 실패 | 토큰이 유효하지 않음 → 재로그인 필요 |
| `500` | 서버 오류 | 에러 메시지 표시 |

### 401 에러 예시

```typescript
{
  success: false,
  error: "인증되지 않은 사용자입니다."
}
```

### 500 에러 예시

```typescript
{
  success: false,
  error: "사용자 조회 실패"
}
```

---

## User 타입 정의

클라이언트가 기대하는 User 타입:

```typescript
interface User {
  id: string                    // UUID
  authProvider: string          // 'TOSS'
  externalUserId: string         // 토스 userKey (문자열)
  name?: string | null
  phone?: string | null
  birthday?: string | null      // yyyyMMdd 형식
  ci?: string | null
  gender?: 'MALE' | 'FEMALE' | null
  nationality?: 'LOCAL' | 'FOREIGNER' | null
  email?: string | null
  nickname?: string | null
  agreedTerms?: string[] | null
  marketingConsent: boolean     // 기본값: false
  notificationEnabled: boolean  // 기본값: true
  lastLoginAt?: string | null   // ISO 8601 형식
  deletedAt?: string | null     // ISO 8601 형식 (null이면 활성 사용자)
  createdAt: string            // ISO 8601 형식
  updatedAt: string            // ISO 8601 형식
}
```

---

## 구현 체크리스트

### 필수 구현 사항

- [ ] `GET /api/users/me` 엔드포인트 구현
- [ ] `Authorization: Bearer {token}` 헤더에서 토큰 추출
- [ ] 토스 API로 사용자 정보 조회 (`/api-partner/v1/apps-in-toss/user/oauth2/me`)
- [ ] 사용자 정보 복호화 (AES-256-GCM)
- [ ] DB에서 사용자 조회 (`auth_provider='TOSS'`, `external_user_id=String(userKey)`)
- [ ] 사용자 없으면 생성, 있으면 업데이트
- [ ] `last_login_at` 자동 업데이트
- [ ] `ApiSuccessResponse<User>` 형식으로 응답 반환
- [ ] 에러 발생 시 `ApiErrorResponse` 형식으로 응답 반환

### 데이터베이스 스키마

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider TEXT NOT NULL,           -- 'TOSS'
  external_user_id TEXT NOT NULL,        -- userKey (문자열)
  name TEXT,
  phone TEXT,
  birthday TEXT,
  ci TEXT,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE')),
  nationality TEXT CHECK (nationality IN ('LOCAL', 'FOREIGNER')),
  email TEXT,
  nickname TEXT,
  agreed_terms TEXT[],
  marketing_consent BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auth_provider, external_user_id)
);
```

### 미들웨어

- [ ] `validateTossToken` 미들웨어 구현
  - `Authorization` 헤더에서 토큰 추출
  - 토스 API로 사용자 정보 조회 및 복호화
  - `req.tossUserInfo`에 사용자 정보 저장

### 컨트롤러

- [ ] `getCurrentUser` 컨트롤러 구현
  - `req.tossUserInfo`에서 `userKey` 추출
  - `authProvider = 'TOSS'`, `externalUserId = String(userKey)`로 DB 조회
  - 없으면 생성, 있으면 업데이트
  - `User` 객체 반환

---

## 클라이언트 코드 참고

### 클라이언트 호출 코드

```typescript
// src/lib/toss-auth.ts
export async function signInWithToss(): Promise<{ user: User; tossUserKey: number }> {
  // 1. 토스 SDK로 인가 코드 받기
  const { authorizationCode, referrer } = await requestTossLogin()

  // 2. 인가 코드로 AccessToken 발급
  const tokenData = await generateToken({
    authorizationCode,
    referrer,
  })

  // 3. 토큰 저장
  saveTokens({
    accessToken: tokenData.accessToken,
    refreshToken: tokenData.refreshToken,
    expiresIn: tokenData.expiresIn,
  })

  // 4. 백엔드 API로 사용자 정보 조회 (자동 생성/업데이트)
  const user = await getCurrentUser()  // GET /api/users/me 호출

  // 토스 userKey 추출 (externalUserId에서)
  const tossUserKey = parseInt(user.externalUserId, 10)

  return { user, tossUserKey }
}
```

### API 클라이언트 (토큰 자동 추가)

```typescript
// src/lib/api-client.ts
apiClient.interceptors.request.use(
  async config => {
    // 토스 AccessToken이 있으면 자동으로 추가
    const { getAccessToken, hasValidToken } = await import('./toss-token')

    if (hasValidToken()) {
      const token = getAccessToken()
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    }

    return config
  },
  // ...
)
```

---

## 주의사항

1. **토큰은 클라이언트에서 자동으로 헤더에 추가됩니다**
   - 서버는 `Authorization` 헤더만 확인하면 됩니다
   - 클라이언트가 토큰을 보내지 않으면 401 에러 반환

2. **클라이언트는 `/api/users/me`만 호출합니다**
   - 토스 사용자 정보 조회 API(`/api/toss/user/me/decrypted`)를 별도로 호출하지 않습니다
   - 서버에서 토스 API 호출과 DB 저장을 모두 처리해야 합니다

3. **응답 형식은 반드시 `ApiSuccessResponse` 형식을 따라야 합니다**
   - 클라이언트의 `api-client.ts`가 이 형식을 기대합니다
   - `success: true/false` 필드가 필수입니다

4. **`externalUserId`는 문자열로 저장해야 합니다**
   - 클라이언트에서 `parseInt(user.externalUserId, 10)`로 숫자로 변환합니다
   - 토스 `userKey`는 숫자지만 DB에는 문자열로 저장합니다

---

## 참고 문서

- [백엔드 사용자 관리 가이드](./BACKEND_USER_MANAGEMENT.md)
- [API 통합 가이드](./API_INTEGRATION.md)

---

**마지막 업데이트**: 2024년

