import path from "path";
import fs from "fs";
import crypto from "crypto";
import { app } from "electron";
import log from "./logger.js";

export const SCANNER_NAME = "scanner.exe";

/**
 * Returns the path to scanner.exe inside userData.
 * This is the single source of truth — the scanner always runs from userData.
 */
export function getScannerPath(): string {
  return path.join(app.getPath("userData"), SCANNER_NAME);
}

/**
 * Ensures the scanner binary exists in userData.
 * If it's missing (first launch), copies it from the bundled resources (packaged)
 * or from the project's scanner directory (development).
 */
export function ensureScannerInUserData(): void {
  const target = getScannerPath();

  if (fs.existsSync(target)) {
    return; // Already in place
  }

  const userDataDir = path.dirname(target);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }

  // Packaged: copy from extraFiles in resources
  if (app.isPackaged) {
    const bundledPath = path.join(process.resourcesPath, SCANNER_NAME);
    if (fs.existsSync(bundledPath)) {
      fs.copyFileSync(bundledPath, target);
      log.info(`[Scanner] Copied bundled scanner to userData: ${target}`);
      return;
    }
  }

  // Development: copy from project's scanner directory
  if (!app.isPackaged) {
    const devPath = path.join(process.cwd(), "scanner", SCANNER_NAME);
    if (fs.existsSync(devPath)) {
      fs.copyFileSync(devPath, target);
      log.info(`[Scanner] Copied dev scanner to userData: ${target}`);
      return;
    }
  }

  log.warn("[Scanner] No scanner binary found to copy into userData.");
}

// ─── Integrity Verification ─────────────────────────────────────────────────

interface ScannerVersionInfo {
  version: string;
  checksum: string; // sha256 hex
}

/**
 * Reads the stored version info (saved alongside scanner.exe by the downloader).
 */
function getStoredVersionInfo(): ScannerVersionInfo | null {
  const versionFile = `${getScannerPath()}.version`;
  const checksumFile = `${getScannerPath()}.sha256`;

  try {
    const version = fs.existsSync(versionFile)
      ? fs.readFileSync(versionFile, "utf8").trim()
      : null;

    const checksum = fs.existsSync(checksumFile)
      ? fs.readFileSync(checksumFile, "utf8").trim()
      : null;

    if (!version || !checksum) return null;

    return { version, checksum };
  } catch {
    return null;
  }
}

/**
 * Computes the SHA-256 hash of a file.
 */
function calculateChecksumSync(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(fileBuffer).digest("hex");
}

/**
 * Saves the checksum alongside the scanner binary in userData.
 * Called after a successful download or copy.
 */
export function saveScannerChecksum(checksum: string): void {
  const checksumFile = `${getScannerPath()}.sha256`;
  fs.writeFileSync(checksumFile, checksum, "utf8");
}

/**
 * Verifies the scanner binary's integrity before it is executed.
 *
 * Checks:
 * 1. The binary file exists
 * 2. A stored version file exists
 * 3. A stored checksum file exists
 * 4. The actual SHA-256 of the binary matches the stored checksum
 *
 * Returns an object with `valid` and diagnostic info.
 */
export function verifyScannerIntegrity(): {
  valid: boolean;
  version: string | null;
  reason?: string;
} {
  const scannerPath = getScannerPath();

  if (!fs.existsSync(scannerPath)) {
    return { valid: false, version: null, reason: "Scanner binary not found." };
  }

  const info = getStoredVersionInfo();

  // In development or first-copy scenarios where we don't have
  // a checksum yet, allow it to run but log a warning.
  if (!info) {
    log.warn(
      "[Scanner] No version/checksum info found — skipping integrity check.",
    );
    return { valid: true, version: null, reason: "No checksum available." };
  }

  const actualChecksum = calculateChecksumSync(scannerPath);

  if (actualChecksum !== info.checksum) {
    log.error(
      `[Scanner] Integrity check FAILED. Expected: ${info.checksum}, Got: ${actualChecksum}`,
    );
    return {
      valid: false,
      version: info.version,
      reason: `Checksum mismatch. Expected ${info.checksum}, got ${actualChecksum}.`,
    };
  }

  log.info(
    `[Scanner] Integrity verified — version ${info.version}, sha256: ${actualChecksum}`,
  );
  return { valid: true, version: info.version };
}
