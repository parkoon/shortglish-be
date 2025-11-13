import { Express } from "express";
import morgan from "morgan";
import { config } from "../config/env";

/**
 * 로깅 미들웨어 설정
 * HTTP 요청을 로깅합니다.
 */
export function setupLoggingMiddleware(app: Express): void {
  // 개발 환경: 상세한 로그 (컬러 출력)
  // 프로덕션 환경: 간결한 로그 (JSON 형식)
  if (config.nodeEnv === "development") {
    app.use(morgan("dev"));
  } else {
    app.use(
      morgan("combined", {
        skip: (req, res) => {
          // 헬스체크는 로그에서 제외 (너무 많은 로그 방지)
          return req.path === "/health";
        },
      })
    );
  }
}

