import { ref, watch, computed, type Ref } from "vue";
import {
  useWebSocket as useVueWebSocket,
  type UseWebSocketReturn,
} from "@vueuse/core";
import { useRuntimeConfig } from "#imports";
import type {
  WebSocketStatus,
  WebSocketMessage,
  WebSocketOptions,
  Subscription,
  SubscriptionHandler,
  UseWebSocketClientReturn,
  UseWebSocketClientOptions,
} from "@/types";

export class WebSocketClient {
  private wsInstance: UseWebSocketReturn<any> | null = null;
  private subscriptions: Map<string, Subscription[]> = new Map();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = ref(0);
  private _isConnected = ref(false);
  private _status = ref<WebSocketStatus>("CLOSED");
  private _lastError = ref<Error | null>(null);
  private _lastMessage = ref<WebSocketMessage | null>(null);
  private _messageQueue: WebSocketMessage[] = [];
  private _url: string;
  private options: Required<
    Omit<
      WebSocketOptions,
      | "token"
      | "protocols"
      | "onConnected"
      | "onDisconnected"
      | "onError"
      | "onMessage"
    >
  > &
    Pick<
      WebSocketOptions,
      "protocols" | "onConnected" | "onDisconnected" | "onError" | "onMessage"
    >;

  constructor(options: WebSocketOptions) {
    // Build URL with auth token if provided
    let url = options.url;
    if (options.token) {
      const separator = url.includes("?") ? "&" : "?";
      url = `${url}${separator}token=${encodeURIComponent(options.token)}`;
    }
    this._url = url;

    this.options = {
      autoConnect: true,
      autoReconnect: true,
      maxRetries: 10,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      heartbeat: true,
      heartbeatInterval: 30000,
      heartbeatMessage: { type: "ping" },
      pongTimeout: 10000,
      ...options,
    };

    if (typeof window !== "undefined" && this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to the WebSocket server
   */
  public connect(): void {
    if (typeof window === "undefined") return;
    console.log(this.wsInstance, this._status.value)
    if (this.wsInstance && this._status.value === "OPEN") return;

    this._status.value = "CONNECTING";

    this.wsInstance = useVueWebSocket(this._url, {
      autoReconnect: this.options.autoReconnect
        ? {
            retries: this.options.maxRetries,
            delay: this.options.reconnectDelay,
            onFailed: () => {
              console.error(
                `WebSocket: Failed to reconnect after ${this.options.maxRetries} attempts`,
              );
              this._lastError.value = new Error(
                "Max reconnection attempts reached",
              );
            },
          }
        : false,
      heartbeat: this.options.heartbeat
        ? {
            message:
              typeof this.options.heartbeatMessage === "string"
                ? this.options.heartbeatMessage
                : JSON.stringify(this.options.heartbeatMessage),
            interval: this.options.heartbeatInterval,
            pongTimeout: this.options.pongTimeout,
          }
        : false,
      protocols: this.options.protocols
        ? Array.isArray(this.options.protocols)
          ? this.options.protocols
          : [this.options.protocols]
        : undefined,
      immediate: true,
      onConnected: (ws) => {
        this._isConnected.value = true;
        this._status.value = "OPEN";
        this.reconnectAttempts.value = 0;
        this.flushMessageQueue();
        this.options.onConnected?.(ws);
      },
      onDisconnected: (ws, event) => {
        this._isConnected.value = false;
        this._status.value = "CLOSED";
        console.log("WebSocket: Disconnected", event.reason || "");
        this.options.onDisconnected?.(ws, event);
      },
      onError: (ws, event) => {
        this._lastError.value = new Error("WebSocket error");
        console.error("WebSocket: Error occurred", event);
        this.options.onError?.(ws, event);
      },
      onMessage: (ws, event) => {
        this.handleMessage(event);
        this.options.onMessage?.(ws, event);
      },
    });

    watch(
      () => this.wsInstance?.status.value,
      (newStatus) => {
        if (newStatus) {
          this._status.value = newStatus as WebSocketStatus;
        }
      },
    );
  }

  /**
   * Disconnect from the WebSocket server
   */
  public disconnect(): void {
    this.wsInstance?.close();
    // Safety check - ensure refs are valid before setting
    if (this._isConnected && typeof this._isConnected === "object") {
      this._isConnected.value = false;
    }
    if (this._status && typeof this._status === "object") {
      this._status.value = "CLOSED";
    }
    this.clearHeartbeat();
  }

  /**
   * Reconnect to the WebSocket server
   */
  public reconnect(): void {
    this.disconnect();
    setTimeout(() => this.connect(), 100);
  }

  /**
   * Send a message to the WebSocket server
   */
  public send<T = any>(message: WebSocketMessage<T>): boolean {
    const msg: WebSocketMessage<T> = {
      ...message,
      timestamp: Date.now(),
    };

    const serialized = JSON.stringify(msg);

    if (this._isConnected.value && this.wsInstance) {
      this.wsInstance.send(serialized);
      return true;
    } else {
      this._messageQueue.push(msg);
      console.warn("WebSocket: Message queued (not connected)", msg.type);
      return false;
    }
  }

  /**
   * Send raw string message
   */
  public sendRaw(message: string): boolean {
    if (this._isConnected.value && this.wsInstance) {
      this.wsInstance.send(message);
      return true;
    }
    return false;
  }

  /**
   * Subscribe to a specific channel
   */
  public subscribe(channel: string): void {
    this.send({
      type: "subscribe",
      channel,
    });
  }

  /**
   * Unsubscribe from a channel
   */
  public unsubscribe(channel: string): void {
    this.send({
      type: "unsubscribe",
      channel,
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage =
        typeof event.data === "string" ? JSON.parse(event.data) : event.data;

      this._lastMessage.value = message;

      if (message.type === "pong") return;

      const key = message.channel
        ? `${message.type}:${message.channel}`
        : message.type;
      const generalKey = message.type;

      const notifySubscribers = (subscriptionKey: string) => {
        const subs = this.subscriptions.get(subscriptionKey);
        if (subs) {
          subs.forEach((sub) => {
            try {
              sub.handler(message.data, message);
            } catch (err: any) {
              console.error("WebSocket: Subscription handler error", err);
            }
          });
        }
      };

      if (message.channel) {
        notifySubscribers(key);
      }
      notifySubscribers(generalKey);
      notifySubscribers("*");
    } catch (err: any) {
      console.error("WebSocket: Failed to parse message", err, event.data);
    }
  }

  /**
   * Flush queued messages after reconnection
   */
  private flushMessageQueue(): void {
    if (this._messageQueue.length > 0) {
      console.log(
        `WebSocket: Flushing ${this._messageQueue.length} queued messages`,
      );
      const queue = [...this._messageQueue];
      this._messageQueue = [];
      queue.forEach((msg) => this.send(msg));
    }
  }

  /**
   * Register a message handler for a specific type/channel
   * @param type Message type to listen for (use "*" for all messages)
   * @param handler Callback function
   * @param channel Optional channel filter
   * @returns Unsubscribe function
   */
  public on<T = any>(
    type: string,
    handler: SubscriptionHandler<T>,
    channel?: string,
  ): () => void {
    const key = channel ? `${type}:${channel}` : type;
    const subscription: Subscription = { type, channel, handler };

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, []);
    }
    this.subscriptions.get(key)!.push(subscription);

    return () => this.off(type, handler, channel);
  }

  /**
   * Remove a message handler
   */
  public off<T = any>(
    type: string,
    handler: SubscriptionHandler<T>,
    channel?: string,
  ): void {
    const key = channel ? `${type}:${channel}` : type;
    const subs = this.subscriptions.get(key);

    if (subs) {
      const index = subs.findIndex((sub) => sub.handler === handler);
      if (index !== -1) {
        subs.splice(index, 1);
      }
      if (subs.length === 0) {
        this.subscriptions.delete(key);
      }
    }
  }

  /**
   * Register a one-time message handler
   */
  public once<T = any>(
    type: string,
    handler: SubscriptionHandler<T>,
    channel?: string,
  ): () => void {
    const wrappedHandler: SubscriptionHandler<T> = (data, message) => {
      this.off(type, wrappedHandler, channel);
      handler(data, message);
    };
    return this.on(type, wrappedHandler, channel);
  }

  /**
   * Remove all handlers for a type/channel
   */
  public removeAllListeners(type?: string, channel?: string): void {
    if (!type) {
      this.subscriptions.clear();
    } else {
      const key = channel ? `${type}:${channel}` : type;
      this.subscriptions.delete(key);
    }
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer);
      this.pongTimeoutTimer = null;
    }
  }

  /** Whether the WebSocket is currently connected */
  get isConnected(): boolean {
    return this._isConnected.value;
  }

  /** Current connection status */
  get status(): WebSocketStatus {
    return this._status.value;
  }

  /** Last error that occurred */
  get lastError(): Ref<Error | null> {
    return this._lastError;
  }

  /** Last received message */
  get lastMessage(): Ref<WebSocketMessage | null> {
    return this._lastMessage;
  }

  /** Number of queued messages */
  get queuedMessages(): number {
    return this._messageQueue.length;
  }

  /** Current URL */
  get url(): string {
    return this._url;
  }

  /**
   * Cleanup and destroy the WebSocket client
   */
  public destroy(): void {
    this.disconnect();
    this.removeAllListeners();
    this._messageQueue = [];
    this.wsInstance = null;
  }
}

