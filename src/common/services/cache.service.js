import { redisClient } from "../../DB/redis.connection.js";

export const set = async ({ key, value, ttl = undefined } = {}) => {
    if (typeof value === "object") {
        value = JSON.stringify(value);
    }
    if (ttl !== undefined) {
        return await redisClient.set(key, value, { EX: ttl });
    }
    return await redisClient.set(key, value);
};

export const get = async ({ key } = {}) => {
    const value = await redisClient.get(key);
    try {
        return JSON.parse(value);
    } catch (error) {
        return value;
    }
};

export const exist = async ({ key } = {}) => {
    return (await redisClient.exists(key)) > 0;
};

export const update = async ({ key, value, ttl = undefined } = {}) => {
    if (!(await exist({ key }))) {
        return 0;
    }
    return await set({ key, value, ttl });
};

export const del = async ({ key } = {}) => {
    if (Array.isArray(key)) {
        if (!key.length) return 0;
        return await redisClient.del(key);
    }
    return await redisClient.del(key);
};

export const keys = async ({ prefix } = {}) => {
    return await redisClient.keys(`${prefix}*`);
};

export const ttl = async ({ key } = {}) => {
    return await redisClient.ttl(key);
};

export const expire = async ({ key, ttl } = {}) => {
    return await redisClient.expire(key, ttl);
};

export const incrBy = async ({ key, value = 1 } = {}) => {
    return await redisClient.incrBy(key, value);
};
