import { Notification, type NotificationConstructorOptions } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NotificationService {
  /**
   * Sends a standard system notification.
   * @param title The bold heading of the notification
   * @param body The main descriptive text
   * @param silent  Optional boolean to disable system sound
   */
  static show(title: string, body: string, silent: boolean = false) {
    if (!Notification.isSupported()) {
      console.error("System notifications are not supported on this platform.");
      return;
    }

    const options: NotificationConstructorOptions = {
      title,
      body,
      silent: silent,
      icon: path.join(__dirname, "../public/favicon.ico"),
    };

    const notification = new Notification(options);

    notification.on("click", () => {
      console.log(`User clicked notification: ${title}`);
    });

    notification.show();
  }
}
