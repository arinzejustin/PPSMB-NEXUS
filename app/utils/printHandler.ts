import { v4 as uuidv4 } from "uuid";
import { usePrinter } from "@/composables/usePrinter";
import { showToast } from "@/utils/toast";
import {
  convertToPrintHTML,
  detectContentType,
  type PrintContentType,
} from "@/utils/contentConverter";

export interface PrintOptions {
  silent?: boolean;
  printer?: string;
  name?: string;
  size?: string;
  contentType?: PrintContentType;
}

/**
 * Universal print handler that supports HTML, CSV, and Excel content.
 *
 * For HTML: pass the HTML string directly as `content`.
 * For CSV: pass the CSV text string as `content` and set `contentType: 'csv'`
 *          (or let it auto-detect from the `name` extension).
 * For Excel: pass the ArrayBuffer as `content` and set `contentType: 'excel'`
 *            (or let it auto-detect from the `name` extension).
 */
export const printHandler = async (
  content?: string | ArrayBuffer,
  electronOptions?: PrintOptions,
) => {
  if (typeof window === "undefined") return;

  if (!content) {
    showToast("No content to print", "error");
    return;
  }

  // Determine the content type
  const contentType: PrintContentType =
    electronOptions?.contentType ||
    detectContentType(electronOptions?.name) ||
    "html";

  // Convert content to HTML for printing
  let htmlContent: string;
  try {
    htmlContent = convertToPrintHTML(
      content,
      contentType,
      electronOptions?.name,
    );
  } catch (err: any) {
    showToast(err.message || "Failed to convert content for printing", "error");
    return;
  }

  if (window.electronAPI) {
    const id = uuidv4();
    const name = electronOptions?.name || `Document-${id.split("-")[0]}`;
    const { printProgress, queuePrint } = usePrinter();
    printProgress.value.push({
      status: "queued",
      jobId: id,
      name,
      size: electronOptions?.size || "Unknown",
      queuedAt: new Date().toISOString(),
      printer: electronOptions?.printer,
    });

    return await queuePrint({
      id,
      html: htmlContent,
      contentType,
      ...electronOptions,
      name,
    });
  }

  // Fallback for browser (non-Electron) environment
  try {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      showToast("Popup blocked. Please allow popups to print.", "error");
      return;
    }

    const doc = printWindow.document;
    doc.open();
    doc.documentElement.innerHTML = htmlContent;
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
