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

// Keep revoked tokens only until the JWT itself expires.
export const revokeToken = async (token, expiresAt) => {
    if (!redisClient.isReady) {
        throw new Error("Redis is unavailable; token could not be revoked");
    }

    const ttl = Math.ceil(expiresAt - Date.now() / 1000);
    if (ttl <= 0) return;

    await redisClient.set(`revoked-token:${token}`, "1", { EX: ttl });
};

export const isTokenRevoked = async (token) => {
    if (!redisClient.isReady) {
        throw new Error("Redis is unavailable; token revocation cannot be checked");
    }

    return (await redisClient.exists(`revoked-token:${token}`)) === 1;
};
