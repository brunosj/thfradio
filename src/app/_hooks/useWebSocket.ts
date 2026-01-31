import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, ServerMessage } from "../_modules/chat/chat.types";
import { CMS_URL } from "@/utils/constants";

interface UseWebSocketProps {
  onMessage: (data: ServerMessage) => void;
  onError: (error: string) => void;
  heartbeatInterval: number;
  maxRetries: number;
  retryDelay: number;
}
export const useWebSocket = ({
  onMessage,
  onError,
  heartbeatInterval,
  maxRetries,
  retryDelay,
}: UseWebSocketProps) => {
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    if (wsRef.current) {
      wsRef.current.onclose = null; // Prevent reconnection on intentional close
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      setConnectionStatus("connected");
      return;
    }

    cleanup();
    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const serverUrl = CMS_URL + "/chat";
      const host = serverUrl.replace(/^https?:\/\//, "");
      const wsUrl = `${protocol}//${host}/chat`;

      console.log("Attempting WebSocket connection to:", wsUrl);

      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log("WebSocket connection established");
        setIsConnecting(false);
        setConnectionStatus("connected");
        retryCountRef.current = 0;

        // Start heartbeat after successful connection
        heartbeatRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(
              JSON.stringify({ type: "ping", timestamp: Date.now() }),
            );
          }
        }, heartbeatInterval);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "pong") return;
          onMessage(data);
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      socket.onclose = (event) => {
        console.log(
          `WebSocket closed with code: ${event.code}, reason: ${event.reason}`,
        );
        cleanup();
        setIsConnecting(false);
        setConnectionStatus("disconnected");

        if (event.code !== 1000 && retryCountRef.current < maxRetries) {
          const delay = retryDelay * Math.pow(2, retryCountRef.current);
          retryCountRef.current++;
          console.log(
            `Attempting reconnection in ${delay}ms (attempt ${retryCountRef.current})`,
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        onError("Connection error occurred");
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }, [cleanup, heartbeatInterval, maxRetries, onError, onMessage, retryDelay]);
  // Auto-connect effect
  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return {
    isConnecting,
    connectionStatus,
    sendMessage: useCallback(
      (message: ChatMessage) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          onError("Not connected to chat");
          return false;
        }

        try {
          wsRef.current.send(JSON.stringify(message));
          return true;
        } catch (error) {
          console.error("Failed to send message:", error);
          onError("Failed to send message");
          return false;
        }
      },
      [onError],
    ),
    connect,
  };
};
