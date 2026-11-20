import { request, ApiError } from "../api/http";
import { auth } from "./auth";
import { supabaseConfig } from "../config";
export interface UserSettings {
  configured: boolean;
  model: string;
}
export async function userSettings(
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: { key?: string; model: string },
  signal?: AbortSignal,
): Promise<UserSettings> {
  const token = await auth.getAccessToken();
  if (!token) throw new Error("Please log in again.");
  try {
    return await request<UserSettings>(
      `${supabaseConfig.url}/functions/v1/user-settings`,
      { method, body, signal, headers: { Authorization: `Bearer ${token}` } },
    );
  } catch (error) {
    if (error instanceof ApiError)
      throw new Error(
        (error.data as { error?: string })?.error ||
          "Unable to load API settings.",
      );
    throw error;
  }
}
