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
 * @swagger
 * /api/toss/auth/generate-token:
 *   post:
 *     summary: AccessToken 발급
 *     description: 토스 SDK의 appLogin()으로 받은 인가 코드로 AccessToken과 RefreshToken을 발급받습니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - authorizationCode
 *               - referrer
 *             properties:
 *               authorizationCode:
 *                 type: string
 *                 description: 토스 SDK에서 받은 인가 코드
 *                 example: "abc123..."
 *               referrer:
 *                 type: string
 *                 description: "DEFAULT" 또는 "sandbox"
 *                 enum: [DEFAULT, sandbox]
 *                 example: "DEFAULT"
 *     responses:
 *       200:
 *         description: 토큰 발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         tokenType:
 *                           type: string
 *                           example: "Bearer"
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: number
 *                           example: 3600
 *                         scope:
 *                           type: string
 *       400:
 *         description: 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post("/generate-token", generateTokenHandler);

/**
 * @swagger
 * /api/toss/auth/refresh-token:
 *   post:
 *     summary: AccessToken 재발급
 *     description: RefreshToken으로 새로운 AccessToken을 발급받습니다. AccessToken이 만료되었을 때 사용합니다.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: 저장해둔 RefreshToken
 *     responses:
 *       200:
 *         description: 토큰 재발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         tokenType:
 *                           type: string
 *                         accessToken:
 *                           type: string
 *                         refreshToken:
 *                           type: string
 *                         expiresIn:
 *                           type: number
 *                         scope:
 *                           type: string
 *       401:
 *         description: RefreshToken이 유효하지 않음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 서버 오류
 */
router.post("/refresh-token", refreshTokenHandler);

/**
 * @swagger
 * /api/toss/auth/remove-by-access-token:
 *   post:
 *     summary: AccessToken으로 로그인 연결 끊기
 *     description: 현재 AccessToken으로 토스 로그인 연결을 끊습니다. 이 AccessToken만 무효화됩니다.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 연결 끊기 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post("/remove-by-access-token", removeByAccessTokenHandler);

/**
 * @swagger
 * /api/toss/auth/remove-by-user-key:
 *   post:
 *     summary: userKey로 로그인 연결 끊기
 *     description: userKey로 해당 사용자의 모든 토스 로그인 연결을 끊습니다.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userKey
 *             properties:
 *               userKey:
 *                 type: number
 *                 description: 토스 userKey
 *                 example: 518165018
 *     responses:
 *       200:
 *         description: 연결 끊기 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiSuccessResponse'
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 */
router.post("/remove-by-user-key", removeByUserKeyHandler);

/**
 * @swagger
 * /api/toss/auth/callback:
 *   post:
 *     summary: 토스 콜백 엔드포인트
 *     description: |
 *       토스에서 사용자 연결 해제 시 호출하는 콜백 엔드포인트입니다.
 *       Basic Auth 검증이 설정된 경우 인증이 필요합니다.
 *       이 엔드포인트는 토스 서버에서만 호출되며, 클라이언트에서는 사용하지 않습니다.
 *     tags: [Auth]
 *     security:
 *       - basicAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userKey
 *               - referrer
 *             properties:
 *               userKey:
 *                 type: number
 *                 description: 토스 userKey
 *                 example: 518165018
 *               referrer:
 *                 type: string
 *                 description: 연결 해제 사유
 *                 enum: [UNLINK, WITHDRAWAL_TERMS, WITHDRAWAL_TOSS, DEFAULT, sandbox]
 *                 example: "UNLINK"
 *     responses:
 *       200:
 *         description: 콜백 처리 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         userKey:
 *                           type: number
 *                         referrer:
 *                           type: string
 *                     message:
 *                       type: string
 *                       example: "콜백이 성공적으로 처리되었습니다."
 *       401:
 *         description: Basic Auth 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post("/callback", callbackAuthMiddleware, callbackHandler);

export default router;