const wsInstances: Map<string, WebSocketClient> = new Map();

/**
 * Get or create a WebSocket client instance
 * Uses a singleton pattern per BASE URL (ignoring token) to prevent duplicate connections
 */
export function getWebSocketClient(options: WebSocketOptions): WebSocketClient {
  // Use base URL without token as the key to ensure singleton per endpoint
  const baseUrl = options.url.split('?')[0] as string;
  
  // If we already have a connection to this endpoint, return it
  const existing = wsInstances.get(baseUrl);
  if (existing) {
    return existing;
  }

  // Create new connection
  const client = new WebSocketClient(options);
  wsInstances.set(baseUrl, client);
  return client;
}

/**
 * Remove a WebSocket client instance
 */
export function removeWebSocketClient(url: string): void {
  const client = wsInstances.get(url);
  if (client) {
    client.destroy();
    wsInstances.delete(url);
  }
}

/**
 * Remove all WebSocket client instances
 */
export function removeAllWebSocketClients(): void {
  wsInstances.forEach((client) => client.destroy());
  wsInstances.clear();
}

/**
 * Composable hook for using the WebSocket client
 *
 * @example
 * ```ts
 * const { isConnected, on, send, subscribe } = useWebSocketClient({
 *   url: 'wss://your-server.com/ws'
 * })
 *
 * // Subscribe to a channel
 * subscribe('dashboard')
 *
 * // Listen for messages
 * const unsubscribe = on('dashboard_update', (data) => {
 *   console.log('Dashboard updated:', data)
 * })
 *
 * // Send a message
 * send({ type: 'request_data', data: { id: 123 } })
 *
 * // Cleanup when done
 * onUnmounted(() => {
 *   unsubscribe()
 */
