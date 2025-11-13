import { Router } from "express";
import {
  getUserInfoHandler,
  getDecryptedUserInfoHandler,
  decryptUserInfoHandler,
} from "../../controllers/toss/user.controller";

const router = Router();

/**
 * 사용자 정보 조회 (암호화된 상태)
 * GET /api/toss/user/me
 * Authorization: Bearer {accessToken}
 */
router.get("/me", getUserInfoHandler);

/**
 * 사용자 정보 조회 및 복호화 (통합)
 * GET /api/toss/user/me/decrypted
 * Authorization: Bearer {accessToken}
 */
router.get("/me/decrypted", getDecryptedUserInfoHandler);

/**
 * 사용자 정보 복호화
 * POST /api/toss/user/decrypt
 * 요청 body에 암호화된 필드들을 포함
 */
router.post("/decrypt", decryptUserInfoHandler);

export default router;
