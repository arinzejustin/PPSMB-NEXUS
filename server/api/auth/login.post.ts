import { validateStaffCredentials } from "@@/server/utils/supabase/login";
import { createSession } from "@@/server/utils/createSession";
import type { LoginAuth, ResponseStatus } from "@/types/index";

export default defineEventHandler(
  async (event): Promise<LoginAuth | ResponseStatus> => {
    try {
      const body = await readBody(event);
      const { identifier, password, rememberMe } = body;

      if (!identifier || !password) {
        throw createError({
          statusCode: 400,
          statusMessage: "Bad Request",
          data: {
            status: false,
            message: "Credentials are required.",
          },
        });
      }

      const authResult = await validateStaffCredentials(identifier, password);

      if (!authResult.status) {
        return { status: false, message: authResult.message };
      }

      const token = createSession(event, authResult.user, String(rememberMe));

      return {
        ...authResult,
        token: token,
      };
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Internal Server Error",
      };
    }
  },
);
