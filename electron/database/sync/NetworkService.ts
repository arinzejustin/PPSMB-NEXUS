import axios from "axios";
import { app } from "electron";
import { storeHelper } from "../../store/store.js";

export class NetworkService {
  public async checkConnection(): Promise<boolean> {
    try {
      await axios.head("https://api.axiolot.com.ng/health", { timeout: 5000 });
      return true;
    } catch {
      try {
        await axios.head("https://api.axiolot.com.ng", { timeout: 5000 });
        return true;
      } catch {
        return false;
      }
    }
  }

  public getNitroPort(): number | null {
    if (!app.isPackaged) return 3000;
    return storeHelper.get("nitroPort") || null;
  }
}

export const networkService = new NetworkService();
