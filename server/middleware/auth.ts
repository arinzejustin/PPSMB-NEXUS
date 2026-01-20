import jwt from "jsonwebtoken";

/**
 * API Authentication Middleware
 * Ensures that protected API requests are made by a logged-in user.
 * It ignores non-API routes and public API endpoints.
 */
export default defineEventHandler((event) => {
  const path = event.path;

  if (!path.startsWith("/api/")) {
    return;
  }

  const publicApiPaths = ["/api/token", "/api/auth/login"];
  if (publicApiPaths.some((p) => path.startsWith(p))) {
    return;
  }

  const config = useRuntimeConfig();

  const token =
    getCookie(event, "access_token") ||
    getHeader(event, "Authorization")?.replace("Bearer ", "");
  const contextId = getCookie(event, "x_cid");

  if (!token || !contextId) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: {
        status: false,
        message: "Invalid or incomplete session. Please login again.",
      },
    });
  }

  try {
    const secret = config.keySecret;

    const decoded: any = jwt.verify(token, secret, {
      issuer: "AXIOLOT HUB™",
    });

    if (!decoded.user || !decoded.user.uuid) {
      throw new Error("Invalid session structure.");
    }

    if (decoded.cid !== contextId) {
      throw new Error("Session mismatch detection.");
    }

    event.context.user = decoded.user;
  } catch (error: any) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: {
        status: false,
        message: error.message || "Invalid or expired session token.",
      },
    });
  }
});
