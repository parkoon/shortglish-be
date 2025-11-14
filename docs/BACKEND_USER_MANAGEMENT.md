# 백엔드 사용자 관리 구현 가이드

Express 백엔드에서 토스 로그인 사용자를 관리하기 위한 구현 가이드입니다.

## 목차

1. [개요](#개요)
2. [Supabase 데이터베이스 설정](#supabase-데이터베이스-설정)
3. [백엔드 구현](#백엔드-구현)
4. [API 엔드포인트](#api-엔드포인트)
5. [환경 변수 설정](#환경-변수-설정)
6. [마이그레이션 전략](#마이그레이션-전략)

---

## 개요

### 목적

- Supabase Auth 의존성 제거
- `auth_provider` + `external_user_id` 조합으로 사용자 식별 (서비스 종속적이지 않은 구조)
- MongoDB 전환 시 백엔드만 변경하면 되도록 설계
- 클라이언트 코드 변경 최소화

### 아키텍처

```
클라이언트 (토스 토큰 보유)
    ↓
백엔드 API (토스 토큰 검증)
    ↓
Supabase DB (users 테이블)
```

---

## Supabase 데이터베이스 설정

### 1. users 테이블 생성

Supabase Dashboard에서 SQL Editor를 열고 다음 SQL을 실행합니다:

```sql
-- users 테이블 생성
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_provider TEXT NOT NULL,  -- 'TOSS', 'GOOGLE', 'APPLE' 등
  external_user_id TEXT NOT NULL,  -- 토스의 경우 userKey (문자열로 저장)
  name TEXT,
  phone TEXT,
  birthday TEXT,
  ci TEXT,
  gender TEXT CHECK (gender IN ('MALE', 'FEMALE')),
  nationality TEXT CHECK (nationality IN ('LOCAL', 'FOREIGNER')),
  email TEXT,
  -- 최소 권장 필드
  nickname TEXT,
  agreed_terms TEXT[],  -- 토스에서 받은 약관 동의 목록
  marketing_consent BOOLEAN DEFAULT false,
  notification_enabled BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- 복합 유니크 제약 (auth_provider + external_user_id)
  UNIQUE(auth_provider, external_user_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_users_auth_provider_external_user_id
  ON users(auth_provider, external_user_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at) WHERE deleted_at IS NULL;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 정책: 모든 사용자는 자신의 데이터만 조회 가능 (서비스 역할 사용 시)
-- 참고: 백엔드에서 Service Role Key를 사용하므로 이 정책은 선택사항입니다.
CREATE POLICY "Users can view own data"
  ON users FOR SELECT
  USING (true); -- Service Role은 모든 데이터 접근 가능

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  USING (true);
```

### 2. 타입 생성

클라이언트에서 타입을 생성하려면:

```bash
cd client
yarn db:types
```

---

## 백엔드 구현

### 1. 의존성 설치

```bash
cd server
yarn add @supabase/supabase-js
```

### 2. Supabase 클라이언트 설정

**파일**: `server/src/lib/supabase.ts`

```typescript
import { createClient } from "@supabase/supabase-js";

import { env } from "../config/env";

/**
 * Supabase 클라이언트 (Service Role Key 사용)
 * 백엔드에서만 사용하며, RLS를 우회하여 모든 데이터에 접근 가능합니다.
 */
export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

### 3. 환경 변수 추가

**파일**: `server/src/config/env.ts`

```typescript
const EnvSchema = z.object({
  // ... 기존 환경 변수들
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(), // 새로 추가
});
```

**파일**: `server/.env.example`

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. 타입 정의

**파일**: `server/src/types/user.ts`

```typescript
/**
 * 사용자 정보 타입
 */
export interface User {
  id: string;
  authProvider: string; // 'TOSS', 'GOOGLE', 'APPLE' 등
  externalUserId: string; // 토스의 경우 userKey (문자열)
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
}

/**
 * 사용자 생성/업데이트 요청 타입
 */
export interface UpsertUserRequest {
  authProvider: string;
  externalUserId: string;
  name?: string | null;
  phone?: string | null;
  birthday?: string | null;
  ci?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  nationality?: "LOCAL" | "FOREIGNER" | null;
  email?: string | null;
  agreedTerms?: string[] | null;
}
```

### 5. 사용자 서비스

**파일**: `server/src/services/user.service.ts`

```typescript
import { supabase } from "../lib/supabase";
import type { UpsertUserRequest, User } from "../types/user";

/**
 * auth_provider와 external_user_id로 사용자 조회
 */
export async function getUserByAuthProviderAndExternalId(
  authProvider: string,
  externalUserId: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_provider", authProvider)
    .eq("external_user_id", externalUserId)
    .is("deleted_at", null) // 활성 사용자만 조회
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // 사용자를 찾을 수 없음
      return null;
    }
    throw new Error(`Failed to get user: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // snake_case → camelCase 변환
  return {
    id: data.id,
    authProvider: data.auth_provider,
    externalUserId: data.external_user_id,
    name: data.name,
    phone: data.phone,
    birthday: data.birthday,
    ci: data.ci,
    gender: data.gender,
    nationality: data.nationality,
    email: data.email,
    nickname: data.nickname,
    agreedTerms: data.agreed_terms,
    marketingConsent: data.marketing_consent ?? false,
    notificationEnabled: data.notification_enabled ?? true,
    lastLoginAt: data.last_login_at,
    deletedAt: data.deleted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 사용자 생성 또는 업데이트 (Upsert)
 */
export async function upsertUser(request: UpsertUserRequest): Promise<User> {
  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        auth_provider: request.authProvider,
        external_user_id: request.externalUserId,
        name: request.name,
        phone: request.phone,
        birthday: request.birthday,
        ci: request.ci,
        gender: request.gender,
        nationality: request.nationality,
        email: request.email,
        agreed_terms: request.agreedTerms,
        last_login_at: new Date().toISOString(), // 로그인 시점 업데이트
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "auth_provider,external_user_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to upsert user: ${error.message}`);
  }

  if (!data) {
    throw new Error("Failed to upsert user: No data returned");
  }

  // snake_case → camelCase 변환
  return {
    id: data.id,
    authProvider: data.auth_provider,
    externalUserId: data.external_user_id,
    name: data.name,
    phone: data.phone,
    birthday: data.birthday,
    ci: data.ci,
    gender: data.gender,
    nationality: data.nationality,
    email: data.email,
    nickname: data.nickname,
    agreedTerms: data.agreed_terms,
    marketingConsent: data.marketing_consent ?? false,
    notificationEnabled: data.notification_enabled ?? true,
    lastLoginAt: data.last_login_at,
    deletedAt: data.deleted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * 사용자 탈퇴 (Soft Delete)
 */
export async function deleteUser(
  authProvider: string,
  externalUserId: string
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("auth_provider", authProvider)
    .eq("external_user_id", externalUserId)
    .is("deleted_at", null); // 이미 탈퇴한 사용자는 제외

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}
```

### 6. 토스 토큰 검증 미들웨어

**파일**: `server/src/middleware/validate-toss-token.ts`

```typescript
import type { Request, Response, NextFunction } from "express";
import { getUserInfo } from "../services/toss.service";

/**
 * 토스 AccessToken을 검증하고 사용자 정보를 요청 객체에 추가하는 미들웨어
 */
export async function validateTossToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Authorization header가 없거나 형식이 올바르지 않습니다.",
      });
      return;
    }

    const accessToken = authHeader.substring(7);

    // 토스 API로 사용자 정보 조회 (토큰 검증)
    const userInfo = await getUserInfo(accessToken);

    // 요청 객체에 토스 사용자 정보 추가
    (req as Request & { tossUserInfo: typeof userInfo }).tossUserInfo =
      userInfo;

    next();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "토큰 검증 실패";
    res.status(401).json({
      success: false,
      error: errorMessage,
    });
  }
}
```

### 7. 사용자 컨트롤러

**파일**: `server/src/controllers/user.controller.ts`

```typescript
import type { Request, Response } from "express";
import {
  deleteUser,
  getUserByAuthProviderAndExternalId,
  upsertUser,
} from "../services/user.service";
import type { UpsertUserRequest } from "../types/user";

/**
 * 현재 로그인한 사용자 정보 조회
 * GET /api/users/me
 */
export async function getCurrentUser(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tossUserInfo = (
      req as Request & {
        tossUserInfo: { userKey: number; agreedTerms?: string[] };
      }
    ).tossUserInfo;

    if (!tossUserInfo) {
      res.status(401).json({
        success: false,
        error: "인증되지 않은 사용자입니다.",
      });
      return;
    }

    const authProvider = "TOSS";
    const externalUserId = String(tossUserInfo.userKey);

    // DB에서 사용자 조회
    let user = await getUserByAuthProviderAndExternalId(
      authProvider,
      externalUserId
    );

    // 사용자가 없으면 생성
    if (!user) {
      user = await upsertUser({
        authProvider,
        externalUserId,
        agreedTerms: tossUserInfo.agreedTerms || [],
        // 토스에서 받은 정보로 초기 생성
        name: null,
        phone: null,
        birthday: null,
        ci: null,
        gender: null,
        nationality: null,
        email: null,
      });
    } else {
      // 기존 사용자도 last_login_at 업데이트 및 약관 동의 정보 업데이트
      user = await upsertUser({
        authProvider,
        externalUserId,
        agreedTerms: tossUserInfo.agreedTerms || user.agreedTerms || [],
        name: user.name,
        phone: user.phone,
        birthday: user.birthday,
        ci: user.ci,
        gender: user.gender,
        nationality: user.nationality,
        email: user.email,
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "사용자 조회 실패";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * 사용자 정보 업데이트 (토스 사용자 정보로 동기화)
 * POST /api/users/me
 */
export async function updateCurrentUser(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tossUserInfo = (req as Request & { tossUserInfo: any }).tossUserInfo;

    if (!tossUserInfo) {
      res.status(401).json({
        success: false,
        error: "인증되지 않은 사용자입니다.",
      });
      return;
    }

    const authProvider = "TOSS";
    const externalUserId = String(tossUserInfo.userKey);

    // 토스에서 받은 사용자 정보로 업데이트
    const updateRequest: UpsertUserRequest = {
      authProvider,
      externalUserId,
      name: tossUserInfo.name || null,
      phone: tossUserInfo.phone || null,
      birthday: tossUserInfo.birthday || null,
      ci: tossUserInfo.ci || null,
      gender: tossUserInfo.gender || null,
      nationality: tossUserInfo.nationality || null,
      email: tossUserInfo.email || null,
      agreedTerms: tossUserInfo.agreedTerms || [],
    };

    const user = await upsertUser(updateRequest);

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "사용자 업데이트 실패";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}

/**
 * 사용자 탈퇴
 * DELETE /api/users/me
 */
export async function deleteCurrentUser(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const tossUserInfo = (
      req as Request & { tossUserInfo: { userKey: number } }
    ).tossUserInfo;

    if (!tossUserInfo) {
      res.status(401).json({
        success: false,
        error: "인증되지 않은 사용자입니다.",
      });
      return;
    }

    const authProvider = "TOSS";
    const externalUserId = String(tossUserInfo.userKey);

    await deleteUser(authProvider, externalUserId);

    res.json({
      success: true,
      data: { message: "탈퇴가 완료되었습니다." },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "탈퇴 처리 실패";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
}
```

### 8. 라우트 설정

**파일**: `server/src/routes/user.routes.ts`

```typescript
import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { validateTossToken } from "../middleware/validate-toss-token";

const router = Router();

/**
 * GET /api/users/me
 * 현재 로그인한 사용자 정보 조회
 * - 토스 AccessToken 필요
 * - 사용자가 없으면 자동 생성
 * - 로그인 시점(last_login_at) 자동 업데이트
 */
router.get("/me", validateTossToken, userController.getCurrentUser);

/**
 * POST /api/users/me
 * 사용자 정보 업데이트 (토스 사용자 정보로 동기화)
 * - 토스 AccessToken 필요
 * - 토스에서 받은 최신 정보로 업데이트
 */
router.post("/me", validateTossToken, userController.updateCurrentUser);

/**
 * DELETE /api/users/me
 * 사용자 탈퇴 (Soft Delete)
 * - 토스 AccessToken 필요
 * - deleted_at 필드에 탈퇴 시점 기록
 */
router.delete("/me", validateTossToken, userController.deleteCurrentUser);

export default router;
```

### 9. 메인 앱에 라우트 추가

**파일**: `server/src/app.ts`

```typescript
import express from "express";
// ... 기존 imports
import userRoutes from "./routes/user.routes";

const app = express();

// ... 기존 미들웨어 설정

// 기존 라우트들
app.use("/api/toss", tossApiRateLimiter, tossRoutes);

// 사용자 관리 라우트 추가
app.use("/api/users", apiRateLimiter, userRoutes);

// ... 나머지 설정
```

---

## API 엔드포인트

### 1. 현재 사용자 정보 조회

**엔드포인트**: `GET /api/users/me`

**인증**: Bearer Token (토스 AccessToken)

**설명**:

- 토스 AccessToken으로 사용자 정보를 조회합니다.
- 사용자가 DB에 없으면 자동으로 생성합니다.
- 로그인 시 `last_login_at`이 자동으로 업데이트됩니다.
- `agreedTerms`는 토스에서 받은 약관 동의 목록입니다.

**응답**:

```typescript
{
  success: true,
  data: {
    id: string,
    authProvider: string,  // 'TOSS'
    externalUserId: string,  // 토스 userKey (문자열)
    name?: string | null,
    phone?: string | null,
    birthday?: string | null,
    ci?: string | null,
    gender?: 'MALE' | 'FEMALE' | null,
    nationality?: 'LOCAL' | 'FOREIGNER' | null,
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

### 2. 사용자 정보 업데이트 (토스 동기화)

**엔드포인트**: `POST /api/users/me`

**인증**: Bearer Token (토스 AccessToken)

**설명**:

- 토스 AccessToken으로 토스 사용자 정보를 조회한 후,
- DB의 사용자 정보를 토스 정보로 업데이트합니다.
- 사용자가 없으면 생성합니다.

**응답**:

```typescript
{
  success: true,
  data: {
    id: string,
    authProvider: string,  // 'TOSS'
    externalUserId: string,  // 토스 userKey (문자열)
    name?: string | null,
    phone?: string | null,
    birthday?: string | null,
    ci?: string | null,
    gender?: 'MALE' | 'FEMALE' | null,
    nationality?: 'LOCAL' | 'FOREIGNER' | null,
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

### 3. 사용자 탈퇴

**엔드포인트**: `DELETE /api/users/me`

**인증**: Bearer Token (토스 AccessToken)

**설명**:

- 사용자 탈퇴를 처리합니다.
- Soft Delete 방식으로 `deleted_at` 필드에 탈퇴 시점을 기록합니다.
- 이미 탈퇴한 사용자는 재탈퇴할 수 없습니다.

**응답**:

```typescript
{
  success: true,
  data: {
    message: '탈퇴가 완료되었습니다.'
  }
}
```

**유의사항**:

- 탈퇴 후에는 `GET /api/users/me`로 조회할 수 없습니다 (deleted_at IS NULL 조건).
- 탈퇴한 사용자의 데이터는 법적 요구사항에 따라 일정 기간 보관 후 삭제할 수 있습니다.

---

## 환경 변수 설정

### 서버 환경 변수

**파일**: `server/.env`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# 기존 환경 변수들...
```

### Service Role Key 확인 방법

1. Supabase Dashboard 접속
2. Settings → API 이동
3. "service_role" 키 복사 (⚠️ 절대 클라이언트에 노출하지 마세요!)

---

## 마이그레이션 전략

### 현재 → MongoDB 전환 시

**변경 필요 사항**:

1. **서비스 레이어만 변경**

   - `server/src/services/user.service.ts`에서 Supabase 클라이언트를 MongoDB 클라이언트로 교체
   - 쿼리 문법만 변경 (Supabase → MongoDB)

2. **타입 정의 유지**

   - `server/src/types/user.ts`는 그대로 사용 가능

3. **API 인터페이스 유지**
   - 엔드포인트 경로와 응답 형식은 동일하게 유지
   - 클라이언트 코드 변경 불필요

**예시 (MongoDB 버전)**:

```typescript
// server/src/services/user.service.ts (MongoDB 버전)
import { MongoClient } from "mongodb";

export async function getUserByAuthProviderAndExternalId(
  authProvider: string,
  externalUserId: string
): Promise<User | null> {
  const db = await getDatabase();
  const user = await db.collection("users").findOne({
    authProvider,
    externalUserId,
  });

  if (!user) return null;

  return {
    id: user._id.toString(),
    authProvider: user.authProvider,
    externalUserId: user.externalUserId,
    // ... 나머지 필드
  };
}
```

---

## 참고 사항

### 보안

- Service Role Key는 **절대 클라이언트에 노출하지 마세요**
- 백엔드 서버에서만 사용합니다
- 환경 변수로 관리하고, Git에 커밋하지 마세요

### 성능

- `auth_provider`와 `external_user_id` 복합 인덱스를 생성하여 조회 성능을 최적화했습니다
- `deleted_at IS NULL` 조건으로 활성 사용자만 조회하도록 인덱스 최적화
- 필요시 추가 인덱스를 고려하세요

### Soft Delete

- 사용자 탈퇴는 Soft Delete 방식으로 처리합니다
- `deleted_at` 필드에 탈퇴 시점을 기록하여 데이터를 보존합니다
- 법적 요구사항에 따라 일정 기간 후 완전 삭제하는 배치 작업을 고려할 수 있습니다

### 필드 설명

- **nickname**: 사용자 표시명 (name이 없을 수 있어서)
- **agreedTerms**: 토스에서 받은 약관 동의 목록
- **marketingConsent**: 마케팅 수신 동의 (법적 요구사항)
- **notificationEnabled**: 푸시 알림 설정
- **lastLoginAt**: 마지막 로그인 시점 (활성 사용자 분석용)
- **deletedAt**: 탈퇴 시점 (Soft Delete)

### 에러 처리

- 모든 에러는 일관된 형식으로 반환합니다:
  ```typescript
  {
    success: false,
    error: "에러 메시지"
  }
  ```

---

**마지막 업데이트**: 2024년
