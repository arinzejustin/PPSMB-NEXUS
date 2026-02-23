import { hashSync } from "@node-rs/bcrypt";
import { useSupabase } from "@@/server/utils/supabase/client";
import { createSession } from "@@/server/utils/createSession";
import type { LoginAuth, ResponseStatus } from "@/types/index";
import type { UserDetails, Auth } from "~/utils/types";

/**
 * POST /api/auth/register
 * Creates a new staff account in Supabase.
 * For presentation / demo purposes only.
 */
export default defineEventHandler(
  async (event): Promise<LoginAuth | ResponseStatus> => {
    try {
      const body = await readBody(event);
      const { name, email, username, password, role, department } = body;

      if (!name || !email || !username || !password || !role || !department) {
        throw createError({
          statusCode: 400,
          statusMessage: "Bad Request",
          data: {
            status: false,
            message: "All fields are required.",
          },
        });
      }

      if (password.length < 6) {
        return {
          status: false,
          message: "Password must be at least 6 characters.",
        };
      }

      const supabase = useSupabase();

      // Check if user already exists
      const { data: existing } = await supabase
        .from("staff")
        .select("uuid")
        .or(
          `email.ilike."${email.trim().toLowerCase()}",username.ilike."${username.trim().toLowerCase()}"`,
        )
        .single();

      if (existing) {
        return {
          status: false,
          message: "A user with this email or username already exists.",
        };
      }

      // Hash password
      const hashedPassword = hashSync(password, 10);

      // Insert into Supabase
      const { data: newUser, error } = await supabase
        .from("staff")
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          username: username.trim().toLowerCase(),
          password: hashedPassword,
          role: role,
          department: department,
        })
        .select("*")
        .single();

      if (error || !newUser) {
        return {
          status: false,
          message: error?.message || "Failed to create account.",
        };
      }

      const userDetails: UserDetails = {
        uuid: newUser.uuid,
        name: newUser.name,
        email: newUser.email,
        department: newUser.department || "General",
        role: newUser.role || "Staff",
        lastLogin: Date.now(),
        deviceId: newUser.device_id || "",
        devices: newUser.devices || [],
        username: newUser.username || "",
      };

      const authData: Auth = {
        isAuthenticated: false,
        token: null,
        hasSetPin: false,
      };

      const token = createSession(event, userDetails, "false");

      return {
        status: true,
        message: "Registration successful.",
        user: userDetails,
        ...authData,
        token,
      };
    } catch (error: any) {
      return {
        status: false,
        message: error.data?.message || error.message || "Registration failed.",
      };
    }
  },
);
