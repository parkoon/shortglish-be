import { Request, Response, NextFunction } from "express";
import {
  generateToken,
  refreshToken,
  removeByAccessToken,
  removeByUserKey,
} from "../../services/toss/toss-api.service";
import {
  GenerateTokenRequest,
  RefreshTokenRequest,
  RemoveByUserKeyRequest,
} from "../../utils/types/toss.types";
import { AppError } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/apiResponse";

/**
 * AccessToken 발급
 * POST /api/toss/auth/generate-token
 */
export const generateTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { authorizationCode, referrer } = req.body;

    if (!authorizationCode || !referrer) {
      throw new AppError(400, "authorizationCode와 referrer는 필수입니다.");
    }

    const request: GenerateTokenRequest = {
      authorizationCode,
      referrer,
    };

    const result = await generateToken(request);

    sendSuccess(res, {
      data: result,
      message: "토큰이 성공적으로 발급되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * AccessToken 재발급
 * POST /api/toss/auth/refresh-token
 */
export const refreshTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { refreshToken: refreshTokenValue } = req.body;

    if (!refreshTokenValue) {
      throw new AppError(400, "refreshToken은 필수입니다.");
    }

    const request: RefreshTokenRequest = {
      refreshToken: refreshTokenValue,
    };

    const result = await refreshToken(request);

    sendSuccess(res, {
      data: result,
      message: "토큰이 성공적으로 재발급되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * AccessToken으로 로그인 연결 끊기
 * POST /api/toss/auth/remove-by-access-token
 */
export const removeByAccessTokenHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authorization 헤더가 필요합니다.");
    }

    const accessToken = authHeader.substring(7);
    await removeByAccessToken(accessToken);

    sendSuccess(res, {
      data: null,
      message: "로그인 연결이 해제되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * userKey로 로그인 연결 끊기
 * POST /api/toss/auth/remove-by-user-key
 */
export const removeByUserKeyHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userKey } = req.body;
    const authHeader = req.headers.authorization;

    if (!userKey) {
      throw new AppError(400, "userKey는 필수입니다.");
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Authorization 헤더가 필요합니다.");
    }

    const accessToken = authHeader.substring(7);
    const request: RemoveByUserKeyRequest = {
      userKey: Number(userKey),
    };

    const result = await removeByUserKey(request, accessToken);

    sendSuccess(res, {
      data: result || { userKey },
      message: "로그인 연결이 해제되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 콜백 처리 (토스에서 호출)
 * POST /api/toss/auth/callback
 */
export const callbackHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { userKey: userKeyBody, referrer: referrerBody } = req.body;

    if (!userKeyBody || !referrerBody) {
      throw new AppError(400, "userKey와 referrer는 필수입니다.");
    }

    const userKey = Number(userKeyBody);
    const referrer = String(referrerBody);

    // 여기서 사용자 연결 해제 처리 로직 구현
    // 예: 데이터베이스에서 사용자 정보 삭제, 세션 무효화 등
    console.log(`[TOSS Callback] userKey: ${userKey}, referrer: ${referrer}`);

    // TODO: 실제 비즈니스 로직 구현
    // 예: await userService.removeUserConnection(userKey, referrer);

    sendSuccess(res, {
      data: { userKey, referrer },
      message: "콜백이 성공적으로 처리되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};
