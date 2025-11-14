# Supabase 설정 TODO

Supabase 사용자 관리 기능을 사용하기 위해 필요한 설정입니다.

## 1. Supabase Service Role Key 확인

1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택: **"getsomething"** (guuzamgogpvihafgwhdn)
3. Settings → API 이동
4. **service_role** 키 복사
   - ⚠️ **절대 클라이언트에 노출하지 마세요!**
   - 백엔드 서버에서만 사용합니다.

## 2. 로컬 개발 환경 설정

`.env` 파일에 다음 환경 변수를 추가하세요:

```env
# Supabase 설정
SUPABASE_URL=https://guuzamgogpvihafgwhdn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## 3. Railway 배포 환경 설정

### 방법 1: Railway CLI 사용 (권장)

```bash
# 프로젝트 연결 (이미 연결되어 있다면 생략)
railway link

# 환경 변수 설정
railway variables --set "SUPABASE_URL=https://guuzamgogpvihafgwhdn.supabase.co"
railway variables --set "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here"
```

### 방법 2: Railway Dashboard 사용

1. Railway 프로젝트 → Variables 탭
2. 다음 환경 변수 추가:
   - `SUPABASE_URL`: `https://guuzamgogpvihafgwhdn.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`: (복사한 service_role 키)

## 4. 확인

서버를 시작하면 Supabase 연결이 자동으로 설정됩니다.

```bash
yarn dev
```

`GET /api/toss/user/me/decrypted` 엔드포인트를 호출하면 자동으로 Supabase에 사용자 정보가 저장됩니다.

## 5. 테이블 확인

Supabase Dashboard → Table Editor에서 `users` 테이블이 생성되었는지 확인하세요.

---

**참고**: 
- Supabase 프로젝트: **"getsomething"** (guuzamgogpvihafgwhdn)
- 테이블: `users` (이미 생성됨)
- Service Role Key는 환경 변수로만 관리하고 Git에 커밋하지 마세요.
