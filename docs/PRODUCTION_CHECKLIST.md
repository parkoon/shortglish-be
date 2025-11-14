# Express 프로덕션 배포 체크리스트

Express 애플리케이션을 프로덕션 환경에 배포하기 전에 확인해야 할 항목들을 정리한 문서입니다.

## 🔒 보안 (Security) - 필수

### 1. Helmet.js
- **목적**: 보안 관련 HTTP 헤더 설정
- **필요성**: XSS, CSRF, Clickjacking 등 공격 방어
- **구현**: `helmet` 패키지 설치 및 미들웨어 추가
- **상태**: ❌ 미구현

```typescript
import helmet from 'helmet';
app.use(helmet());
```

### 2. CORS 설정
- **목적**: 허용된 도메인만 API 접근 가능하도록 제한
- **필요성**: Cross-Origin 요청 제어 및 보안 강화
- **구현**: `cors` 패키지 설치 및 설정
- **상태**: ❌ 미구현

```typescript
import cors from 'cors';
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true
}));
```

### 3. Rate Limiting
- **목적**: DDoS 공격 및 과도한 요청 방지
- **필요성**: 서버 리소스 보호 및 공정한 사용 보장
- **구현**: `express-rate-limit` 패키지 설치 및 설정
- **상태**: ❌ 미구현

```typescript
import rateLimit from 'express-rate-limit';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 100 // 최대 100 요청
});
app.use('/api/', limiter);
```

### 4. 입력 검증
- **목적**: 잘못된 또는 악의적인 입력 데이터 차단
- **필요성**: SQL Injection, XSS 등 공격 방지
- **구현**: `express-validator` 또는 `zod` 사용
- **상태**: ❌ 미구현

### 5. 환경 변수 검증
- **목적**: 필수 환경 변수 누락 시 앱 시작 방지
- **필요성**: 런타임 에러 방지
- **구현**: `zod` 또는 커스텀 검증 로직
- **상태**: ❌ 미구현

```typescript
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  // 필수 환경 변수들...
});

const env = envSchema.parse(process.env);
```

## ⚠️ 에러 처리 (Error Handling) - 필수

### 1. 전역 에러 핸들러
- **목적**: 예상치 못한 에러 처리 및 일관된 에러 응답
- **필요성**: 서버 크래시 방지 및 사용자 친화적 에러 메시지
- **구현**: Express 에러 핸들러 미들웨어 추가
- **상태**: ❌ 미구현

```typescript
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal Server Error' 
      : err.message
  });
});
```

### 2. 404 핸들러
- **목적**: 존재하지 않는 라우트 처리
- **필요성**: 일관된 에러 응답 제공
- **구현**: 모든 라우트 이후에 404 핸들러 추가
- **상태**: ❌ 미구현

```typescript
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});
```

### 3. 비동기 에러 처리
- **목적**: 비동기 함수에서 발생하는 에러 처리
- **필요성**: Unhandled Promise Rejection 방지
- **구현**: `express-async-errors` 또는 try-catch 래퍼
- **상태**: ❌ 미구현

## 📝 로깅 (Logging) - 권장

