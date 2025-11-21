import axios, { AxiosInstance, AxiosError } from "axios";
import { config } from "../../config/env";
import {
  GenerateTokenRequest,
  GenerateTokenResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  UserInfoResponse,
  RemoveByUserKeyRequest,
  RemoveTokenResponse,
  SendMessageRequest,
  SendMessageResponse,
  BatchSendMessageResult,
  MessageResult,
} from "../../utils/types/toss.types";
import { AppError } from "../../middleware/errorHandler";
import { createMtlsAgent } from "../../utils/mtls";

/**
 * 토스 API axios 인스턴스 생성
 */
const createTossApiClient = (): AxiosInstance => {
  const httpsAgent = createMtlsAgent();

  const client = axios.create({
    baseURL: config.toss.apiBaseUrl,
    timeout: 10000, // 10초 타임아웃
    headers: {
      "Content-Type": "application/json",
    },
    ...(httpsAgent && { httpsAgent }), // mTLS 인증서가 있으면 적용
  });

  // 응답 인터셉터: 에러 처리
  client.interceptors.response.use(
    (response: any) => response,
    (error: AxiosError) => {
      if (!error.response) {
        if (error.request) {
          // 요청은 보냈지만 응답을 받지 못함
          throw new AppError(503, "토스 API 서버에 연결할 수 없습니다.");
        }
        // 요청 설정 중 오류
        throw new AppError(500, "요청 설정 중 오류가 발생했습니다.");
      }

      // 토스 API에서 반환한 에러
      const status = error.response.status;
      const data = error.response.data as any;

      if (status === 400 && data?.error === "invalid_grant") {
        throw new AppError(400, "인가 코드가 만료되었거나 유효하지 않습니다.");
      }

      if (data?.error?.errorCode) {
        throw new AppError(
          status,
          data.error.reason || "토스 API 요청 중 오류가 발생했습니다."
        );
      }

      throw error;
    }
  );

  return client;
};

const tossApiClient = createTossApiClient();

/**
 * AccessToken 발급
 * 인가 코드로 AccessToken과 RefreshToken을 발급받습니다.
 */
export const generateToken = async (
  request: GenerateTokenRequest
): Promise<GenerateTokenResponse["success"]> => {
  if (!request.authorizationCode || !request.referrer) {
    throw new AppError(400, "authorizationCode와 referrer는 필수입니다.");
  }

  try {
    const response = await tossApiClient.post<GenerateTokenResponse>(
      "/api-partner/v1/apps-in-toss/user/oauth2/generate-token",
      {
        authorizationCode: request.authorizationCode,
        referrer: request.referrer,
      }
    );

    if (response.data.resultType === "FAIL" || response.data.error) {
      const error = response.data.error;
      if (error?.error === "invalid_grant") {
        throw new AppError(400, "인가 코드가 만료되었거나 유효하지 않습니다.");
      }
      throw new AppError(
        500,
        error?.reason || "토큰 발급 중 오류가 발생했습니다."
      );
    }

    if (!response.data.success) {
      throw new AppError(500, "토큰 발급 응답이 올바르지 않습니다.");
    }

    return response.data.success;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "토큰 발급 중 예상치 못한 오류가 발생했습니다.");
  }
};

/**
 * AccessToken 재발급
 * RefreshToken으로 새로운 AccessToken을 발급받습니다.
 */
export const refreshToken = async (
  request: RefreshTokenRequest
): Promise<RefreshTokenResponse["success"]> => {
  if (!request.refreshToken) {
    throw new AppError(400, "refreshToken은 필수입니다.");
  }

  try {
    const response = await tossApiClient.post<RefreshTokenResponse>(
      "/api-partner/v1/apps-in-toss/user/oauth2/refresh-token",
      {
        refreshToken: request.refreshToken,
      }
    );

    if (response.data.resultType === "FAIL" || response.data.error) {
      const error = response.data.error;
      throw new AppError(
        400,
        error?.reason || "토큰 재발급 중 오류가 발생했습니다."
      );
    }

    if (!response.data.success) {
      throw new AppError(500, "토큰 재발급 응답이 올바르지 않습니다.");
    }

    return response.data.success;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "토큰 재발급 중 예상치 못한 오류가 발생했습니다.");
  }
};

/**
 * 사용자 정보 조회
 *
 * AccessToken으로 사용자 정보를 조회합니다.
 */
export const getUserInfo = async (
  accessToken: string
): Promise<UserInfoResponse["success"]> => {
  if (!accessToken) {
    throw new AppError(401, "AccessToken이 필요합니다.");
  }

  try {
    const response = await tossApiClient.get<UserInfoResponse>(
      "/api-partner/v1/apps-in-toss/user/oauth2/login-me",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.resultType === "FAIL" || response.data.error) {
      const error = response.data.error;
      if (error?.error === "invalid_grant") {
        throw new AppError(
          401,
          "유효하지 않은 토큰입니다. 토큰을 재발급해주세요."
        );
      }
      throw new AppError(
        500,
        error?.reason || "사용자 정보 조회 중 오류가 발생했습니다."
      );
    }

    if (!response.data.success) {
      throw new AppError(500, "사용자 정보 조회 응답이 올바르지 않습니다.");
    }

    return response.data.success;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      500,
      "사용자 정보 조회 중 예상치 못한 오류가 발생했습니다."
    );
  }
};

