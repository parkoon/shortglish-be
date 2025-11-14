import { supabase } from "../lib/supabase";
import type { UpsertUserRequest, User } from "../utils/types/user.types";
import { AppError } from "../middleware/errorHandler";

/**
 * auth_provider와 external_user_id로 사용자 조회
 */
export const getUserByAuthProviderAndExternalId = async (
  authProvider: string,
  externalUserId: string
): Promise<User | null> => {
  if (!authProvider || !externalUserId) {
    return null;
  }

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("auth_provider", authProvider)
    .eq("external_user_id", externalUserId)
    .is("deleted_at", null) // 활성 사용자만 조회
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // 사용자를 찾을 수 없음
      return null;
    }
    throw new AppError(500, `사용자 조회 실패: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  // snake_case → camelCase 변환
  return {
    id: data.id,
    authProvider: data.auth_provider,
    externalUserId: data.external_user_id,
    name: data.name,
    phone: data.phone,
    birthday: data.birthday,
    ci: data.ci,
    gender: data.gender,
    nationality: data.nationality,
    email: data.email,
    nickname: data.nickname,
    agreedTerms: data.agreed_terms,
    marketingConsent: data.marketing_consent ?? false,
    notificationEnabled: data.notification_enabled ?? true,
    lastLoginAt: data.last_login_at,
    deletedAt: data.deleted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * 사용자 생성 또는 업데이트 (Upsert)
 */
export const upsertUser = async (request: UpsertUserRequest): Promise<User> => {
  if (!request.authProvider || !request.externalUserId) {
    throw new AppError(400, "authProvider와 externalUserId는 필수입니다.");
  }

  const { data, error } = await supabase
    .from("users")
    .upsert(
      {
        auth_provider: request.authProvider,
        external_user_id: request.externalUserId,
        name: request.name,
        phone: request.phone,
        birthday: request.birthday,
        ci: request.ci,
        gender: request.gender,
        nationality: request.nationality,
        email: request.email,
        agreed_terms: request.agreedTerms,
        last_login_at: new Date().toISOString(), // 로그인 시점 업데이트
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "auth_provider,external_user_id",
      }
    )
    .select()
    .single();

  if (error) {
    throw new AppError(500, `사용자 저장 실패: ${error.message}`);
  }

  if (!data) {
    throw new AppError(500, "사용자 저장 실패: 데이터가 반환되지 않았습니다.");
  }

  // snake_case → camelCase 변환
  return {
    id: data.id,
    authProvider: data.auth_provider,
    externalUserId: data.external_user_id,
    name: data.name,
    phone: data.phone,
    birthday: data.birthday,
    ci: data.ci,
    gender: data.gender,
    nationality: data.nationality,
    email: data.email,
    nickname: data.nickname,
    agreedTerms: data.agreed_terms,
    marketingConsent: data.marketing_consent ?? false,
    notificationEnabled: data.notification_enabled ?? true,
    lastLoginAt: data.last_login_at,
    deletedAt: data.deleted_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
};

/**
 * 사용자 탈퇴 (Soft Delete)
 */
export const deleteUser = async (
  authProvider: string,
  externalUserId: string
): Promise<void> => {
  if (!authProvider || !externalUserId) {
    throw new AppError(400, "authProvider와 externalUserId는 필수입니다.");
  }

  const { error } = await supabase
    .from("users")
    .update({ deleted_at: new Date().toISOString() })
    .eq("auth_provider", authProvider)
    .eq("external_user_id", externalUserId)
    .is("deleted_at", null); // 이미 탈퇴한 사용자는 제외

  if (error) {
    throw new AppError(500, `사용자 탈퇴 실패: ${error.message}`);
  }
};

