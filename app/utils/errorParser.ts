export default function errorParser(error: Error) {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    showToast("Network error. Please check your internet connection.", "error");
    return;
  }

  if (error instanceof Error && error.name === "AbortError") {
    showToast("Request timed out. Please try again.", "error");
    return;
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred. Please try again.";
  showToast(errorMessage, "error");
}
