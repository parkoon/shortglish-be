import crypto from "crypto";
import { config } from "../../config/env";
import { DecryptedUserInfo } from "../../utils/types/toss.types";
import { AppError } from "../../middleware/errorHandler";

const IV_LENGTH = 12; // IV 길이 (바이트)
const TAG_LENGTH = 16; // GCM 태그 길이 (바이트)
const ALGORITHM = "aes-256-gcm";

type EncryptedUserInfo = {
  name?: string | null;
  phone?: string | null;
  birthday?: string | null;
  ci?: string | null;
  gender?: string | null;
  nationality?: string | null;
  email?: string | null;
};

/**
 * 단일 필드 복호화
 * @param encryptedText Base64 인코딩된 암호화된 텍스트
 * @param base64Key Base64 인코딩된 복호화 키
 * @param aad Additional Authenticated Data
 * @returns 복호화된 텍스트
 */
export const decrypt = (
  encryptedText: string | null | undefined,
  base64Key?: string,
  aad?: string
): string | null => {
  // null이거나 undefined인 경우 null 반환
  if (!encryptedText) {
    return null;
  }

  const key = base64Key || config.toss.decryptionKey;
  const additionalData = aad || config.toss.aad;

  if (!key) {
    throw new AppError(
      500,
      "복호화 키가 설정되지 않았습니다. TOSS_DECRYPTION_KEY 환경 변수를 확인해주세요."
    );
  }

  try {
    // Base64 디코딩
    const decoded = Buffer.from(encryptedText, "base64");
    const keyBuffer = Buffer.from(key, "base64");

    // IV 추출 (앞 12바이트)
    if (decoded.length < IV_LENGTH) {
      throw new AppError(400, "암호화된 데이터 형식이 올바르지 않습니다.");
    }

    const iv = decoded.subarray(0, IV_LENGTH);
    const ciphertext = decoded.subarray(IV_LENGTH);

    // GCM 모드에서는 태그가 암호문 끝에 붙어있음
    if (ciphertext.length < TAG_LENGTH) {
      throw new AppError(400, "암호화된 데이터 형식이 올바르지 않습니다.");
    }

    const tag = ciphertext.subarray(-TAG_LENGTH);
    const encryptedData = ciphertext.subarray(0, -TAG_LENGTH);

    // 복호화
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
    decipher.setAuthTag(tag);
    decipher.setAAD(Buffer.from(additionalData, "utf8"));

    let decrypted = decipher.update(encryptedData, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(500, "복호화 중 오류가 발생했습니다.");
  }
};

/**
 * 사용자 정보 전체 복호화
 * @param encryptedUserInfo 암호화된 사용자 정보 객체
 * @param base64Key Base64 인코딩된 복호화 키 (선택)
 * @param aad Additional Authenticated Data (선택)
 * @returns 복호화된 사용자 정보
 */
export const decryptUserInfo = (
  encryptedUserInfo: EncryptedUserInfo,
  base64Key?: string,
  aad?: string
): DecryptedUserInfo => {
  // null을 undefined로 변환하여 타입 호환성 확보
  const decryptField = (
    value: string | null | undefined
  ): string | undefined => {
    const decrypted = decrypt(value, base64Key, aad);
    return decrypted ?? undefined;
  };

  return {
    name: decryptField(encryptedUserInfo.name),
    phone: decryptField(encryptedUserInfo.phone),
    birthday: decryptField(encryptedUserInfo.birthday),
    ci: decryptField(encryptedUserInfo.ci),
    gender: decryptField(encryptedUserInfo.gender),
    nationality: decryptField(encryptedUserInfo.nationality),
    email: decryptField(encryptedUserInfo.email),
  };
};
