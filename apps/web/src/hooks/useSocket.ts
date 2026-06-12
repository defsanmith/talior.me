import { Config } from "@/lib/config";
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAppSelector } from "../store";

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const accessToken = useAppSelector((state) => state.auth.accessToken);

  // Create the socket once and keep it for the lifetime of the mounted tree.
  useEffect(() => {
    const socketInstance = io(Config.API_BASE_URL, {
      autoConnect: false,
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketInstance.on("connect", () => {
      console.log("WebSocket connected");
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error.message);

      // On auth errors, stop reconnect churn and wait for the HTTP layer to
      // refresh the token. The accessToken effect below will reconnect once
      // a fresh token is in the store.
      if (/invalid token|jwt|unauthori/i.test(error.message)) {
        socketInstance.disconnect();
      }
    });

    socketRef.current = socketInstance;
    socketInstance.connect();

    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("connect_error");
      socketInstance.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Keep handshake auth in sync with the current access token.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    if (!accessToken) {
      socket.disconnect();
      return;
    }

    socket.auth = { token: accessToken };

    if (!socket.connected) {
      socket.connect();
    }
  }, [accessToken]);

  return socketRef;
}
