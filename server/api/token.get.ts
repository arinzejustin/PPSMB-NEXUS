import { v4 as ssid } from "uuid";
import jsonwebtoken, { type SignOptions } from "jsonwebtoken";
import type { TokenResponse } from "@/types/index";

export default defineEventHandler((e): TokenResponse => {
  const sessionId = ssid();
  const _cfruid = getCookie(e, "_cfruid");
  const config = useRuntimeConfig();
  const isDesktop = config.public.appType === "desktop";

  const signOptions: SignOptions = {
      expiresIn: isDesktop ? "24h" : "4h",
      algorithm: "HS256",
      issuer: "AXIOLOT HUB™",
      jwtid: sessionId,
    },
    cookieOptions = {
      maxAge: 60 * 60 * 4,
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure: true,
      domain: config.domainCookie as string,
    };
  const token = jsonwebtoken.sign(
    { sessionId },
    config.keySecret as string,
    signOptions
  );
  setCookie(e, "_AX-vsid", sessionId, cookieOptions);
  if (!_cfruid) {
    signOptions.expiresIn = "24h";
    const cfr = jsonwebtoken.sign({ token }, token, signOptions);
    setCookie(e, "_cfruid", cfr, {
      maxAge: 60 * 60 * 24,
      httpOnly: true,
      path: "/",
      sameSite: "strict",
      secure: true,
      domain: "",
    });
  }
  return {
    token: token,
  };
});
