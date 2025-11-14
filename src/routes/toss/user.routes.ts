import { Router } from "express";
import {
  getUserInfoHandler,
  getDecryptedUserInfoHandler,
  decryptUserInfoHandler,
} from "../../controllers/toss/user.controller";

const router = Router();

/**
 * @swagger
 * /api/toss/user/me:
 *   get:
 *     summary: 사용자 정보 조회 (암호화된 상태)
 *     description: AccessToken으로 사용자 정보를 조회합니다. 암호화된 상태로 반환되므로 별도로 복호화해야 합니다.
 *     tags: [Toss User]
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
 *                       type: object
 *                       properties:
 *                         userKey:
 *                           type: number
 *                         scope:
 *                           type: string
 *                         agreedTerms:
 *                           type: array
 *                           items:
 *                             type: string
 *                         name:
 *                           type: string
 *                           nullable: true
 *                           description: 암호화된 값 (Base64)
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                           description: 암호화된 값 (Base64)
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get("/me", getUserInfoHandler);

/**
 * @swagger
 * /api/toss/user/me/decrypted:
 *   get:
 *     summary: 사용자 정보 조회 및 복호화
 *     description: AccessToken으로 사용자 정보를 조회하고 자동으로 복호화합니다.
 *     tags: [Toss User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 사용자 정보 조회 및 복호화 성공
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
 *                         scope:
 *                           type: string
 *                         agreedTerms:
 *                           type: array
 *                           items:
 *                             type: string
 *                         name:
 *                           type: string
 *                           nullable: true
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                         birthday:
 *                           type: string
 *                           nullable: true
 *                           description: yyyyMMdd 형식
 *                         ci:
 *                           type: string
 *                           nullable: true
 *                         gender:
 *                           type: string
 *                           enum: [MALE, FEMALE]
 *                           nullable: true
 *                         nationality:
 *                           type: string
 *                           enum: [LOCAL, FOREIGNER]
 *                           nullable: true
 *                         email:
 *                           type: string
 *                           nullable: true
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.get("/me/decrypted", getDecryptedUserInfoHandler);

/**
 * @swagger
 * /api/toss/user/decrypt:
 *   post:
 *     summary: 사용자 정보 복호화
 *     description: 암호화된 사용자 정보 필드를 복호화합니다. 최소 하나의 필드는 필요합니다.
 *     tags: [Toss User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 암호화된 이름 (선택)
 *               phone:
 *                 type: string
 *                 description: 암호화된 전화번호 (선택)
 *               birthday:
 *                 type: string
 *                 description: 암호화된 생년월일 (선택)
 *               ci:
 *                 type: string
 *                 description: 암호화된 CI (선택)
 *               gender:
 *                 type: string
 *                 description: 암호화된 성별 (선택)
 *               nationality:
 *                 type: string
 *                 description: 암호화된 내/외국인 여부 (선택)
 *               email:
 *                 type: string
 *                 description: 암호화된 이메일 (선택)
 *               decryptionKey:
 *                 type: string
 *                 description: 선택적 복호화 키 (기본값: 환경 변수)
 *               aad:
 *                 type: string
 *                 description: 선택적 AAD (기본값: TOSS)
 *     responses:
 *       200:
 *         description: 복호화 성공
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
 *                         name:
 *                           type: string
 *                           nullable: true
 *                         phone:
 *                           type: string
 *                           nullable: true
 *                         birthday:
 *                           type: string
 *                           nullable: true
 *                         ci:
 *                           type: string
 *                           nullable: true
 *                         gender:
 *                           type: string
 *                           nullable: true
 *                         nationality:
 *                           type: string
 *                           nullable: true
 *                         email:
 *                           type: string
 *                           nullable: true
 *       400:
 *         description: 복호화할 필드가 없음
 *       500:
 *         description: 서버 오류
 */
router.post("/decrypt", decryptUserInfoHandler);

export default router;
