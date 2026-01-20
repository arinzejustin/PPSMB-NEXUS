export default defineEventHandler(async (event) => {
  deleteCookie(event, "access_token");
  deleteCookie(event, "KM");
  deleteCookie(event, "x_cid");

  return {
    status: true,
    message: "Logged out successfully.",
  };
});
