import { createClient } from "@supabase/supabase-js";
import { config } from "../config/env";

/**
 * Supabase 클라이언트 (Service Role Key 사용)
 * 백엔드에서만 사용하며, RLS를 우회하여 모든 데이터에 접근 가능합니다.
 */
export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

