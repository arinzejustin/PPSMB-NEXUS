import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import type { FileVersionInfo } from "../types";

const VERSION_URL = "https://api.axiolot.com.ng/ppsmb/scanner/version";
const SCANNER_NAME = "scanner.exe";
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

  if (expectedChecksum) {
    const actualChecksum = await calculateChecksum(tempFile);
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
}

export async function ensureExternalFileExists(
  app: Electron.App,
): Promise<{ title: string; message: string; status: boolean } | void> {
  const appPath = app.getPath("userData");
  const targetFile = path.join(appPath, SCANNER_NAME);

  fs.mkdirSync(appPath, { recursive: true });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const latest = await getLatestVersion();
      const currentVersion = getCurrentLocalVersion(targetFile);

      const fileExists = fs.existsSync(targetFile);
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
        return {
          title: "File Download Error",
          message:
            "Failed to download scanner.exe. The application may not function correctly.",
          status: false,
        };
      }

      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}
