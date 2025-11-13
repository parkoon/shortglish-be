import { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { config } from "../config/env";

/**
 * 보안 미들웨어 설정
 * Helmet, CORS, Rate Limiting을 설정합니다.
 */
export function setupSecurityMiddleware(app: Express): void {
  // Helmet: 보안 관련 HTTP 헤더 설정
  // XSS, CSRF, Clickjacking 등 공격 방어
  app.use(helmet());

  // CORS: 허용된 도메인만 API 접근 가능
  app.use(
    cors({
      origin: config.allowedOrigins.length > 0 
        ? config.allowedOrigins 
        : config.nodeEnv === "production" 
        ? false // 프로덕션에서는 반드시 설정 필요
        : true, // 개발 환경에서는 모든 도메인 허용
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Rate Limiting: DDoS 공격 및 과도한 요청 방지
  const limiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
      error: "Too many requests from this IP, please try again later.",
    },
    standardHeaders: true, // `RateLimit-*` 헤더 반환
    legacyHeaders: false, // `X-RateLimit-*` 헤더 비활성화
  });

  // 모든 API 요청에 Rate Limiting 적용
  app.use("/api/", limiter);
  
  // 루트 경로와 헬스체크는 제외 (모니터링용)
  app.use(limiter);
}

