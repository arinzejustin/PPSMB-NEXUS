import type { UserDetails, Auth } from "~/shared/types";

export interface LoginAuth extends Omit<Auth, "pin">, ResponseStatus {
  user: UserDetails;
}

export interface ResponseStatus {
  status: boolean;
  message: string;
}
