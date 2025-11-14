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
    console.log("🚀 ~ generateToken ~ response:", response);

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
 * 푸시 메시지 발송
 *
 * @param request 메시지 발송 요청 (userKey, templateSetCode, context)
 * @returns 메시지 발송 결과
 */
export const sendPushMessage = async (
  request: SendMessageRequest
): Promise<SendMessageResponse["result"]> => {
  if (!request.userKey) {
    throw new AppError(400, "userKey는 필수입니다.");
  }

  if (!request.templateSetCode || !request.context) {
    throw new AppError(400, "templateSetCode와 context는 필수입니다.");
  }

  try {
    const response = await tossApiClient.post<SendMessageResponse>(
      "/api-partner/v1/apps-in-toss/messenger/send-message",
      {
        templateSetCode: request.templateSetCode,
        context: request.context,
      },
      {
        headers: {
          "x-toss-user-key": `${request.userKey}`,
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

    if (!response.data.result) {
      throw new AppError(500, "푸시 메시지 발송 응답이 올바르지 않습니다.");
    }

    return response.data.result;
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
