import { Server as SocketIOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import { calculateBufferTime } from "@/lib/utils";
import { Socket } from "net";

// Extend the Socket type to include server property
interface SocketWithIO extends Socket {
  server: any;
}

interface RoomData {
  clients: Set<string>;
  hostId: string | null;
}

// Store rooms in memory (note: this will reset on each deployment)
// For production, consider using a database or Redis
const rooms: Map<string, RoomData> = new Map();

// Track active connections
let io: SocketIOServer;

export default function SocketHandler(req: NextApiRequest, res: NextApiResponse) {
  // Type assertion for socket
  if ((res.socket as SocketWithIO)?.server?.io) {
    // Socket server already running
    io = (res.socket as SocketWithIO).server.io;
    console.log("Socket server already running");
    res.end();
    return;
  }

  // Set CORS headers for Socket.IO
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  // Initialize Socket.IO server
  io = new SocketIOServer((res.socket as SocketWithIO)?.server, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['polling', 'websocket'], // Put polling first for better compatibility
    // Add these settings to help with Vercel's serverless environment
    pingTimeout: 60000,
    pingInterval: 25000,
    upgradeTimeout: 10000,
    allowEIO3: true,
    maxHttpBufferSize: 1e8, // Increase buffer size for audio data
  });
  
  (res.socket as SocketWithIO).server.io = io;

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Host creates a room
    socket.on("create-room", ({ roomCode }) => {
      console.log(`Creating room: ${roomCode}`);
      
      // Create new room or reset existing one
      rooms.set(roomCode, {
        clients: new Set([socket.id]),
        hostId: socket.id,
      });
      
      // Join the socket to the room
      socket.join(roomCode);
    });
    
    // Client joins a room
    socket.on("join-room", ({ roomCode }) => {
      console.log(`Client ${socket.id} attempting to join room: ${roomCode}`);
      
      const room = rooms.get(roomCode);
      
      if (!room) {
        socket.emit("room-not-found");
        return;
      }
      
      // Add client to room
      room.clients.add(socket.id);
      socket.join(roomCode);
      
      // Notify client of successful join
      socket.emit("room-joined");
      
      // Notify host of new client
      if (room.hostId) {
        io.to(room.hostId).emit("client-joined", {
          count: room.clients.size - 1, // Subtract 1 to exclude host
        });
      }
    });
    
    // Host sends audio data
    socket.on("audio-data", ({ roomCode, audioData, timestamp }) => {
      // Broadcast to all clients in the room except sender
      socket.to(roomCode).emit("audio-data", {
        audioData,
        timestamp,
      });
    });
    
    // Client requests time sync
    socket.on("sync-time", ({ roomCode, clientTime }) => {
      const serverTime = Date.now();
      const room = rooms.get(roomCode);
      
      if (room && room.hostId) {
        // Calculate network latency (round trip time / 2)
        const latency = (serverTime - clientTime) / 2;
        
        // Calculate buffer time based on network latency
        const bufferTime = calculateBufferTime(latency);
        
        // Send time sync response to client
        socket.emit("time-sync-response", {
          clientTime,
          serverTime,
          latency,
          bufferTime,
        });
      }
    });
    
    // Host stops streaming
    socket.on("stop-streaming", ({ roomCode }) => {
      socket.to(roomCode).emit("host-stopped-streaming");
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Check all rooms for this client
      // Convert Map.entries() to Array to avoid downlevelIteration issues
      Array.from(rooms.entries()).forEach(([roomCode, room]) => {
        if (room.clients.has(socket.id)) {
          // Remove client from room
          room.clients.delete(socket.id);
          
          // If this was the host, notify all clients
          if (room.hostId === socket.id) {
            io.to(roomCode).emit("host-stopped-streaming");
            room.hostId = null;
          } else if (room.hostId) {
            // Notify host of client leaving
            io.to(room.hostId).emit("client-left", {
              count: room.clients.size - 1, // Subtract 1 to exclude host
            });
          }
          
          // If room is empty, remove it
          if (room.clients.size === 0) {
            rooms.delete(roomCode);
          }
        }
      });
    });
  });

  console.log("Socket server initialized");
  res.end();
}