import { Router } from "express";
import {
  getCurrentUser,
  updateCurrentUser,
  deleteCurrentUser,
} from "../controllers/user.controller";
import { validateTossToken } from "../middleware/validateTossToken";

const router = Router();

/**
 * GET /api/users/me
 * 현재 로그인한 사용자 정보 조회
 * - 토스 AccessToken 필요
 * - Supabase에서 조회, 없으면 토스에서 가져와서 저장
 */
router.get("/me", validateTossToken, getCurrentUser);

/**
 * POST /api/users/me
 * 사용자 정보 업데이트 (토스 사용자 정보로 동기화)
 * - 토스 AccessToken 필요
 * - 토스에서 받은 최신 정보로 업데이트
 */
router.post("/me", validateTossToken, updateCurrentUser);

/**
 * DELETE /api/users/me
 * 사용자 탈퇴 (Soft Delete)
 * - 토스 AccessToken 필요
 * - deleted_at 필드에 탈퇴 시점 기록
 */
router.delete("/me", validateTossToken, deleteCurrentUser);

export default router;
