import jwt from "jsonwebtoken";

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const path = event.path;

  const publicPaths = ["/login", "/api/token", "/pin"];

  const isPublic = publicPaths.some((p) => path.startsWith(p));
  if (isPublic) {
    return;
  }

  const token =
    getCookie(event, "x_token") ||
    getHeader(event, "x-auth-token")?.replace("Bearer ", "");
  if (!token) {
    return handleUnauthorized(
      event,
      "Authentication required: No session token found."
    );
  }

  try {
    const secret = config.keySecret as string;
    jwt.verify(token, secret);
  } catch (error: any) {
    let message = "Invalid or expired session token.";
    if (error.name === "TokenExpiredError") {
      message = "Your session has expired. Please log in again.";
    }

    return handleUnauthorized(event, message);
  }
});

function handleUnauthorized(event: any, message: string) {
  const isApiRequest = event.path.startsWith("/api/");

  if (isApiRequest) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: {
        status: false,
        message: message,
      },
    });
  } else {
    return sendRedirect(event, "/login");
  }
}