/**
 * AccessToken으로 로그인 연결 끊기
 */
export const removeByAccessToken = async (
  accessToken: string
): Promise<void> => {
  if (!accessToken) {
    throw new AppError(401, "AccessToken이 필요합니다.");
  }

  try {
    await tossApiClient.post(
      "/api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-access-token",
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      500,
      "로그인 연결 끊기 중 예상치 못한 오류가 발생했습니다."
    );
  }
};

/**
 * userKey로 로그인 연결 끊기
 */
export const removeByUserKey = async (
  request: RemoveByUserKeyRequest,
  accessToken: string
): Promise<RemoveTokenResponse["success"]> => {
  if (!request.userKey) {
    throw new AppError(400, "userKey는 필수입니다.");
  }

  if (!accessToken) {
    throw new AppError(401, "AccessToken이 필요합니다.");
  }

  try {
    const response = await tossApiClient.post<RemoveTokenResponse>(
      "/api-partner/v1/apps-in-toss/user/oauth2/access/remove-by-user-key",
      {
        userKey: request.userKey,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.data.resultType === "FAIL" || response.data.error) {
      const error = response.data.error;
      throw new AppError(
        500,
        error?.reason || "로그인 연결 끊기 중 오류가 발생했습니다."
      );
    }

    return response.data.success;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      500,
      "로그인 연결 끊기 중 예상치 못한 오류가 발생했습니다."
    );
  }
};

/**
 * 단일 사용자에게 푸시 메시지 발송 (내부 함수)
 *
 * @param userKey 사용자 키
 * @param templateSetCode 템플릿 코드
 * @param context 컨텍스트 변수
 * @returns 메시지 발송 결과
 */
const sendPushMessageToUser = async (
  userKey: number,
  templateSetCode: string,
  context: Record<string, unknown>
): Promise<MessageResult> => {
  try {
    const response = await tossApiClient.post<SendMessageResponse>(
      "/api-partner/v1/apps-in-toss/messenger/send-message",
      {
        templateSetCode,
        context,
      },
      {
        headers: {
          "x-toss-user-key": `${userKey}`,
        },
      }
    );

    if (response.data.resultType !== "SUCCESS" || response.data.error) {
      const error = response.data.error;
      throw new AppError(
        500,
        error?.reason || "푸시 메시지 발송 중 오류가 발생했습니다."
      );
    }

    if (!response.data.success) {
      throw new AppError(500, "푸시 메시지 발송 응답이 올바르지 않습니다.");
    }

    return response.data.success;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      500,
      "푸시 메시지 발송 중 예상치 못한 오류가 발생했습니다."
    );
  }
};

/**
 * 배열을 청크로 나누는 헬퍼 함수
 */
const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * 배치 푸시 메시지 발송
 * 여러 사용자에게 동시에 푸시 메시지를 발송합니다.
 * 10개씩 병렬 처리하여 안정성과 성능을 균형있게 유지합니다.
 *
 * @param request 메시지 발송 요청 (userKeys 배열, templateSetCode, context)
 * @returns 각 userKey별 발송 결과 배열
 */
export const sendBatchPushMessage = async (
  request: SendMessageRequest
): Promise<BatchSendMessageResult[]> => {
  if (
    !request.userKeys ||
    !Array.isArray(request.userKeys) ||
    request.userKeys.length === 0
  ) {
    throw new AppError(400, "userKeys는 필수이며 비어있을 수 없습니다.");
  }

  if (!request.templateSetCode || !request.context) {
    throw new AppError(400, "templateSetCode와 context는 필수입니다.");
  }

  const { userKeys, templateSetCode, context } = request;
  const BATCH_SIZE = 10; // 한 번에 처리할 최대 개수
  const results: BatchSendMessageResult[] = [];

  // userKeys를 10개씩 청크로 나누기
  const chunks = chunkArray(userKeys, BATCH_SIZE);

  // 각 청크를 순차적으로 처리
  for (const chunk of chunks) {
    // 청크 내에서는 병렬 처리
    const chunkResults = await Promise.allSettled(
      chunk.map((userKey) =>
        sendPushMessageToUser(userKey, templateSetCode, context)
      )
    );

    // 결과를 BatchSendMessageResult 형식으로 변환
    chunk.forEach((userKey, index) => {
      const result = chunkResults[index];
      if (result.status === "fulfilled") {
        results.push({
          userKey,
          success: true,
          result: result.value,
        });
      } else {
        const error = result.reason;
        results.push({
          userKey,
          success: false,
          error: {
            message:
              error instanceof AppError
                ? error.message
                : "푸시 메시지 발송 중 예상치 못한 오류가 발생했습니다.",
            code:
              error instanceof AppError ? String(error.statusCode) : undefined,
          },
        });
      }
    });
  }

  return results;
};
