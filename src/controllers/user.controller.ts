import { Request, Response, NextFunction } from "express";
import { deleteUser, upsertUser } from "../services/user.service";
import { sendSuccess } from "../utils/apiResponse";
import { AppError } from "../middleware/errorHandler";
import { decryptUserInfo } from "../services/toss/decryption.service";

/**
 * 현재 로그인한 사용자 정보 조회
 * GET /api/users/me
 * - validateTossToken 미들웨어가 이미 토스 정보를 가져옴
 * - 토스 정보를 복호화하여 DB에 저장/업데이트
 * - DB의 사용자 정보 반환
 */
export const getCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tossUserInfo = (
      req as Request & {
        tossUserInfo: {
          userKey: number;
          scope: string;
          agreedTerms?: string[];
          name?: string | null;
          phone?: string | null;
          birthday?: string | null;
          ci?: string | null;
          gender?: string | null;
          nationality?: string | null;
          email?: string | null;
        };
      }
    ).tossUserInfo;

    if (!tossUserInfo) {
      throw new AppError(401, "인증되지 않은 사용자입니다.");
    }

    const authProvider = "TOSS";
    const externalUserId = String(tossUserInfo.userKey);

    // 토스 정보 복호화
    const decryptedInfo = decryptUserInfo({
      name: tossUserInfo.name,
      phone: tossUserInfo.phone,
      birthday: tossUserInfo.birthday,
      ci: tossUserInfo.ci,
      gender: tossUserInfo.gender,
      nationality: tossUserInfo.nationality,
      email: tossUserInfo.email,
    });

    // DB에 저장/업데이트 (없으면 생성, 있으면 업데이트)
    const user = await upsertUser({
      authProvider,
      externalUserId,
      name: decryptedInfo.name || null,
      phone: decryptedInfo.phone || null,
      birthday: decryptedInfo.birthday || null,
      ci: decryptedInfo.ci || null,
      gender: (decryptedInfo.gender as "MALE" | "FEMALE" | null) || null,
      nationality:
        (decryptedInfo.nationality as "LOCAL" | "FOREIGNER" | null) || null,
      email: decryptedInfo.email || null,
      agreedTerms: tossUserInfo.agreedTerms || [],
    });

    sendSuccess(res, {
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 사용자 정보 업데이트 (토스 사용자 정보로 동기화)
 * POST /api/users/me
 * - validateTossToken 미들웨어가 이미 토스 정보를 가져옴
 * - 토스 정보를 복호화하여 DB에 업데이트
 */
export const updateCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tossUserInfo = (
      req as Request & {
        tossUserInfo: {
          userKey: number;
          agreedTerms?: string[];
          name?: string | null;
          phone?: string | null;
          birthday?: string | null;
          ci?: string | null;
          gender?: string | null;
          nationality?: string | null;
          email?: string | null;
        };
      }
    ).tossUserInfo;

    if (!tossUserInfo) {
      throw new AppError(401, "인증되지 않은 사용자입니다.");
    }

    const authProvider = "TOSS";
    const externalUserId = String(tossUserInfo.userKey);

    // 토스 정보 복호화
    const decryptedInfo = decryptUserInfo({
      name: tossUserInfo.name,
      phone: tossUserInfo.phone,
      birthday: tossUserInfo.birthday,
      ci: tossUserInfo.ci,
      gender: tossUserInfo.gender,
      nationality: tossUserInfo.nationality,
      email: tossUserInfo.email,
    });

    // Supabase에 업데이트
    const user = await upsertUser({
      authProvider,
      externalUserId,
      name: decryptedInfo.name || null,
      phone: decryptedInfo.phone || null,
      birthday: decryptedInfo.birthday || null,
      ci: decryptedInfo.ci || null,
      gender: (decryptedInfo.gender as "MALE" | "FEMALE" | null) || null,
      nationality:
        (decryptedInfo.nationality as "LOCAL" | "FOREIGNER" | null) || null,
      email: decryptedInfo.email || null,
      agreedTerms: tossUserInfo.agreedTerms || [],
    });

    sendSuccess(res, {
      data: user,
      message: "사용자 정보가 업데이트되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 사용자 탈퇴 (Soft Delete)
 * DELETE /api/users/me
 */
export const deleteCurrentUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tossUserInfo = (
      req as Request & { tossUserInfo: { userKey: number } }
    ).tossUserInfo;

    if (!tossUserInfo) {
      throw new AppError(401, "인증되지 않은 사용자입니다.");
    }

    const authProvider = "TOSS";
    const externalUserId = String(tossUserInfo.userKey);

    await deleteUser(authProvider, externalUserId);

    sendSuccess(res, {
      data: { message: "탈퇴가 완료되었습니다." },
      message: "탈퇴가 완료되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};
