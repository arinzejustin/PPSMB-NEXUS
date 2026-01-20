import jwt from "jsonwebtoken";

export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const path = event.path;

  const publicPaths = ["/login", "/api/token", "/pin"];

  const isPublic = publicPaths.some((p) => path.startsWith(p));
  if (isPublic) {
    return;
  }

  const token = getCookie(event, "x_token") || getHeader(event, "x-auth-token"),
    ssid = getCookie(event, "ssid");
  if (!token) {
    return handleUnauthorized(event, "Invalid actor session.");
  }

  try {
    const secret = config.keySecret as string;
    const decodedToken: any = jwt.verify(token, secret, {
      issuer: "AXIOLOT HUB™",
    });

    if (decodedToken.ssid !== ssid) {
      return handleUnauthorized(event, "Invalid session token.");
    }
  } catch (error: any) {
    let message = "Invalid session token.";
    if (error.name === "TokenExpiredError") {
      message = "Your session has expired. Please restart app.";
    }

    return handleUnauthorized(event, message);
  }
});

function handleUnauthorized(event: any, message: string) {
  const isApiRequest = event.path.startsWith("/api/");

  if (isApiRequest) {
    throw createError({
      statusCode: 401,
      statusMessage: message,
      data: {
        status: false,
        message: message,
      },
    });
  } else {
    return sendRedirect(event, "/login");
  }
}
