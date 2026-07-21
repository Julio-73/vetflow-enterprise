import { createClient } from "@supabase/supabase-js";

function getSupabaseConfig() {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof window !== "undefined") {
    if (!url || url === "https://example.supabase.co") {
      url = localStorage.getItem("vetflow_supabase_url") || "https://example.supabase.co";
    }
    if (!key || key === "mock-anon-key") {
      key = localStorage.getItem("vetflow_supabase_anon_key") || "mock-anon-key";
    }
  }

  return {
    url: url || "https://example.supabase.co",
    key: key || "mock-anon-key"
  };
}

const config = getSupabaseConfig();

export const supabase = createClient(config.url, config.key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
