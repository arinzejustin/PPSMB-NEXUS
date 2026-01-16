import { validateStaffCredentials } from "@@/server/utils/supabase/login";
import { createSession } from "@@/server/utils/auth";
import type { LoginAuth } from "@/types/index";

export default defineEventHandler(async (event): Promise<LoginAuth | any> => {
  const body = await readBody(event);
  const { identifier, password } = body;

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
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: {
        status: false,
        message: authResult.message,
      },
    });
  }

  const token = createSession(event);

  return {
    ...authResult,
    token: token,
  };
});
