import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import type { FileVersionInfo } from "../types";

import { getScannerPath, ensureScannerInUserData, saveScannerChecksum } from "./scannerPath.js";

const VERSION_URL = "https://api.axiolot.com.ng/ppsmb-enugu/scanner/version";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

async function getLatestVersion(): Promise<FileVersionInfo> {
  const { data } = await axios.get<FileVersionInfo>(VERSION_URL, {
    timeout: 10_000,
  });
  return data;
}

function getCurrentLocalVersion(targetFile: string): string | null {
  const versionFile = `${targetFile}.version`;
  try {
    return fs.existsSync(versionFile)
      ? fs.readFileSync(versionFile, "utf8").trim()
      : null;
  } catch {
    return null;
  }
}

function saveVersionInfo(targetFile: string, version: string): void {
  fs.writeFileSync(`${targetFile}.version`, version, "utf8");
}

async function calculateChecksum(filePath: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  const stream = fs.createReadStream(filePath);

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

async function downloadFile(
  url: string,
  targetFile: string,
  version: string,
  expectedChecksum?: string,
): Promise<void> {
  const tempFile = `${targetFile}.tmp`;

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 30_000,
  });

  await pipeline(response.data, fs.createWriteStream(tempFile));

  let actualChecksum: string | undefined;

  if (expectedChecksum) {
    actualChecksum = await calculateChecksum(tempFile);
    if (actualChecksum !== expectedChecksum) {
      fs.unlinkSync(tempFile);
      throw new Error("Checksum verification failed");
    }
  }

  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
  }

  fs.renameSync(tempFile, targetFile);
  saveVersionInfo(targetFile, version);

  // Persist the checksum for runtime integrity verification
  const checksumToSave = actualChecksum ?? await calculateChecksum(targetFile);
  saveScannerChecksum(checksumToSave);
}

export async function ensureExternalFileExists(
  app: Electron.App,
): Promise<{ title: string; message: string; status: boolean } | void> {
  // Copy the bundled/dev scanner into userData if it's not there yet
  ensureScannerInUserData();

  const targetFile = getScannerPath();
  const appPath = path.dirname(targetFile);

  fs.mkdirSync(appPath, { recursive: true });

  const fileExists = fs.existsSync(targetFile);
  const isFirstDownload = !fileExists;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const latest = await getLatestVersion();
      const currentVersion = getCurrentLocalVersion(targetFile);

      const versionMatches = currentVersion === latest.version;

      if (fileExists && versionMatches) {
        return;
      }

      await downloadFile(
        latest.url,
        targetFile,
        latest.version,
        latest.checksum,
      );

      return {
        title: fileExists ? "Scanner Updated" : "Scanner Downloaded",
        message: `Scanner version ${latest.version} is ready.`,
        status: true,
      };
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        if (isFirstDownload) {
          return {
            title: "Scanner Download Error",
            message:
              "Failed to download scanner.exe. The application may not function correctly.",
            status: false,
          };
        }
        return;
      }
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}
