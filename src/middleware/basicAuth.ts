import { Request, Response, NextFunction } from "express";
import { AppError } from "./errorHandler";

/**
 * Basic Auth 미들웨어
 * Authorization 헤더에서 username:password를 추출하여 검증
 */
export const createBasicAuthMiddleware = (
  username: string,
  password: string
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');
      throw new AppError(401, "Basic Authentication이 필요합니다.");
    }

    // "Basic " 제거 후 Base64 디코딩
    const base64Credentials = authHeader.substring(6);
    const credentials = Buffer.from(base64Credentials, "base64").toString(
      "utf-8"
    );
    const [providedUsername, providedPassword] = credentials.split(":");

    // 인증 정보 검증
    if (providedUsername !== username || providedPassword !== password) {
      res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');
      throw new AppError(401, "인증 정보가 올바르지 않습니다.");
    }

    next();
  };
};
