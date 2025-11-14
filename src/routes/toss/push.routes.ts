import { Router } from "express";
import { sendMessageHandler } from "../../controllers/toss/push.controller";

const router = Router();

/**
 * @swagger
 * /api/toss/push/send-message:
 *   post:
 *     summary: 푸시 메시지 발송
 *     description: |
 *       토스 푸시 메시지를 특정 사용자에게 발송합니다.
 *       어드민에서 사용하는 엔드포인트로, userKey를 body에 포함하여 전달합니다.
 *       템플릿 코드와 컨텍스트 변수를 전달하여 메시지를 발송합니다.
 *       userName은 자동으로 적용되므로 context에 포함할 필요가 없습니다.
 *     tags: [Toss Push]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userKey
 *               - templateSetCode
 *               - context
 *             properties:
 *               userKey:
 *                 type: number
 *                 description: 토스 userKey (메시지를 받을 사용자)
 *                 example: 518165018
 *               templateSetCode:
 *                 type: string
 *                 description: 발송할 메시지 템플릿 코드값
 *                 example: "shortglish-push-test"
 *               context:
 *                 type: object
 *                 description: 등록된 템플릿의 내용 중 변수 전달
 *                 additionalProperties: true
 *                 example:
 *                   storeName: "토스증권"
 *                   date: "2025-01-20 15:30"
 *     responses:
 *       200:
 *         description: 메시지 발송 성공
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
 *                         msgCount:
 *                           type: number
 *                           description: 발송 성공 카운트
 *                         sentPushCount:
 *                           type: number
 *                           description: 발송 성공 푸시 카운트
 *                         sentInboxCount:
 *                           type: number
 *                           description: 발송 성공 Inbox(알림) 카운트
 *                         sentSmsCount:
 *                           type: number
 *                           description: 발송 성공 문자 카운트
 *                         sentAlimtalkCount:
 *                           type: number
 *                           description: 발송 성공 알림톡 카운트
 *                         sentFriendtalkCount:
 *                           type: number
 *                           description: 발송 성공 친구톡 카운트
 *                         detail:
 *                           type: object
 *                           description: 발송 성공 상세 정보
 *                         fail:
 *                           type: object
 *                           description: 발송 실패 정보
 *       400:
 *         description: 잘못된 요청 (userKey, templateSetCode, context 중 하나라도 누락)
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
router.post("/send-message", sendMessageHandler);

export default router;
