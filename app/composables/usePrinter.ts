import { ref } from "vue";
import type { StoredPrintJob } from "~~/electron/types";

/** Print job configuration */
export type PrintJob = {
  id: string;
  html: string;
  printer?: string;
  silent?: boolean;
  name: string;
};

/** Print job status values */
export type PrintStatus =
  | "completed"
  | "queued"
  | "printing"
  | "pdf fallback"
  | "cancelled"
  | "failed";

/** Print progress status */
export type PrintProgress = {
  status: PrintStatus;
  jobId: string;
  name?: string;
  size?: string;
  queuedAt?: string;
  printer?: string;
  finishedAt?: string;
  //copies
};

const printProgress = ref<PrintProgress[]>([]);
const printers = ref<Electron.PrinterInfo[]>([]);
const selectedPrinter = ref<string | null>(null);
const printSilent = ref<boolean>(true);
const hasTriggerPrint = ref<boolean>(false);

/**
 * Composable for managing printer operations in Electron environment
 */
export const usePrinter = () => {
  /**
   * Load available printers from the system
   */
  const loadPrinters = async (): Promise<void> => {
    try {
      printers.value = await window.electronAPI!.getPrinters();
    } catch (error) {
      console.error("Failed to load printers:", error);
    }
  };

  /**
   * Save the selected printer preference
   */
  const savePrinter = async (printer: string): Promise<boolean> => {
    try {
      await window.electronAPI!.savePrinter(printer);
      selectedPrinter.value = printer;
      return true;
    } catch (error) {
      console.error("Failed to save printer:", error);
      return false;
    }
  };

  /**
   * Load the previously saved printer preference
   */
  const loadSelectedPrinter = async (): Promise<void> => {
    try {
      selectedPrinter.value = await window.electronAPI!.loadPrinter();
    } catch (error) {
      console.error("Failed to load selected printer:", error);
    }
  };

  /**
   * Queue a print job with the selected printer and silent mode as defaults
   */
  const queuePrint = async (job: PrintJob): Promise<boolean> => {
    try {
      const printJob: Required<PrintJob> = {
        printer: selectedPrinter.value ?? "",
        silent: printSilent.value,
        ...job,
      };
      await window.electronAPI!.queuePrint(printJob);
      hasTriggerPrint.value = true;
      return true;
    } catch (error) {
      console.error("Failed to queue print job:", error);
      return false;
    }
  };

  /**
   * Cancel a specific print job by ID
   */
  const cancelPrint = async (id: string): Promise<boolean> => {
    try {
      await window.electronAPI!.cancelPrint(id);
      return true;
    } catch (error) {
      console.error("Failed to cancel print job:", error);
      return false;
    }
  };

  /**
   * Reorder the print queue with the specified order of job IDs
   */
  const reorderPrint = async (ids: string[]): Promise<boolean> => {
    try {
      await window.electronAPI!.reorderPrint(ids);
      return true;
    } catch (error) {
      console.error("Failed to reorder print queue:", error);
      return false;
    }
  };

  /**
   * Re-print a completed job by its ID
   */
  const reprintJob = async (jobId: string): Promise<boolean> => {
    const job = printProgress.value.find((p) => p.jobId === jobId);
    if (!job) {
      return false;
    }
    job.status = "queued";
    job.queuedAt = new Date().toISOString();
    job.finishedAt = undefined;
    await window.electronAPI!.reprintJob(jobId);
    return true;
  };

  /**
   * Get the print history from the printer
   */
  const getPrintHistory = async (): Promise<StoredPrintJob[]> => {
    return await window.electronAPI!.getPrintHistory();
  };

  /**
   * Dismiss the print progress modal
   */
  const dismissPrintProgress = () => {
    hasTriggerPrint.value = false;
  };

  return {
    // State
    printers,
    printProgress,
    selectedPrinter,
    printSilent,
    hasTriggerPrint,

    // Methods
    loadPrinters,
    savePrinter,
    loadSelectedPrinter,
    queuePrint,
    cancelPrint,
    reorderPrint,
    reprintJob,
    dismissPrintProgress,
    getPrintHistory,
  };
};
