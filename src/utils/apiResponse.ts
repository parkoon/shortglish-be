import { Response } from "express";

/**
 * API 응답 구조
 *
 * 성공 응답:
 * {
 *   success: true,
 *   data: {...},
 *   message?: string,
 *   meta?: {...}
 * }
 *
 * 에러 응답 (errorHandler에서 처리):
 * {
 *   success: false,
 *   error: string,
 *   message?: string
 * }
 */

/**
 * 성공 응답 타입
 */
export type ApiSuccessResponse<T = unknown> = {
  success: true;
  data: T;
  message?: string;
  meta?: {
    timestamp?: string;
    [key: string]: unknown;
  };
};

/**
 * 성공 응답 생성 헬퍼
 *
 * @param res Express Response 객체
 * @param options 응답 옵션
 * @param options.data 응답 데이터
 * @param options.message 선택적 메시지
 * @param options.meta 선택적 메타데이터 (pagination, timestamp 등)
 */
export function sendSuccess<T>(
  res: Response,
  options: {
    data: T;
    message?: string;
    meta?: Record<string, unknown>;
  }
): void {
  const { data, message, meta } = options;

  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && {
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
    }),
  };

  res.json(response);
}

/**
 * 페이징 메타데이터 타입
 */
export type PaginationMeta = {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

/**
 * 페이징된 데이터 응답 생성 헬퍼
 *
 * @param res Express Response 객체
 * @param options 페이징 옵션
 * @param options.data 배열 데이터
 * @param options.page 현재 페이지
 * @param options.limit 페이지당 항목 수
 * @param options.total 전체 항목 수
 * @param options.message 선택적 메시지
 */
export function sendPaginated<T>(
  res: Response,
  options: {
    data: T[];
    page: number;
    limit: number;
    total: number;
    message?: string;
  }
): void {
  const { data, page, limit, total, message } = options;
  const totalPages = Math.ceil(total / limit);

  sendSuccess(res, {
    data,
    message,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    },
  });
}
