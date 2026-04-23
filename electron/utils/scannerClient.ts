import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import path from "path";
import { app } from "electron";
import { NotificationService } from "./notification.js";
import log from "./logger.js";
import fs from "fs";

export class ScannerClient {
  private process: ChildProcessWithoutNullStreams | null = null;
  private pendingRequests: Map<
    string,
    { resolve: (data: any) => void; reject: (err: any) => void }
  > = new Map();

  constructor() {
    // We don't start the scanner immediately on boot anymore because
    // it needs to be downloaded by `ensureExternalFileExists` first.
    // Call startScanner() manually once you know the binary is there.
  }

  public startScanner() {
    if (this.process) return; // Already running

    // The scanner binary is downloaded to the userData folder by `ensureExternalFileExists`
    let scannerPath = path.join(app.getPath("userData"), "scanner.exe");

    // Fallback for local development if the binary is in the /scanner directory
    // and hasn't been downloaded to userData yet.
    if (!fs.existsSync(scannerPath) && !app.isPackaged) {
      scannerPath = path.join("C:\\Users\\chicy\\Desktop\\client-projects\\ppsmb-file-manager\\scanner", "scanner.exe");
    }

    if (!fs.existsSync(scannerPath)) {
      NotificationService.show(
        "Scanner",
        "Scanner app not found. Please ensure it is installed.",
      );
      return;
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
    });
  }

  private handleResponse(response: any) {
    if (this.pendingRequests.has("current")) {
      const { resolve, reject } = this.pendingRequests.get("current")!;
      this.pendingRequests.delete("current");

      if (response.status === "error") {
        reject(new Error(response.message));
      } else {
        resolve(response);
      }
    }
  }

  public async sendCommand(
    command: string,
    params?: Record<string, string>,
  ): Promise<any> {
    if (!this.process) {
      // Lazy auto-start if someone tries to use it.
      this.startScanner();

      if (!this.process) {
        throw new Error(
          "Scanner process is not running and could not be started.",
        );
      }
    }

    return new Promise((resolve, reject) => {
      // If there's already a pending request, reject it to avoid indefinite hang
      // In a production app, you might queue these up or add IDs to requests.
      if (this.pendingRequests.has("current")) {
        this.pendingRequests
          .get("current")!
          .reject(new Error("Another scanner operation was started."));
      }

      this.pendingRequests.set("current", { resolve, reject });

      const payload = JSON.stringify({ command, params }) + "\n";
      this.process!.stdin.write(payload);
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
