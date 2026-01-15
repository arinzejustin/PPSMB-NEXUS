import type { UserDetails } from "~/shared/types";

export const userDetails = useState<UserDetails | null>(
  "userDetails",
  () => null
);
