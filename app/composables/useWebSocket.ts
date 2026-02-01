import { ref, onMounted, onUnmounted, watch } from "vue";
import { WebSocketClient, getWebSocketClient } from "@/lib/websocket";
import { useUser } from "@/composables/useUserStates";
import type { WebSocketMessage, WebSocketStatus } from "@/types";

// Global reactive state for WebSocket
const wsClient = ref<WebSocketClient | null>(null);
const isConnected = ref(false);
const status = ref<WebSocketStatus>("CLOSED");
const subscribedChannels = ref<Set<string>>(new Set());

/**
 * Core WebSocket composable - manages the single WebSocket connection
 * Call this once in your app layout to initialize the connection
 */
export function useWebSocketConnection() {
  const user = useUser();
  const config = useRuntimeConfig();

  const connect = () => {
    const wsUrl = config.public.wsUrl as string;

    if (!wsUrl) {
      console.warn("WebSocket URL not configured");
      return;
    }

    if (!user.value?.token) {
      console.warn("No auth token available for WebSocket");
      return;
    }

    // Already connected
    if (wsClient.value && wsClient.value.isConnected) {
      return;
    }

    wsClient.value = getWebSocketClient({
      url: wsUrl,
      token: user.value.token,
      autoConnect: true,
      autoReconnect: true,
      maxRetries: -1,
      reconnectDelay: 2000,
      maxReconnectDelay: 30000,
      heartbeat: true,
      heartbeatInterval: 30000,
      onConnected: () => {
        isConnected.value = true;
        status.value = "OPEN";

        // Re-subscribe to all channels after reconnect
        subscribedChannels.value.forEach((channel) => {
          wsClient.value?.subscribe(channel);
        });
      },
      onDisconnected: () => {
        isConnected.value = false;
        status.value = "CLOSED";
      },
      onError: () => {
        status.value = "CLOSED";
      },
    });

    // Sync status
    watch(
      () => (wsClient.value ? wsClient.value.status : null),
      (newStatus) => {
        if (newStatus) {
          status.value = newStatus;
          isConnected.value = newStatus === "OPEN";
        }
      },
    );
  };

  const disconnect = () => {
    if (wsClient.value) {
      try {
        wsClient.value.disconnect();
      } catch (err) {
        console.warn("Error disconnecting WebSocket:", err);
      }
      wsClient.value = null;
    }
    isConnected.value = false;
    status.value = "CLOSED";
  };

  // Watch for user changes (login/logout)
  watch(
    () => user.value?.token,
    (newToken, oldToken) => {
      if (newToken && !oldToken) {
        connect();
      } else if (!newToken && oldToken) {
        disconnect();
      }
    },
  );

  return {
    connect,
    disconnect,
    isConnected,
    status,
  };
}

/**
 * Subscribe to a WebSocket channel
 * Use this in pages/components to subscribe to specific channels
 */
export function useChannel<T = any>(channelName: string) {
  const data = ref<T | null>(null);
  const lastMessage = ref<WebSocketMessage<T> | null>(null);
  const listeners: Array<(data: T, message: WebSocketMessage<T>) => void> = [];
  let unsubscribeHandler: (() => void) | null = null;

  const subscribe = () => {
    if (!wsClient.value) return;

    // Track subscription
    subscribedChannels.value.add(channelName);

    // Subscribe to channel
    wsClient.value.subscribe(channelName);

    // Listen for messages on this channel (any message type)
    unsubscribeHandler = wsClient.value.on<T>("*", (msgData, message) => {
      if (message.channel === channelName) {
        data.value = msgData;
        lastMessage.value = message;

        // Notify all listeners
        listeners.forEach((listener) => listener(msgData, message));
      }
    });
  };

  const unsubscribe = () => {
    if (wsClient.value) {
      wsClient.value.unsubscribe(channelName);
    }
    subscribedChannels.value.delete(channelName);
    unsubscribeHandler?.();
  };

  /**
   * Listen for specific message types on this channel
   */
  const onMessage = (
    callback: (data: T, message: WebSocketMessage<T>) => void,
  ) => {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  };

  /**
   * Listen for a specific message type on this channel
   */
  const on = (
    messageType: string,
    callback: (data: T, message: WebSocketMessage<T>) => void,
  ) => {
    if (!wsClient.value) return () => {};

    return wsClient.value.on<T>(messageType, (msgData, message) => {
      if (!channelName || message.channel === channelName) {
        callback(msgData, message);
      }
    });
  };

  // Auto-subscribe on mount, unsubscribe on unmount
  onMounted(() => {
    if (wsClient.value && wsClient.value.isConnected) {
      subscribe();
    } else {
      // Wait for connection
      const stopWatch = watch(isConnected, (connected) => {
        if (connected) {
          subscribe();
          stopWatch();
        }
      });
    }
  });

  onUnmounted(() => {
    unsubscribe();
  });

  return {
    data,
    lastMessage,
    onMessage,
    on,
    subscribe,
    unsubscribe,
  };
}

/**
 * Listen for any message type globally (without channel filter)
 */
export function useWebSocketMessage<T = any>(messageType: string) {
  const data = ref<T | null>(null);
  const lastMessage = ref<WebSocketMessage<T> | null>(null);
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    if (wsClient.value) {
      unsubscribe = wsClient.value.on<T>(messageType, (msgData, message) => {
        data.value = msgData;
        lastMessage.value = message;
      });
    }
  });

  onUnmounted(() => {
    unsubscribe?.();
  });

  return {
    data,
    lastMessage,
  };
}

/**
 * Send a message through WebSocket
 */
export function useSendMessage() {
  const send = <T = any>(type: string, data?: T, channel?: string): boolean => {
    if (!wsClient.value || !wsClient.value.isConnected) {
      console.warn("WebSocket not connected, cannot send message");
      return false;
    }

    return wsClient.value.send({
      type,
      channel,
      data,
    });
  };

  return { send };
}

/**
 * Get the raw WebSocket client (for advanced usage)
 */
export function useRawWebSocket() {
  return {
    client: wsClient,
    isConnected,
    status,
    subscribedChannels,
  };
}
