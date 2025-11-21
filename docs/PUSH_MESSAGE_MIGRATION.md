# 푸시 메시지 API 마이그레이션 가이드

## 개요

푸시 메시지 발송 API가 단일 사용자 전송에서 배치 전송으로 변경되었습니다. 이제 여러 사용자에게 한 번의 API 호출로 메시지를 발송할 수 있습니다.

## 주요 변경사항

### 변경 전 (v1.0)

- **요청**: `userKey` (단일 숫자)
- **응답**: 단일 사용자에 대한 발송 결과
- **제한**: 한 번에 한 명에게만 전송 가능

### 변경 후 (v2.0)

- **요청**: `userKeys` (배열)
- **응답**: 각 사용자별 발송 결과 배열 + 통계
- **장점**: 한 번의 호출로 여러 사용자에게 전송 가능

## API 엔드포인트

**엔드포인트**: `POST /api/toss/push/send-message`

## 요청 형식 변경

### 변경 전

```typescript
// ❌ 더 이상 지원하지 않음
const response = await fetch('/api/toss/push/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userKey: 518165018, // 단일 숫자
    templateSetCode: 'shortglish-push-test',
    context: {
      storeName: '토스증권',
      date: '2025-01-20 15:30',
    },
  }),
});
```

### 변경 후

```typescript
// ✅ 새로운 형식
const response = await fetch('/api/toss/push/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userKeys: [518165018], // 배열로 변경 (단일 사용자도 배열)
    templateSetCode: 'shortglish-push-test',
    context: {
      storeName: '토스증권',
      date: '2025-01-20 15:30',
    },
  }),
});
```

## 응답 형식 변경

### 변경 전

```typescript
// ❌ 이전 응답 형식
{
  success: true,
  data: {
    msgCount: 1,
    sentPushCount: 1,
    sentInboxCount: 0,
    // ... 기타 필드
  },
  message: "푸시 메시지가 발송되었습니다."
}
```

### 변경 후

```typescript
// ✅ 새로운 응답 형식
{
  success: true,
  data: {
    results: [
      {
        userKey: 518165018,
        success: true,
        result: {
          msgCount: 1,
          sentPushCount: 1,
          sentInboxCount: 0,
          // ... 기타 필드
        }
      },
      {
        userKey: 518165019,
        success: false,
        error: {
          message: "푸시 메시지 발송 중 오류가 발생했습니다.",
          code: "500"
        }
      }
    ],
    summary: {
      total: 2,
      success: 1,
      failed: 1
    }
  },
  message: "푸시 메시지 발송 완료: 1개 성공, 1개 실패"
}
```

## 마이그레이션 예시

### React + TypeScript 예시

#### 변경 전 코드

```typescript
interface SendPushRequest {
  userKey: number;
  templateSetCode: string;
  context: Record<string, unknown>;
}

interface SendPushResponse {
  success: boolean;
  data: {
    msgCount: number;
    sentPushCount: number;
    // ... 기타 필드
  };
  message: string;
}

const sendPushMessage = async (userKey: number) => {
  const request: SendPushRequest = {
    userKey,
    templateSetCode: 'shortglish-push-test',
    context: {
      storeName: '토스증권',
      date: '2025-01-20 15:30',
    },
  };

  const response = await fetch('/api/toss/push/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const result: SendPushResponse = await response.json();
  return result;
};

// 사용 예시
await sendPushMessage(518165018);
```

#### 변경 후 코드

```typescript
interface SendPushRequest {
  userKeys: number[]; // 배열로 변경
  templateSetCode: string;
  context: Record<string, unknown>;
}

interface BatchSendResult {
  userKey: number;
  success: boolean;
  result?: {
    msgCount: number;
    sentPushCount: number;
    // ... 기타 필드
  };
  error?: {
    message: string;
    code?: string;
  };
}

interface SendPushResponse {
  success: boolean;
  data: {
    results: BatchSendResult[];
    summary: {
      total: number;
      success: number;
      failed: number;
    };
  };
  message: string;
}

const sendPushMessage = async (userKeys: number[]) => {
  const request: SendPushRequest = {
    userKeys, // 배열로 전달
    templateSetCode: 'shortglish-push-test',
    context: {
      storeName: '토스증권',
      date: '2025-01-20 15:30',
    },
  };

  const response = await fetch('/api/toss/push/send-message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const result: SendPushResponse = await response.json();
  return result;
};

// 단일 사용자 전송 (배열에 하나만 넣기)
await sendPushMessage([518165018]);

// 여러 사용자 전송
await sendPushMessage([518165018, 518165019, 518165020]);
```

### 배치 전송 활용 예시

```typescript
// 여러 사용자에게 동시에 전송
const userKeys = [518165018, 518165019, 518165020, 518165021];
const result = await sendPushMessage(userKeys);

// 결과 처리
result.data.results.forEach((item) => {
  if (item.success) {
    console.log(`✅ User ${item.userKey}: 전송 성공`);
    console.log(`   Push Count: ${item.result?.sentPushCount}`);
  } else {
    console.error(`❌ User ${item.userKey}: 전송 실패`);
    console.error(`   Error: ${item.error?.message}`);
  }
});

// 통계 확인
console.log(`전체: ${result.data.summary.total}명`);
console.log(`성공: ${result.data.summary.success}명`);
console.log(`실패: ${result.data.summary.failed}명`);
```

## 주요 변경 포인트 체크리스트

- [ ] `userKey` → `userKeys` (배열)로 변경
- [ ] 단일 사용자 전송 시에도 배열로 전달: `[userKey]`
- [ ] 응답 형식 변경: `data.results` 배열과 `data.summary` 확인
- [ ] 에러 처리: 각 사용자별 성공/실패 확인 로직 추가
- [ ] 타입 정의 업데이트: `SendPushRequest`, `SendPushResponse` 인터페이스 수정

## 주의사항

1. **배열 필수**: 단일 사용자에게 전송하더라도 반드시 배열로 전달해야 합니다.
   ```typescript
   // ✅ 올바른 방법
   userKeys: [518165018]
   
   // ❌ 잘못된 방법
   userKey: 518165018
   ```

2. **부분 실패 처리**: 일부 사용자에게 실패해도 성공한 사용자는 결과에 포함됩니다. 각 `result`의 `success` 필드를 확인하여 처리하세요.

3. **배치 크기**: 서버에서 한 번에 10개씩 병렬 처리하므로, 대량 전송 시에도 안정적으로 동작합니다.

4. **에러 핸들링**: 네트워크 오류나 서버 오류는 기존과 동일하게 처리하되, 각 사용자별 결과도 확인해야 합니다.

## 예상 마이그레이션 시간

- **소규모 프로젝트**: 30분 ~ 1시간
- **중규모 프로젝트**: 1 ~ 2시간
- **대규모 프로젝트**: 2 ~ 4시간

## 문의

마이그레이션 중 문제가 발생하면 개발팀에 문의해주세요.

