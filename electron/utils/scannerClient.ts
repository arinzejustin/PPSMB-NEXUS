import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import fs from "fs";
import { NotificationService } from "./notification.js";
import { getScannerPath, verifyScannerIntegrity } from "./scannerPath.js";
import { generateUUID as randomUUID } from "./uuid.js";
import log from "./logger.js";

interface PendingRequest {
  id: string;
  command: string;
  params?: Record<string, string>;
  resolve: (data: any) => void;
  reject: (err: any) => void;
}

export class ScannerClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private queue: PendingRequest[] = [];
  private isProcessing = false;

  constructor() {
    // We don't start the scanner immediately on boot anymore because
    // it needs to be downloaded by `ensureExternalFileExists` first.
    // Call startScanner() manually once you know the binary is there.
  }

  public startScanner() {
    if (this.process) return;

    const scannerPath = getScannerPath();

    if (!fs.existsSync(scannerPath)) {
      NotificationService.show(
        "Scanner",
        "Scanner app not found. Please ensure it is installed.",
      );
      return;
    }

    const integrity = verifyScannerIntegrity();
    if (!integrity.valid) {
      log.error(`[Scanner] Integrity check failed: ${integrity.reason}`);
      NotificationService.show(
        "Scanner Security Alert",
        `Scanner integrity check failed: ${integrity.reason}. Please restart the app to re-download.`,
      );
      return;
    }

    if (integrity.version) {
      log.info(`[Scanner] Starting verified scanner v${integrity.version}`);
    }

    this.process = spawn(scannerPath);

    this.process.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);
          log.info(`[Scanner]: ${response.message || response.status}`);
          this.handleResponse(response);
        } catch (error) {
          log.error("[Scanner Output Error] Failed to parse:", line);
        }
      }
    });

    this.process.stderr.on("data", (data) => {
      log.error(`[Scanner Error]: ${data.toString()}`);
    });

    this.process.on("close", (code) => {
      log.warn(`[Scanner] Process exited with code ${code}`);
      this.process = null;

      // Reject all pending requests since the process died
      for (const [, request] of this.pendingRequests) {
        request.reject(new Error("Scanner process exited unexpectedly."));
      }
      this.pendingRequests.clear();

      // Reject all queued requests
      for (const request of this.queue) {
        request.reject(new Error("Scanner process exited unexpectedly."));
      }
      this.queue = [];
      this.isProcessing = false;
    });
  }

  private handleResponse(response: any) {
    const id = response.id;

    if (id && this.pendingRequests.has(id)) {
      const request = this.pendingRequests.get(id)!;
      this.pendingRequests.delete(id);

      if (response.status === "error") {
        request.reject(new Error(response.message));
      } else {
        request.resolve(response);
      }

      this.processNext();
      return;
    }

    if (!id) {
      log.info("[Scanner] Received untracked response:", response.message);
    }
  }

  private processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const request = this.queue.shift()!;

    this.pendingRequests.set(request.id, request);

    const payload =
      JSON.stringify({
        id: request.id,
        command: request.command,
        params: request.params,
      }) + "\n";

    this.process!.stdin.write(payload);
  }

  public async sendCommand(
    command: string,
    params?: Record<string, string>,
  ): Promise<any> {
    if (!this.process) {
      this.startScanner();

      if (!this.process) {
        throw new Error(
          "Scanner process is not running and could not be started.",
        );
      }
    }

    return new Promise((resolve, reject) => {
      const id = randomUUID();

      const request: PendingRequest = {
        id,
        command,
        params,
        resolve,
        reject,
      };

      this.queue.push(request);

      // If nothing is currently being processed, kick off the queue
      if (!this.isProcessing) {
        this.processNext();
      }
    });
  }

  public kill() {
    if (this.process && !this.process.killed) {
      this.process.stdin.write(JSON.stringify({ command: "EXIT" }) + "\n");
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill();
        }
      }, 1000);
    }
  }
}

export const scannerClient = new ScannerClient();
