import { Request, Response, NextFunction } from "express";
import { getUserInfo } from "../../services/toss/toss-api.service";
import { decryptUserInfo } from "../../services/toss/decryption.service";
import { AppError } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/apiResponse";

/**
 * Authorization 헤더에서 AccessToken 추출
 */
const extractAccessToken = (authHeader: string | undefined): string => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Authorization 헤더가 필요합니다.");
  }
  return authHeader.substring(7);
};

/**
 * 사용자 정보 조회
 * GET /api/toss/user/me
 */
export const getUserInfoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = extractAccessToken(req.headers.authorization);
    const userInfo = await getUserInfo(accessToken);

    sendSuccess(res, {
      data: userInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 사용자 정보 복호화
 * POST /api/toss/user/decrypt
 * 요청 body에 암호화된 사용자 정보 필드들을 포함
 */
export const decryptUserInfoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      phone,
      birthday,
      ci,
      gender,
      nationality,
      email,
      decryptionKey, // 선택: 요청 시 다른 키 사용 가능
      aad, // 선택: 요청 시 다른 AAD 사용 가능
    } = req.body;

    // 최소 하나의 필드는 있어야 함
    if (
      !name &&
      !phone &&
      !birthday &&
      !ci &&
      !gender &&
      !nationality &&
      !email
    ) {
      throw new AppError(400, "복호화할 필드가 하나 이상 필요합니다.");
    }

    const encryptedUserInfo = {
      name,
      phone,
      birthday,
      ci,
      gender,
      nationality,
      email,
    };

    const decryptedInfo = decryptUserInfo(
      encryptedUserInfo,
      decryptionKey,
      aad
    );

    sendSuccess(res, {
      data: decryptedInfo,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 사용자 정보 조회 및 복호화 (통합)
 * GET /api/toss/user/me/decrypted
 * AccessToken으로 사용자 정보를 조회하고 자동으로 복호화합니다.
 */
export const getDecryptedUserInfoHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const accessToken = extractAccessToken(req.headers.authorization);
    const userInfo = await getUserInfo(accessToken);

    if (!userInfo) {
      throw new AppError(500, "사용자 정보를 가져올 수 없습니다.");
    }

    // 복호화
    const decryptedInfo = decryptUserInfo({
      name: userInfo.name,
      phone: userInfo.phone,
      birthday: userInfo.birthday,
      ci: userInfo.ci,
      gender: userInfo.gender,
      nationality: userInfo.nationality,
      email: userInfo.email,
    });

    sendSuccess(res, {
      data: {
        userKey: userInfo.userKey,
        scope: userInfo.scope,
        agreedTerms: userInfo.agreedTerms,
        ...decryptedInfo,
      },
    });
  } catch (error) {
    next(error);
  }
};
