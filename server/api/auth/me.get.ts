export default defineEventHandler(async (event) => {
  const query = event.node.req.originalUrl;
  const userContext = event.context.user;
  let token = getCookie(event, "access_token");
  const rememberMe = getCookie(event, "keepme");

  const toPath = query?.includes("pin");

  if (!userContext) {
    return {
      status: false,
      message: "Unauthorized",
      isAuthenticated: false,
    };
  }

  const user = await authMe(userContext.uuid, userContext.email);
  if (!user.status) {
    return {
      status: false,
      message: user.message,
      isAuthenticated: false,
    };
  }

  if (rememberMe) {
    token = createSession(event, user.user!, rememberMe);
  }

  return {
    status: true,
    message: "User validated",
    isAuthenticated: toPath ? false : true,
    ...user.user,
    token,
  };
});
