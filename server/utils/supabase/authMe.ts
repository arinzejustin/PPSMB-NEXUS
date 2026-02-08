import { useSupabase } from "@@/server/utils/supabase/client";
import type { UserDetails } from "~/utils/types";

export const authMe = async (
  uuid: string,
  email: string,
): Promise<{ status: boolean; user?: UserDetails; message?: string }> => {
  const supabase = useSupabase();
  const { data: user, error } = await supabase
    .from("staff")
    .select("*")
    .eq("uuid", uuid)
    .eq("email", email)
    .single();
  if (error) return { status: false, message: error.message };

  return { status: true, user };
};