### 1. 구조화된 로깅
- **목적**: 일관된 로그 형식 및 로그 레벨 관리
- **필요성**: 디버깅 및 모니터링 용이
- **구현**: `winston` 또는 `pino` 사용
- **상태**: ❌ 미구현

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});
```

### 2. HTTP 요청 로깅
- **목적**: 모든 HTTP 요청 기록
- **필요성**: 트래픽 분석 및 디버깅
- **구현**: `morgan` 미들웨어 사용
- **상태**: ❌ 미구현

```typescript
import morgan from 'morgan';
app.use(morgan('combined'));
```

### 3. 에러 로깅
- **목적**: 에러 발생 시 상세 정보 기록
- **필요성**: 문제 추적 및 해결
- **구현**: 에러 핸들러에서 로깅
- **상태**: ❌ 미구현

## ⚡ 성능 최적화 - 권장

### 1. Compression
- **목적**: 응답 데이터 압축으로 전송량 감소
- **필요성**: 네트워크 대역폭 절약 및 응답 속도 향상
- **구현**: `compression` 미들웨어 사용
- **상태**: ❌ 미구현

```typescript
import compression from 'compression';
app.use(compression());
```

### 2. 요청 타임아웃
- **목적**: 무한 대기 요청 방지
- **필요성**: 리소스 보호 및 서버 안정성
- **구현**: `express-timeout-handler` 또는 커스텀 미들웨어
- **상태**: ❌ 미구현

### 3. Graceful Shutdown
- **목적**: 서버 종료 시 진행 중인 요청 완료 후 종료
- **필요성**: 데이터 손실 방지
- **구현**: SIGTERM/SIGINT 시그널 처리
- **상태**: ❌ 미구현

```typescript
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});
```

## 📊 모니터링 및 헬스체크 - 권장

### 1. 상세 헬스체크
- **목적**: 서버 상태, DB 연결, 메모리 사용량 등 확인
- **필요성**: 모니터링 시스템과 연동
- **구현**: `/health` 엔드포인트 확장
- **상태**: ⚠️ 기본 구현만 있음

```typescript
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    // DB 연결 상태 등 추가
  };
  res.json(health);
});
```

### 2. 메트릭 수집
- **목적**: 성능 지표 수집 및 분석
- **필요성**: 성능 모니터링 및 최적화
- **구현**: Prometheus, DataDog 등 연동
- **상태**: ❌ 미구현

## 🧪 테스트 - 선택

### 1. 단위 테스트
- **목적**: 개별 함수/모듈 테스트
- **필요성**: 코드 품질 보장
- **구현**: Jest, Vitest 등 사용
- **상태**: ❌ 미구현

### 2. 통합 테스트
- **목적**: API 엔드포인트 전체 플로우 테스트
- **필요성**: 실제 사용 시나리오 검증
- **구현**: Supertest 사용
- **상태**: ❌ 미구현

## 🛠️ 코드 품질 - 선택

### 1. ESLint
- **목적**: 코드 스타일 및 잠재적 버그 검사
- **필요성**: 코드 일관성 유지
- **구현**: ESLint 설정 파일 추가
- **상태**: ❌ 미구현

### 2. Prettier
- **목적**: 코드 포맷팅 자동화
- **필요성**: 코드 가독성 향상
- **구현**: Prettier 설정 파일 추가
- **상태**: ❌ 미구현

## 📋 배포 전 최종 체크리스트

### 환경 설정
- [ ] `NODE_ENV=production` 설정
- [ ] 필수 환경 변수 모두 설정
- [ ] 민감한 정보는 환경 변수로 관리 (코드에 하드코딩 금지)

### 보안
- [ ] Helmet.js 설정 완료
- [ ] CORS 설정 완료
- [ ] Rate Limiting 설정 완료
- [ ] 입력 검증 로직 구현 완료
- [ ] HTTPS 사용 (Railway는 자동 제공)

### 에러 처리
- [ ] 전역 에러 핸들러 구현 완료
- [ ] 404 핸들러 구현 완료
- [ ] 비동기 에러 처리 구현 완료

### 로깅
- [ ] 구조화된 로깅 설정 완료
- [ ] HTTP 요청 로깅 설정 완료
- [ ] 에러 로깅 구현 완료

### 성능
- [ ] Compression 미들웨어 추가 완료
- [ ] 요청 타임아웃 설정 완료
- [ ] Graceful Shutdown 구현 완료

### 모니터링
- [ ] 헬스체크 엔드포인트 구현 완료
- [ ] 로그 모니터링 설정 완료

### 테스트
- [ ] 주요 기능 테스트 완료
- [ ] 프로덕션 환경에서 테스트 완료

## 🚀 구현 우선순위

### Phase 1: 필수 보안 (즉시 구현)
1. Helmet.js
2. CORS 설정
3. Rate Limiting
4. 전역 에러 핸들러
5. 404 핸들러

### Phase 2: 안정성 향상 (1주일 내)
1. 환경 변수 검증
2. 구조화된 로깅
3. HTTP 요청 로깅
4. Graceful Shutdown

### Phase 3: 성능 최적화 (2주일 내)
1. Compression
2. 요청 타임아웃
3. 상세 헬스체크

### Phase 4: 모니터링 및 테스트 (선택)
1. 메트릭 수집
2. 단위/통합 테스트
3. ESLint/Prettier 설정

## 📚 참고 자료

- [Express 보안 모범 사례](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js 프로덕션 모범 사례](https://github.com/goldbergyoni/nodebestpractices)
- [Railway 배포 가이드](https://docs.railway.app/)

---

**마지막 업데이트**: 2024년
**다음 리뷰 예정일**: 프로덕션 배포 전

