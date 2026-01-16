import jwt from "jsonwebtoken";

/**
 * Global server middleware to validate session tokens.
 * It checks for a valid JWT in cookies or Authorization header.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const path = event.path;

  // 1. Define public paths that don't require authentication
  const publicPaths = ["/login", "/api/auth/login", "/api/token"];
  
  // Check if current path is public
  const isPublic = publicPaths.some((p) => path.startsWith(p));
  if (isPublic) {
    return;
  }

  // 2. Extract token from cookie or Authorization header
  const token = getCookie(event, "auth_token") || 
                getHeader(event, "Authorization")?.replace("Bearer ", "");

  // 3. Handle missing token
  if (!token) {
    return handleUnauthorized(event, "Authentication required: No session token found.");
  }

  // 4. Validate the token
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

/**
 * Helper to handle unauthorized requests based on request type (API vs Page).
 */
function handleUnauthorized(event: any, message: string) {
  const isApiRequest = event.path.startsWith("/api/");

  if (isApiRequest) {
    throw createError({
      statusCode: 401,
      statusMessage: "Unauthorized",
      data: {
        success: false,
        message: message,
      },
    });
  } else {
    return sendRedirect(event, "/login");
  }
}
