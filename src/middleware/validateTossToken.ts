import { Request, Response, NextFunction } from "express";
import { getUserInfo } from "../services/toss/toss-api.service";
import { AppError } from "./errorHandler";

/**
 * 토스 AccessToken을 검증하고 사용자 정보를 요청 객체에 추가하는 미들웨어
 * 
 * - Authorization 헤더에서 토큰 추출
 * - 토스 API로 사용자 정보 조회 (토큰 검증)
 * - req.tossUserInfo에 암호화된 사용자 정보 저장
 */
export const validateTossToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(
        401,
        "Authorization header가 없거나 형식이 올바르지 않습니다."
      );
    }

    const accessToken = authHeader.substring(7);

    // 토스 API로 사용자 정보 조회 (토큰 검증)
    // 반환값: 암호화된 사용자 정보 (userKey, scope, agreedTerms, 암호화된 개인정보 필드)
    const userInfo = await getUserInfo(accessToken);

    if (!userInfo) {
      throw new AppError(401, "유효하지 않은 토큰입니다.");
    }

    // 요청 객체에 토스 사용자 정보 추가 (암호화된 상태)
    (req as Request & { tossUserInfo: typeof userInfo }).tossUserInfo =
      userInfo;

    next();
  } catch (error) {
    next(error);
  }
};

