import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { storeHelper } from "../store/store.js";

// Get credentials from store
const SUPABASE_URL =
  storeHelper.get("SUPABASE_URL") || process.env.NUXT_SUPABASE_URL;
const SUPABASE_KEY =
  storeHelper.get("SUPABASE_KEY") || process.env.NUXT_SUPABASE_KEY;

if (SUPABASE_URL) storeHelper.set("SUPABASE_URL", SUPABASE_URL);
if (SUPABASE_KEY) storeHelper.set("SUPABASE_KEY", SUPABASE_KEY);

let supabase: SupabaseClient | null = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
}

export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    const url = storeHelper.get("SUPABASE_URL");
    const key = storeHelper.get("SUPABASE_KEY");
    if (!url || !key) {
      throw new Error("Supabase credentials not configured");
    }
    supabase = createClient(url, key);
  }
  return supabase;
};

/**
 * Enforce a 3000 record cap on a specific Supabase table
 * @param tableName Table to clean up
 */
export const rotateRecords = async (
  tableName: string,
  maxRecords: number = 3000,
) => {
  const client = getSupabase();

  // 1. Get total count
  const { count, error: countError } = await client
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (countError) throw countError;

  if (count && count > maxRecords) {
    const toDelete = count - maxRecords;

    // 2. Get the IDs of the oldest records
    const { data: oldestRecords, error: fetchError } = await client
      .from(tableName)
      .select("id") // Assuming 'id' is the primary key
      .order("created_at", { ascending: true })
      .limit(toDelete);

    if (fetchError) throw fetchError;

    if (oldestRecords && oldestRecords.length > 0) {
      const ids = oldestRecords.map((r) => r.id);

      // 3. Delete them
      const { error: deleteError } = await client
        .from(tableName)
        .delete()
        .in("id", ids);

      if (deleteError) throw deleteError;

      console.log(
        `Deleted ${ids.length} oldest records from ${tableName} to maintain ${maxRecords} limit.`,
      );
    }
  }
};
