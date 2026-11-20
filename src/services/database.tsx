import { createSupabaseClient } from "../api";
import { supabaseConfig } from "../config";
import { auth } from "./auth";

// User JWTs accompany requests; database access must be enforced by RLS.
export const db = createSupabaseClient({
  ...supabaseConfig,
  getAccessToken: auth.getAccessToken,
});
