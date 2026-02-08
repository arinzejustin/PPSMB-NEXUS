import { v4 as uuidv4 } from "uuid";
import { usePrinter } from "@/composables/usePrinter";
import { showToast } from "@/utils/toast";

export const printHandler = async (
  content?: string,
  electronOptions?: {
    silent?: boolean;
    printer?: string;
    name?: string;
    size?: string;
  },
) => {
  if (typeof window === "undefined") return;

  if (!content) {
    showToast("No content to print", "error");
    return;
  }

  if (window.electronAPI) {
    const id = uuidv4();
    const name = electronOptions?.name || `Document-${id.split("-")[0]}`;
    const { printProgress, queuePrint } = usePrinter();
    printProgress.value.push({
      status: "Queued",
      jobId: id,
      name,
      size: electronOptions?.size || "Unknown",
      date: new Date().toISOString(),
    });

    return await queuePrint({
      id,
      html: content,
      ...electronOptions,
      name,
    });
  }

  try {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showToast("Popup blocked. Please allow popups to print.", "error");
      return;
    }

    const doc = printWindow.document;
    doc.open();
    doc.documentElement.innerHTML = content;
    doc.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    return true;
  } catch (error) {
    showToast("Failed to print", "error");
  }
};
