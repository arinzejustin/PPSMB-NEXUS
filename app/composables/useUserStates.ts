import type { UserDetails, Auth } from "~/utils/types";

export const useUser = () =>
  useState<(UserDetails & Auth) | null>("user", () => null);

export const useToken = () => useState<string | null>("token", () => null);
