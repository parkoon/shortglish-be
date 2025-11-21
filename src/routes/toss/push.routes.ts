import { Router } from "express";
import { sendMessageHandler } from "../../controllers/toss/push.controller";

const router = Router();

/**
 * @swagger
 * /api/toss/push/send-message:
 *   post:
 *     summary: 배치 푸시 메시지 발송
 *     description: |
 *       토스 푸시 메시지를 여러 사용자에게 동시에 발송합니다.
 *       어드민에서 사용하는 엔드포인트로, userKeys 배열을 body에 포함하여 전달합니다.
 *       템플릿 코드와 컨텍스트 변수를 전달하여 메시지를 발송합니다.
 *       userName은 자동으로 적용되므로 context에 포함할 필요가 없습니다.
 *       한 번에 10개씩 병렬 처리되어 안정성과 성능을 균형있게 유지합니다.
 *       각 userKey별로 성공/실패 결과가 반환됩니다.
 *     tags: [Toss Push]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userKeys
 *               - templateSetCode
 *               - context
 *             properties:
 *               userKeys:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: 토스 userKey 배열 (메시지를 받을 사용자들)
 *                 example: [518165018, 518165019, 518165020]
 *                 minItems: 1
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
 *         description: 메시지 발송 완료 (각 userKey별 성공/실패 결과 포함)
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
 *                         results:
 *                           type: array
 *                           description: 각 userKey별 발송 결과
 *                           items:
 *                             type: object
 *                             properties:
 *                               userKey:
 *                                 type: number
 *                                 description: 사용자 키
 *                               success:
 *                                 type: boolean
 *                                 description: 발송 성공 여부
 *                               result:
 *                                 type: object
 *                                 description: 성공 시 메시지 발송 결과
 *                                 properties:
 *                                   msgCount:
 *                                     type: number
 *                                   sentPushCount:
 *                                     type: number
 *                                   sentInboxCount:
 *                                     type: number
 *                                   sentSmsCount:
 *                                     type: number
 *                                   sentAlimtalkCount:
 *                                     type: number
 *                                   sentFriendtalkCount:
 *                                     type: number
 *                                   detail:
 *                                     type: object
 *                                   fail:
 *                                     type: object
 *                               error:
 *                                 type: object
 *                                 description: 실패 시 에러 정보
 *                                 properties:
 *                                   message:
 *                                     type: string
 *                                   code:
 *                                     type: string
 *                         summary:
 *                           type: object
 *                           description: 발송 통계
 *                           properties:
 *                             total:
 *                               type: number
 *                               description: 전체 요청 수
 *                             success:
 *                               type: number
 *                               description: 성공한 요청 수
 *                             failed:
 *                               type: number
 *                               description: 실패한 요청 수
 *       400:
 *         description: 잘못된 요청 (userKeys가 비어있거나, templateSetCode, context 중 하나라도 누락)
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
