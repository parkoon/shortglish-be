import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

/**
 * 커스텀 에러 클래스
 * HTTP 상태 코드와 메시지를 포함합니다.
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public isOperational = true
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 핸들러
 * 존재하지 않는 라우트에 대한 요청 처리
 * 모든 라우트 정의 이후에 위치해야 합니다.
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  res.status(404).json({
    error: "Not Found",
    message: `Cannot ${req.method} ${req.path}`,
    path: req.path,
  });
}

/**
 * 전역 에러 핸들러
 * 모든 에러를 일관된 형식으로 처리합니다.
 * 프로덕션 환경에서는 상세한 에러 정보를 숨깁니다.
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // AppError 인스턴스인 경우
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      ...(config.nodeEnv === "development" && {
        stack: err.stack,
        path: req.path,
      }),
    });
    return;
  }

  // 예상치 못한 에러인 경우
  console.error("Unexpected error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error:
      config.nodeEnv === "production"
        ? "Internal Server Error"
        : err.message,
    ...(config.nodeEnv === "development" && {
      stack: err.stack,
      path: req.path,
    }),
  });
}

