import { Request, Response, NextFunction } from "express";
import { sendPushMessage } from "../../services/toss/toss-api.service";
import { SendMessageRequest } from "../../utils/types/toss.types";
import { AppError } from "../../middleware/errorHandler";
import { sendSuccess } from "../../utils/apiResponse";

/**
 * 푸시 메시지 발송
 * POST /api/toss/push/send-message
 * 어드민에서 특정 사용자에게 메시지를 발송하는 용도
 */
export const sendMessageHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userKey, templateSetCode, context } = req.body;

    if (!userKey) {
      throw new AppError(400, "userKey는 필수입니다.");
    }

    if (!templateSetCode || !context) {
      throw new AppError(400, "templateSetCode와 context는 필수입니다.");
    }

    const request: SendMessageRequest = {
      userKey: Number(userKey),
      templateSetCode,
      context,
    };

    const result = await sendPushMessage(request);

    sendSuccess(res, {
      data: result,
      message: "푸시 메시지가 발송되었습니다.",
    });
  } catch (error) {
    next(error);
  }
};
