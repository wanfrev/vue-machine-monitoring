import { io, type Socket } from "socket.io-client";
import { baseURL } from "./client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(baseURL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
