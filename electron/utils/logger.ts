import log from "electron-log";
import path from "node:path";
import { app } from "electron";

const isDev = !app.isPackaged;

log.transports.file.resolvePathFn = () =>
  path.join(app.getPath("userData"), "logs", "main.log");

log.transports.file.level = "info";
log.transports.console.level = isDev ? "debug" : false;

export default log;
