import type { UserDetails, Auth } from "~/utils/types";

export interface LoginAuth extends Auth, ResponseStatus {
  user: UserDetails;
}

export interface ResponseStatus {
  status: boolean;
  message: string;
}

export interface TokenResponse {
  token: string;
}

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = Omit<Theme, "system">;

export interface NavItem {
  id: string;
  label: string;
  icon: any;
  to?: string;
  children?: NavItem[];
  badge?: number | string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSynced: Date;
  pendingChanges: number;
  isChecking: boolean;
  connectionStrength: "excellent" | "good" | "poor" | "offline";
}

export interface DashboardMetric {
  id: string;
  title: string;
  value: number | string;
  change: number | string;
  changePercent: string;
  changeType: "increase" | "decrease" | "neutral";
  changeLabel: string;
  icon: string;
  gradient: string;
  bgGradient: string;
  iconBg: string;
  iconColor: string;
  route?: string;
  badge?: string;
}

export interface ZoneData {
  id: string;
  name: string;
  code: string;
  administrator: string;
  teacherCount: number;
  schoolCount: number;
  studentCount: number;
  pendingItems: number;
  health: "healthy" | "attention" | "critical";
  lastSync: Date;
  growth: string;
}

export interface ActivityItem {
  id: string;
  type: "transfer" | "document" | "certification" | "user" | "mail" | "system";
  title: string;
  description: string;
  actor: string;
  timestamp: Date;
  entity?: string;
  status: "success" | "warning" | "error" | "info";
  icon?: string;
}

export interface AlertItem {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  actionLabel?: string;
  actionRoute?: string;
  dismissable: boolean;
  createdAt: Date;
}

export interface EventItem {
  id: string;
  title: string;
  date: string;
  type: "deadline" | "sync" | "report" | "training" | "maintenance";
  priority: "high" | "medium" | "low";
}

export interface ChartDataPoint {
  label: string;
  value: number;
}

export interface SystemHealthMetric {
  label: string;
  value: number;
  status: "healthy" | "warning" | "critical";
}

export interface DashboardData {
  metrics: DashboardMetric[];
  zones: ZoneData[];
  recentActivity: ActivityItem[];
  alerts: AlertItem[];
  upcomingEvents: EventItem[];
  charts: {
    teacherDistribution: ChartDataPoint[];
    documentTrends: ChartDataPoint[];
    certificationStatus: ChartDataPoint[];
  };
  systemHealth: SystemHealthMetric[];
  lastUpdated: Date;
}

export type WebSocketStatus = "CONNECTING" | "OPEN" | "CLOSING" | "CLOSED";

export interface WebSocketMessage<T = any> {
  type: string;
  channel?: string;
  data?: T;
  timestamp?: number;
}

export interface WebSocketOptions {
  url: string;
  /** JWT token for authentication - will be appended as ?token=xxx */
  token?: string;
  autoConnect?: boolean;
  autoReconnect?: boolean;
  maxRetries?: number;
  reconnectDelay?: number;
  maxReconnectDelay?: number;
  heartbeat?: boolean;
  heartbeatInterval?: number;
  heartbeatMessage?: string | object;
  pongTimeout?: number;
  protocols?: string | string[];
  onConnected?: (ws: WebSocket) => void;
  onDisconnected?: (ws: WebSocket, event: CloseEvent) => void;
  onError?: (ws: WebSocket, event: Event) => void;
  onMessage?: (ws: WebSocket, event: MessageEvent) => void;
}

export interface SubscriptionHandler<T = any> {
  (data: T, message: WebSocketMessage<T>): void;
}

export interface Subscription {
  type: string;
  channel?: string;
  handler: SubscriptionHandler;
}

export interface UseWebSocketClientReturn {
  isConnected: Ref<boolean>;
  status: Ref<WebSocketStatus>;
  lastError: Ref<Error | null>;
  lastMessage: Ref<WebSocketMessage | null>;
  send: <T = any>(message: WebSocketMessage<T>) => boolean;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  on: <T = any>(
    type: string,
    handler: SubscriptionHandler<T>,
    channel?: string,
  ) => () => void;
  once: <T = any>(
    type: string,
    handler: SubscriptionHandler<T>,
    channel?: string,
  ) => () => void;
  off: <T = any>(
    type: string,
    handler: SubscriptionHandler<T>,
    channel?: string,
  ) => void;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
  destroy: () => void;
}

export interface UseWebSocketClientOptions extends Omit<
  WebSocketOptions,
  "url"
> {
  url?: string;
}
