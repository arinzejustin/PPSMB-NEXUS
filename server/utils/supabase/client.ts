import { createClient } from "@supabase/supabase-js";

export const useSupabase = () => {
  const config = useRuntimeConfig();

  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error(
      "Supabase configuration is missing. Please check your runtime config."
    );
  }

  return createClient(config.supabaseUrl, config.supabaseKey);
};
