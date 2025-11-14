import https from "https";
import fs from "fs";
import path from "path";
import { config } from "../config/env";

/**
 * mTLS httpsAgent 생성
 * 토스 API 통신을 위한 클라이언트 인증서 설정
 *
 * 지원 방식:
 * 1. 환경 변수에서 Base64 인코딩된 인증서 읽기 (Railway 권장)
 * 2. 파일 시스템에서 인증서 파일 읽기 (로컬 개발)
 */
export const createMtlsAgent = (): https.Agent | undefined => {
  let cert: Buffer;
  let key: Buffer;

  // 1. 환경 변수에서 Base64 인코딩된 인증서 사용 (Railway)
  if (config.toss.mtls.certBase64 && config.toss.mtls.keyBase64) {
    try {
      cert = Buffer.from(config.toss.mtls.certBase64, "base64");
      key = Buffer.from(config.toss.mtls.keyBase64, "base64");
      console.log(`[mTLS] 환경 변수에서 인증서를 로드했습니다.`);
    } catch (error) {
      console.error(
        `[mTLS] Base64 디코딩 중 오류가 발생했습니다:`,
        error instanceof Error ? error.message : error
      );
      return undefined;
    }
  } else {
    // 2. 파일 시스템에서 인증서 파일 읽기 (로컬 개발)
    const certPath = path.resolve(config.toss.mtls.certPath);
    const keyPath = path.resolve(config.toss.mtls.keyPath);

    if (!fs.existsSync(certPath)) {
      console.warn(
        `[mTLS] 인증서 파일을 찾을 수 없습니다: ${certPath}\n` +
          `토스 API 호출 시 mTLS 인증이 실패할 수 있습니다.\n` +
          `Railway 배포 시 TOSS_MTLS_CERT_BASE64 환경 변수를 설정하세요.`
      );
      return undefined;
    }

    if (!fs.existsSync(keyPath)) {
      console.warn(
        `[mTLS] 키 파일을 찾을 수 없습니다: ${keyPath}\n` +
          `토스 API 호출 시 mTLS 인증이 실패할 수 있습니다.\n` +
          `Railway 배포 시 TOSS_MTLS_KEY_BASE64 환경 변수를 설정하세요.`
      );
      return undefined;
    }

    try {
      cert = fs.readFileSync(certPath);
      key = fs.readFileSync(keyPath);
      console.log(`[mTLS] 파일 시스템에서 인증서를 로드했습니다.`);
    } catch (error) {
      console.error(
        `[mTLS] 인증서 파일 읽기 중 오류가 발생했습니다:`,
        error instanceof Error ? error.message : error
      );
      return undefined;
    }
  }

  try {
    const agent = new https.Agent({
      cert,
      key,
      rejectUnauthorized: true, // 서버 인증서 검증
    });

    console.log(`[mTLS] 인증서가 성공적으로 로드되었습니다.`);
    return agent;
  } catch (error) {
    console.error(
      `[mTLS] httpsAgent 생성 중 오류가 발생했습니다:`,
      error instanceof Error ? error.message : error
    );
    return undefined;
  }
};
