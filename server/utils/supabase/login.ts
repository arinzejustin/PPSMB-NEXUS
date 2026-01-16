import { useSupabase } from "~~/server/utils/supabase/client";
import type { UserDetails, Auth } from "#shared/types";
import type { LoginAuth } from "@/types/index";

/**
 * Validates staff credentials against the Supabase 'staff' table.
 * It searches by either email or username and verifies the password.
 */
export const validateStaffCredentials = async (
  identifier: string,
  password: string
): Promise<LoginAuth | { status: false; message: string }> => {
  const supabase = useSupabase();

  const { data: user, error } = await supabase
    .from("staff")
    .select("*")
    .or(`email.eq."${identifier}",username.eq."${identifier}"`)
    .single();

  if (error || !user) {
    return {
      status: false,
      message: "Invalid credentials.",
    };
  }

  if (user.password !== password) {
    return {
      status: false,
      message: "Invalid credentials.",
    };
  }

  const userDetails: UserDetails = {
    uuid: user.id || user.uuid,
    name: user.name || user.full_name,
    email: user.email,
    department: user.department || "General",
    role: user.role || "Staff",
    lastLogin: Date.now(),
    deviceId: user.device_id || "",
    devices: user.devices || [],
  };

  const authData: Auth = {
    isAuthenticated: true,
    token: null,
    hasSetPin: !!user.pin,
    pin: user.pin || undefined,
  };

  return {
    status: true,
    message: "Login successful.",
    user: userDetails,
    ...authData,
  };
};
