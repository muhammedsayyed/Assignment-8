import { CACHE_TTL } from "../../config.js";
import { redisClient } from "../../DB/redis.connection.js";

export const getCache = async (key) => {
    if (!redisClient.isReady) return null;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
};

export const setCache = async (key, data) => {
    if (!redisClient.isReady) return;
    await redisClient.set(key, JSON.stringify(data), { EX: CACHE_TTL });
};

export const deleteCache = async (key) => {
    if (!redisClient.isReady) return;
    await redisClient.del(key);
};