export function useWebSocketClient(
  options: UseWebSocketClientOptions = {},
): UseWebSocketClientReturn & { client: WebSocketClient } {
  let url = options.url;

  if (!url && typeof window !== "undefined") {
    try {
      const env = useRuntimeConfig();
      url = env.public.wsUrl as string;
    } catch {}
  }

  if (!url) {
    console.warn(
      "WebSocket: No URL provided and wsUrl not found in runtime config",
    );
    const noopClient = {
      isConnected: ref(false),
      status: ref<WebSocketStatus>("CLOSED"),
      lastError: ref<Error | null>(null),
      lastMessage: ref<WebSocketMessage | null>(null),
      send: () => false,
      subscribe: () => {},
      unsubscribe: () => {},
      on: () => () => {},
      once: () => () => {},
      off: () => {},
      connect: () => {},
      disconnect: () => {},
      reconnect: () => {},
      destroy: () => {},
    } as unknown as UseWebSocketClientReturn;
    return { ...noopClient, client: null as any };
  }

  const client = getWebSocketClient({ ...options, url });

  return {
    client,
    isConnected: computed(() => client.isConnected),
    status: computed(() => client.status),
    lastError: client.lastError,
    lastMessage: client.lastMessage,
    send: (message) => client.send(message),
    subscribe: (channel) => client.subscribe(channel),
    unsubscribe: (channel) => client.unsubscribe(channel),
    on: (type, handler, channel) => client.on(type, handler, channel),
    once: (type, handler, channel) => client.once(type, handler, channel),
    off: (type, handler, channel) => client.off(type, handler, channel),
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    reconnect: () => client.reconnect(),
    destroy: () => client.destroy(),
  };
}

/**
 * Export default instance getter for backward compatibility
 */
export default useWebSocketClient;
