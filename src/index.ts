import express, { Request, Response } from "express";
import { config } from "./config/env";
import { setupSecurityMiddleware } from "./middleware/security";
import { setupLoggingMiddleware } from "./middleware/logging";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

// Express 앱 생성
const app = express();

// 보안 미들웨어 (가장 먼저 적용)
setupSecurityMiddleware(app);

// 로깅 미들웨어
setupLoggingMiddleware(app);

// Body 파싱 미들웨어
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { sendSuccess } from "./utils/apiResponse";

// 기본 라우트
app.get("/", (req: Request, res: Response) => {
  sendSuccess(res, {
    data: {
      message: "Shortglish Backend API",
      status: "running",
      environment: config.nodeEnv,
    },
  });
});

// Health check 엔드포인트 (Railway 모니터링용)
app.get("/health", (req: Request, res: Response) => {
  sendSuccess(res, {
    data: {
      status: "healthy",
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    },
  });
});

// Swagger API 문서
const swaggerDocument = swaggerSpec;
app.use(
  "/api/docs",
  ...(swaggerUi.serve as any),
  swaggerUi.setup(swaggerDocument, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "Shortglish API Documentation",
  }) as any
);

// 토스 로그인 라우트
import tossAuthRoutes from "./routes/toss/auth.routes";
import tossUserRoutes from "./routes/toss/user.routes";
import tossPushRoutes from "./routes/toss/push.routes";

app.use("/api/toss/auth", tossAuthRoutes);
app.use("/api/toss/user", tossUserRoutes);
app.use("/api/toss/push", tossPushRoutes);

// 사용자 관리 라우트
import userRoutes from "./routes/user.routes";

app.use("/api/users", userRoutes);

// 404 핸들러 (모든 라우트 이후)
app.use(notFoundHandler);

// 전역 에러 핸들러 (가장 마지막)
app.use(errorHandler);

// 서버 시작
const server = app.listen(config.port, () => {
  console.log(`🚀 Server is running on port ${config.port}`);
  console.log(`📍 Environment: ${config.nodeEnv}`);
  console.log(`🔒 Security: Helmet, CORS, Rate Limiting enabled`);

  // ALLOWED_ORIGINS 출력
  if (config.allowedOrigins.length > 0) {
    console.log(`🌐 Allowed Origins: ${config.allowedOrigins.join(", ")}`);
  } else {
    console.log(
      `🌐 Allowed Origins: ${
        config.nodeEnv === "production"
          ? "None (CORS disabled - production requires explicit origins)"
          : "All origins (development mode)"
      }`
    );
  }
});

// Graceful Shutdown 처리
const gracefulShutdown = (signal: string) => {
  console.log(`\n${signal} signal received: closing HTTP server`);

  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });

  // 강제 종료 타임아웃 (10초)
  setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// 시그널 핸들러 등록
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// 처리되지 않은 Promise Rejection 처리
process.on(
  "unhandledRejection",
  (reason: unknown, promise: Promise<unknown>) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("unhandledRejection");
  }
);

// 처리되지 않은 Exception 처리
process.on("uncaughtException", (error: Error) => {
  console.error("Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});
