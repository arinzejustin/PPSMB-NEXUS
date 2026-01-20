import { v4 as uuidv4 } from "uuid";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { UserDetails } from "#shared/types";
import type { H3Event } from "h3";

/**
 * Generates and sets authentication cookies for the session.
 * Reusable logic for login and token refresh.
 */
export const createSession = (
  event: H3Event,
  user: UserDetails,
  rememberMe = "",
) => {
  const config = useRuntimeConfig();
  const isDesktop = config.public.appType === "desktop";

  const sessionId = uuidv4();
  const contextId = uuidv4();
  const jwtSecret = config.keySecret as string;

  const maxAge = isDesktop
    ? 6 * 30 * 24 * 60 * 60
    : rememberMe
      ? 2 * 24 * 60 * 60
      : 4 * 60 * 60;
  const expiresIn = isDesktop ? "180d" : rememberMe ? "2d" : "4h";

  const signOptions: SignOptions = {
    expiresIn,
    algorithm: "HS256",
    issuer: "AXIOLOT HUB™",
    jwtid: sessionId,
  };

  const payload = {
    sessionId,
    cid: contextId,
    user: {
      uuid: user.uuid,
      email: user.email,
      username: user.username,
      name: user.name,
      deviceId: user.deviceId,
    },
  };

  const token = jwt.sign(payload, jwtSecret, signOptions);

  const cookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
    domain: config.domainCookie || undefined,
  };

  if (rememberMe) {
    setCookie(event, "KM", "Y", {
      ...cookieOptions,
      maxAge: maxAge,
    });
  }

  setCookie(event, "access_token", token, {
    ...cookieOptions,
    maxAge: maxAge,
  });

  setCookie(event, "x_cid", contextId, {
    ...cookieOptions,
    maxAge: maxAge,
  });

  return token;
};
