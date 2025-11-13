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

## API 엔드포인트

- `GET /`: 기본 정보
- `GET /health`: 헬스 체크
