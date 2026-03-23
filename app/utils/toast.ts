import { toast, type ExternalToast } from "vue-sonner";

type ToastType =
  | "default"
  | "loading"
  | "error"
  | "action"
  | "success"
  | "info"
  | "warning";

const options: ExternalToast = {
  duration: 5000,
  position: "top-right",
  important: true,
  richColors: true,
};

export const showToast = (message: string, type: ToastType) => {
  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "info":
      toast.info(message, options);
      break;
    case "warning":
      toast.warning(message, options);
      break;
    case "loading":
      toast.loading(message, options);
      break;
    default:
      toast(message, options);
  }
};

export const sharedToast = ({
  message,
  type = "default",
  title = "PPSMB Enugu Nexus",
}: {
  message: string;
  type?: ToastType;
  title?: string;
}) => {
  if (window.electronAPI) {
    window.electronAPI.sendNotification(title, message);
  } else {
    showToast(message, type);
  }
};
