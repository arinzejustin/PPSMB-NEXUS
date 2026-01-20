import { useSupabase } from "@@/server/utils/supabase/client";

export const setStaffPin = async (uuid: string, pin: string) => {
  const supabase = useSupabase();

  const { data, error } = await supabase
    .from("staff")
    .update({ pin })
    .eq("uuid", uuid)
    .select("*")
    .single();

  if (error || !data) {
    return {
      status: false,
      message: "Failed to set PIN.",
    };
  }

  return {
    status: true,
    message: "PIN set successfully.",
  };
};
