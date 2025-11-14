import { Router } from "express";
import {
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser,
} from "../controllers/user.controller";
import { validateTossToken } from "../middleware/validateTossToken";

const router = Router();

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: 현재 사용자 정보 조회
 *     description: |
 *       토스 AccessToken으로 사용자 정보를 조회합니다.
 *       서버에서 자동으로:
 *       1. 토스 API로 사용자 정보 조회 (토큰 검증)
 *       2. 사용자 정보 복호화
 *       3. Supabase에 저장/업데이트 (없으면 생성, 있으면 업데이트)
 *       4. DB의 사용자 정보 반환
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *       401:
 *         description: 인증 실패
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
router.get("/me", validateTossToken, getCurrentUser);

/**
 * @swagger
 * /api/users/me:
 *   post:
 *     summary: 사용자 정보 업데이트
 *     description: 토스에서 최신 사용자 정보를 가져와서 Supabase에 동기화합니다.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 업데이트 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiSuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/User'
 *                     message:
 *                       type: string
 *                       example: "사용자 정보가 업데이트되었습니다."
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 서버 오류
 */
router.post("/me", validateTossToken, updateCurrentUser);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     summary: 사용자 탈퇴
 *     description: 사용자 탈퇴를 처리합니다 (Soft Delete). deleted_at 필드에 탈퇴 시점을 기록합니다.
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 탈퇴 완료
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
 *                         message:
 *                           type: string
 *                           example: "탈퇴가 완료되었습니다."
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *       500:
 *         description: 서버 오류
 */
router.delete("/me", validateTossToken, deleteCurrentUser);

export default router;
