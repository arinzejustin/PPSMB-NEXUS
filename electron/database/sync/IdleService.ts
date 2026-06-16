export class IdleService {
  private lastActivityTimestamp: number = Date.now();
  private readonly IDLE_THRESHOLD_MS = 60000; // 60 seconds

  public updateActivity(): void {
    this.lastActivityTimestamp = Date.now();
  }

  public isIdle(): boolean {
    return (Date.now() - this.lastActivityTimestamp) > this.IDLE_THRESHOLD_MS;
  }

  public getIdleTime(): number {
    return Date.now() - this.lastActivityTimestamp;
  }
}

export const idleService = new IdleService();
