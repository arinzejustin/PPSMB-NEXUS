import axios from "axios";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { FileVersionInfo } from "../types";

let retryCount: number = 0;

async function getLatestVersion(): Promise<FileVersionInfo> {
  try {
    const response = await axios.get<FileVersionInfo>(
      "https://axiolot.com.ng/files/scanner-version.json",
      { timeout: 10000 },
    );
    return response.data;
  } catch (error) {
    throw new Error("Failed to fetch version information");
  }
}

async function getCurrentLocalVersion(
  filePath: string,
): Promise<string | null> {
  try {
    const versionFilePath = `${filePath}.version`;
    if (fs.existsSync(versionFilePath)) {
      return fs.readFileSync(versionFilePath, "utf8").trim();
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function saveVersionInfo(
  filePath: string,
  version: string,
): Promise<void> {
  const versionFilePath = `${filePath}.version`;
  fs.writeFileSync(versionFilePath, version, "utf8");
}

async function calculateChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);

    stream.on("data", (data) => hash.update(data));
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
  const response = await axios({
    url,
    method: "GET",
    responseType: "stream",
    timeout: 30000,
  });

  const tempFile = `${targetFile}.tmp`;
  const writer = fs.createWriteStream(tempFile);
  response.data.pipe(writer);

  await new Promise<void>((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", (err) => {
      fs.unlink(tempFile, () => {});
      reject(err);
    });
  });

  if (expectedChecksum) {
    const actualChecksum = await calculateChecksum(tempFile);
    if (actualChecksum !== expectedChecksum) {
      fs.unlinkSync(tempFile);
      throw new Error(
        `Checksum verification failed. Expected: ${expectedChecksum}, Got: ${actualChecksum}`,
      );
    }
  }

  if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
  }
  fs.renameSync(tempFile, targetFile);

  await saveVersionInfo(targetFile, version);
}

export async function ensureExternalFileExists(
  app: Electron.App,
): Promise<{ title: string; message: string; status: boolean } | void> {
  try {
    const appPath = app.getPath("userData");
    const targetFile = path.join(appPath, "scanner.exe");

    const latestVersionInfo = await getLatestVersion();
    const currentVersion = await getCurrentLocalVersion(targetFile);

    const fileExists = fs.existsSync(targetFile);
    const versionMatches = currentVersion === latestVersionInfo.version;

    if (fileExists && versionMatches) {
      retryCount = 0;
      return;
    }

    await downloadFile(
      latestVersionInfo.url,
      targetFile,
      latestVersionInfo.version,
      latestVersionInfo.checksum,
    );

    retryCount = 0;
    return {
      title: fileExists ? "Scanner Updated" : "Scanner Downloaded",
      message: fileExists
        ? `Scanner version ${latestVersionInfo.version} is ready.`
        : `Scanner `,
      status: true,
    };
  } catch (error) {
    retryCount++;

    if (retryCount < 3) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      return await ensureExternalFileExists(app);
    } else {
      retryCount = 0;
      return {
        title: "File Download Error",
        message: `Failed to download scanner.exe, app might not work normally.`,
        status: false,
      };
    }
  }
}
