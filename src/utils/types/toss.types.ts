/**
 * 토스 로그인 관련 타입 정의
 */

// AccessToken 발급 요청
export type GenerateTokenRequest = {
  authorizationCode: string;
  referrer: string;
};

// AccessToken 발급 응답
export type GenerateTokenResponse = {
  resultType: "SUCCESS" | "FAIL";
  success?: {
    tokenType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
  };
  error?: {
    error: string;
    errorCode?: string;
    reason?: string;
  };
};

// RefreshToken 요청
export type RefreshTokenRequest = {
  refreshToken: string;
};

// RefreshToken 응답
export type RefreshTokenResponse = {
  resultType: "SUCCESS" | "FAIL";
  success?: {
    tokenType: string;
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    scope: string;
  };
  error?: {
    errorCode: string;
    reason: string;
  };
};

// 사용자 정보 응답
export type UserInfoResponse = {
  resultType: "SUCCESS" | "FAIL";
  success?: {
    userKey: number;
    scope: string;
    agreedTerms: string[];
    name?: string; // 암호화됨
    phone?: string; // 암호화됨
    birthday?: string; // 암호화됨 (yyyyMMdd)
    ci?: string; // 암호화됨
    di: string | null;
    gender?: string; // 암호화됨 (MALE/FEMALE)
    nationality?: string; // 암호화됨 (LOCAL/FOREIGNER)
    email?: string | null; // 암호화됨
  };
  error?: {
    error?: string;
    errorCode?: string;
    reason?: string;
  };
};

// 복호화된 사용자 정보
export type DecryptedUserInfo = {
  name?: string;
  phone?: string;
  birthday?: string;
  ci?: string;
  gender?: string;
  nationality?: string;
  email?: string | null;
};

// 로그인 끊기 요청 (userKey)
export type RemoveByUserKeyRequest = {
  userKey: number;
};

// 로그인 끊기 응답
export type RemoveTokenResponse = {
  resultType: "SUCCESS" | "FAIL";
  success?: {
    userKey?: number;
  };
  error?: {
    errorCode?: string;
    reason?: string;
  };
};

// 콜백 요청 (GET)
export type CallbackQueryParams = {
  userKey: string;
  referrer: string;
};

// 콜백 요청 (POST)
export type CallbackRequestBody = {
  userKey: number;
  referrer: string;
};

// Referrer 타입
export type ReferrerType =
  | "UNLINK"
  | "WITHDRAWAL_TERMS"
  | "WITHDRAWAL_TOSS"
  | "DEFAULT"
  | "sandbox";

// 푸시 메시지 관련 타입
export type SendMessageRequest = {
  userKey: number;
  templateSetCode: string;
  context: Record<string, unknown>;
};

export type MessageContent = {
  contentId: string;
  reachFailReason?: string;
};

export type MessageDetail = {
  sentPush?: MessageContent[];
  sentInbox?: MessageContent[];
  sentSms?: MessageContent[];
  sentAlimtalk?: MessageContent[];
  sentFriendtalk?: MessageContent[];
};

export type MessageFail = {
  sentPush?: MessageContent[];
  sentInbox?: MessageContent[];
  sentSms?: MessageContent[];
  sentAlimtalk?: MessageContent[];
  sentFriendtalk?: MessageContent[];
};

export type MessageResult = {
  msgCount: number;
  sentPushCount: number;
  sentInboxCount: number;
  sentSmsCount: number;
  sentAlimtalkCount: number;
  sentFriendtalkCount: number;
  detail?: MessageDetail;
  fail?: MessageFail;
};

export type SendMessageResponse = {
  resultType:
    | "SUCCESS"
    | "HTTP_TIMEOUT"
    | "NETWORK_ERROR"
    | "EXECUTION_FAIL"
    | "INTERRUPTED"
    | "INTERNAL_ERROR"
    | "FAIL";
  success?: MessageResult;
  error?: {
    errorType?: number;
    errorCode?: string;
    reason?: string;
    data?: Record<string, unknown>;
    title?: string;
  };
};
