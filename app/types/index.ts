import type { UserDetails, Auth } from "#shared/types";

export interface LoginAuth extends Auth, ResponseStatus {
  user: UserDetails;
}

export interface ResponseStatus {
  status: boolean;
  message: string;
}

export interface TokenResponse {
  token: string;
}

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = Omit<Theme, "system">;
