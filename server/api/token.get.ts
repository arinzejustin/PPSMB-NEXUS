import { v4 as uuidv4 } from "uuid";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { TokenResponse } from "@/types/index";

export default defineEventHandler((event): TokenResponse => {
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

  const token = jwt.sign({ ssid:sessionId }, jwtSecret, signOptions);

  const cookieOptions = {
    httpOnly: true,
    path: "/",
    sameSite: "lax" as const,
    secure: true,
    domain: (config.domainCookie as string) || undefined,
  };

  // 5. Set cookies
  setCookie(event, "ssid", sessionId, {
    ...cookieOptions,
    maxAge: 4 * 60 * 60,
  });

  setCookie(event, "x_token", token, {
    ...cookieOptions,
    maxAge: isDesktop ? 24 * 60 * 60 : 4 * 60 * 60,
  });

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

  return { token };
});
