import { v4 as uuidv4 } from "uuid";
import jwt, { type SignOptions } from "jsonwebtoken";

/**
 * Generates and sets authentication cookies for the session.
 * Reusable logic for login and token refresh.
 */
export const createSession = (event: any) => {
  const config = useRuntimeConfig();
  const isDesktop = config.public.appType === "desktop";

  const sessionId = uuidv4();
  const jwtSecret = config.keySecret as string;

  const signOptions: SignOptions = {
    expiresIn: isDesktop ? "24h" : "4h",
    algorithm: "HS256",
    issuer: "AXIOLOT HUB™",
    jwtid: sessionId,
  };

  const token = jwt.sign({ sessionId }, jwtSecret, signOptions);

  const cookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    domain: (config.domainCookie as string) || undefined,
  };

  // Set SSID cookie
  setCookie(event, "ssid", sessionId, {
    ...cookieOptions,
    maxAge: 4 * 60 * 60,
  });

  // Set Auth Token cookie
  setCookie(event, "auth_token", token, {
    ...cookieOptions,
    maxAge: isDesktop ? 24 * 60 * 60 : 4 * 60 * 60,
  });

  // Security layer: _cfruid
  const cfruid = getCookie(event, "_cfruid");
  if (!cfruid) {
    const securityOptions: SignOptions = { ...signOptions, expiresIn: "24h" };
    const cfr = jwt.sign({ token }, token, securityOptions);

    setCookie(event, "_cfruid", cfr, {
      ...cookieOptions,
      maxAge: 24 * 60 * 60,
      sameSite: "strict",
      domain: "",
    });
  }

  return token;
};
