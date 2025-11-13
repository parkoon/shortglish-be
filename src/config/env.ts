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
  PORT: z.string().default("3000"),

  // CORS 설정 (쉼표로 구분된 도메인 목록)
  ALLOWED_ORIGINS: z.string().optional(),

  // Rate Limiting 설정 (선택사항)
  RATE_LIMIT_WINDOW_MS: z.string().optional(),
  RATE_LIMIT_MAX: z.string().optional(),
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
} as const;

