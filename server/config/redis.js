import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";

let pubClient;
let subClient;

export const connectRedis = async (io) => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  pubClient = createClient({ url: redisUrl });
  subClient = pubClient.duplicate();

  pubClient.on("error", (err) => console.error("Redis pub error:", err));
  subClient.on("error", (err) => console.error("Redis sub error:", err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  // Attach Redis adapter to Socket.io for multi-instance scalability
  io.adapter(createAdapter(pubClient, subClient));
  console.log("✅ Socket.io Redis adapter attached");
};

export const getRedisClient = () => pubClient;
