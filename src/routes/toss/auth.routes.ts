import { Router } from "express";
import {
  generateTokenHandler,
  refreshTokenHandler,
  removeByAccessTokenHandler,
  removeByUserKeyHandler,
  callbackHandler,
} from "../../controllers/toss/auth.controller";
import { config } from "../../config/env";
import { createBasicAuthMiddleware } from "../../middleware/basicAuth";

const router = Router();

/**
 * Basic Auth 미들웨어 (콜백 엔드포인트용)
 * 환경 변수에 설정된 경우에만 적용
 */
const callbackAuthMiddleware = (() => {
  const username = config.toss.callback.basicAuthUsername;
  const password = config.toss.callback.basicAuthPassword;

  if (!username || !password) {
    // Basic Auth가 설정되지 않은 경우 빈 미들웨어 (통과)
    return (req: any, res: any, next: any) => next();
  }

  return createBasicAuthMiddleware(username, password);
})();

/**
 * AccessToken 발급
 * POST /api/toss/auth/generate-token
 */
router.post("/generate-token", generateTokenHandler);

/**
 * AccessToken 재발급
 * POST /api/toss/auth/refresh-token
 */
router.post("/refresh-token", refreshTokenHandler);

/**
 * AccessToken으로 로그인 연결 끊기
 * POST /api/toss/auth/remove-by-access-token
 */
router.post("/remove-by-access-token", removeByAccessTokenHandler);

/**
 * userKey로 로그인 연결 끊기
 * POST /api/toss/auth/remove-by-user-key
 */
router.post("/remove-by-user-key", removeByUserKeyHandler);

/**
 * 콜백 엔드포인트 (토스에서 호출)
 * GET /api/toss/auth/callback
 * POST /api/toss/auth/callback
 * Basic Auth 검증 (설정된 경우)
 */
router.get("/callback", callbackAuthMiddleware, callbackHandler);
router.post("/callback", callbackAuthMiddleware, callbackHandler);

export default router;
