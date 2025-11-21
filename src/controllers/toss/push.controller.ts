import { Request, Response, NextFunction } from "express";
import { sendBatchPushMessage } from "../../services/toss/toss-api.service";
import { SendMessageRequest } from "../../utils/types/toss.types";
import { AppError } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/apiResponse";

/**
 * 배치 푸시 메시지 발송
 * POST /api/toss/push/send-message
 * 어드민에서 여러 사용자에게 메시지를 발송하는 용도
 * userKeys 배열을 받아 각 사용자별로 메시지를 발송하고 결과를 반환합니다.
 */
export const sendMessageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userKeys, templateSetCode, context } = req.body;

    if (!userKeys || !Array.isArray(userKeys) || userKeys.length === 0) {
      throw new AppError(400, "userKeys는 필수이며 비어있을 수 없습니다.");
    }

    if (!templateSetCode || !context) {
      throw new AppError(400, "templateSetCode와 context는 필수입니다.");
    }

    // userKeys를 숫자 배열로 변환
    const numericUserKeys = userKeys.map((key: unknown) => Number(key));

    const request: SendMessageRequest = {
      userKeys: numericUserKeys,
      templateSetCode,
      context,
    };

    const results = await sendBatchPushMessage(request);

    // 성공/실패 통계 계산
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    sendSuccess(res, {
      data: {
        results,
        summary: {
          total: results.length,
          success: successCount,
          failed: failCount,
        },
      },
      message: `푸시 메시지 발송 완료: ${successCount}개 성공, ${failCount}개 실패`,
    });
  } catch (error) {
    next(error);
  }
};
