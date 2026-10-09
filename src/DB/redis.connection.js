import { createClient } from "redis";
import { REDIS_URI, REDIS_URL } from "../config.js";

export const redisClient = createClient({ url: REDIS_URI || REDIS_URL });
export const client = redisClient;

redisClient.on("error", (error) => console.log("Redis Error", error));

export const bootstrapRedis = async () => {
    try {
        await redisClient.connect();
        console.log("Redis Connected Successfully 🌸");
    } catch (error) {
        console.log("Fail to connect on Redis ❌");
    }
};

export const connectRedis = bootstrapRedis;
