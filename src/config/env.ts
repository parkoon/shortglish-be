import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

/**
 * 환경 변수 스키마 정의
 * 필수 환경 변수는 여기에 정의하고, 없으면 앱 시작 시 에러 발생
 */
const envSchema = z.object({
  // 서버 설정
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4000"),

  // CORS 설정 (쉼표로 구분된 도메인 목록)
  ALLOWED_ORIGINS: z.string().optional(),

  // Rate Limiting 설정 (선택사항)
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),

  // 토스 로그인 설정
  TOSS_API_BASE_URL: z.string().default("https://apps-in-toss-api.toss.im"),
  TOSS_DECRYPTION_KEY: z.string().optional(), // Base64 인코딩된 복호화 키
  TOSS_AAD: z.string().default("TOSS"), // Additional Authenticated Data
  TOSS_CALLBACK_BASIC_AUTH_USERNAME: z.string().optional(),
  TOSS_CALLBACK_BASIC_AUTH_PASSWORD: z.string().optional(),
  // mTLS 인증서 설정
  TOSS_MTLS_CERT_PATH: z.string().optional(), // 인증서 파일 경로
  TOSS_MTLS_KEY_PATH: z.string().optional(), // 키 파일 경로
  TOSS_MTLS_CERT_BASE64: z.string().optional(), // Base64 인코딩된 인증서 (Railway용)
  TOSS_MTLS_KEY_BASE64: z.string().optional(), // Base64 인코딩된 키 (Railway용)
  // Supabase 설정
  SUPABASE_URL: z.string().optional(), // Supabase 프로젝트 URL
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), // Supabase Service Role Key
});

/**
 * 환경 변수 검증 및 파싱
 * 앱 시작 시 필수 환경 변수가 없으면 에러 발생
 */
export const env = envSchema.parse(process.env);

/**
 * 타입 안전한 환경 변수 접근을 위한 헬퍼
 */
export const config = {
  nodeEnv: env.NODE_ENV,
  port: parseInt(env.PORT, 10),
  allowedOrigins: env.ALLOWED_ORIGINS?.split(",").filter(Boolean) || [],
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS
      ? parseInt(env.RATE_LIMIT_WINDOW_MS, 10)
      : 15 * 60 * 1000, // 기본 15분
    max: env.RATE_LIMIT_MAX ? parseInt(env.RATE_LIMIT_MAX, 10) : 100, // 기본 100회
  },
  toss: {
    apiBaseUrl: env.TOSS_API_BASE_URL,
    decryptionKey: env.TOSS_DECRYPTION_KEY,
    aad: env.TOSS_AAD,
    callback: {
      basicAuthUsername: env.TOSS_CALLBACK_BASIC_AUTH_USERNAME,
      basicAuthPassword: env.TOSS_CALLBACK_BASIC_AUTH_PASSWORD,
    },
    mtls: {
      certPath: env.TOSS_MTLS_CERT_PATH || "certs/client-cert.pem",
      keyPath: env.TOSS_MTLS_KEY_PATH || "certs/client-key.pem",
      certBase64: env.TOSS_MTLS_CERT_BASE64,
      keyBase64: env.TOSS_MTLS_KEY_BASE64,
    },
  },
  supabase: {
    url: env.SUPABASE_URL || "",
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
  },
} as const;

