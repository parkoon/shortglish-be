#!/bin/bash
# Railway 환경 변수 설정 스크립트

echo "🚀 Railway 환경 변수 설정 시작..."

# .env 파일에서 값 읽기
if [ ! -f .env ]; then
    echo "❌ .env 파일을 찾을 수 없습니다."
    exit 1
fi

source .env

# 프로젝트 연결 확인
if ! railway status &>/dev/null; then
    echo "⚠️  Railway 프로젝트가 연결되지 않았습니다."
    echo "먼저 'railway link' 명령어를 실행하여 프로젝트를 연결해주세요."
    exit 1
fi

echo "📝 환경 변수 설정 중..."

# mTLS 인증서 설정
if [ -f certs/client-cert.pem ] && [ -f certs/client-key.pem ]; then
    echo "  - mTLS 인증서 설정 중..."
    CERT_BASE64=$(cat certs/client-cert.pem | base64 | tr -d '\n')
    KEY_BASE64=$(cat certs/client-key.pem | base64 | tr -d '\n')
    railway variables --set "TOSS_MTLS_CERT_BASE64=$CERT_BASE64"
    railway variables --set "TOSS_MTLS_KEY_BASE64=$KEY_BASE64"
    echo "  ✅ mTLS 인증서 설정 완료"
else
    echo "  ⚠️  인증서 파일을 찾을 수 없습니다. 건너뜁니다."
fi

# 토스 로그인 관련 환경 변수
if [ -n "$TOSS_DECRYPTION_KEY" ]; then
    echo "  - TOSS_DECRYPTION_KEY 설정 중..."
    railway variables --set "TOSS_DECRYPTION_KEY=$TOSS_DECRYPTION_KEY"
    echo "  ✅ TOSS_DECRYPTION_KEY 설정 완료"
fi

if [ -n "$TOSS_AAD" ]; then
    echo "  - TOSS_AAD 설정 중..."
    railway variables --set "TOSS_AAD=$TOSS_AAD"
    echo "  ✅ TOSS_AAD 설정 완료"
fi

if [ -n "$TOSS_CALLBACK_BASIC_AUTH_USERNAME" ]; then
    echo "  - TOSS_CALLBACK_BASIC_AUTH_USERNAME 설정 중..."
    railway variables --set "TOSS_CALLBACK_BASIC_AUTH_USERNAME=$TOSS_CALLBACK_BASIC_AUTH_USERNAME"
    echo "  ✅ TOSS_CALLBACK_BASIC_AUTH_USERNAME 설정 완료"
fi

if [ -n "$TOSS_CALLBACK_BASIC_AUTH_PASSWORD" ]; then
    echo "  - TOSS_CALLBACK_BASIC_AUTH_PASSWORD 설정 중..."
    railway variables --set "TOSS_CALLBACK_BASIC_AUTH_PASSWORD=$TOSS_CALLBACK_BASIC_AUTH_PASSWORD"
    echo "  ✅ TOSS_CALLBACK_BASIC_AUTH_PASSWORD 설정 완료"
fi

# CORS 설정 (프로덕션용으로 수정 필요할 수 있음)
if [ -n "$ALLOWED_ORIGINS" ]; then
    echo "  - ALLOWED_ORIGINS 설정 중..."
    railway variables --set "ALLOWED_ORIGINS=$ALLOWED_ORIGINS"
    echo "  ✅ ALLOWED_ORIGINS 설정 완료"
fi

# NODE_ENV 설정
echo "  - NODE_ENV 설정 중..."
railway variables --set "NODE_ENV=production"
echo "  ✅ NODE_ENV 설정 완료"

echo ""
echo "✨ 모든 환경 변수 설정 완료!"
echo "📋 설정된 환경 변수 확인: railway variables"
