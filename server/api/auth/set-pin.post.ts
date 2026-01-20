import { setStaffPin } from "@@/server/utils/supabase/setPin";

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const userContext = event.context.user;
    const { pin, uuid } = body;

    if (!userContext || !userContext.uuid || userContext.uuid !== uuid) {
      return {
        status: false,
        message: "Unauthorized: You can't set another PIN.",
      };
    }

    if (!pin) {
      return {
        status: false,
        message: "PIN is required.",
      };
    }

    const result = await setStaffPin(userContext.uuid, pin);
    return result;
  } catch (error: any) {
    return {
      status: false,
      message: error.message || "An error occurred while setting the PIN.",
    };
  }
});
