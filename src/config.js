import { resolve } from 'node:path'
import { config } from 'dotenv'

const NODE_ENV = process.env.NODE_ENV ?? 'development'
config({ path: resolve(`.env.${NODE_ENV}`) })
export const PORT = parseInt(process.env.PORT ?? "9000")

export const DB_URI = process.env.DB_URI

export const ENC_KEY = process.env.ENC_KEY
export const IV_LENGTH = parseInt(process.env.IV_LENGTH ?? "16")

export const ACCESS_ADMIN_TOKEN_SIGNATURE = process.env.ACCESS_ADMIN_TOKEN_SIGNATURE
export const ACCESS_USER_TOKEN_SIGNATURE = process.env.ACCESS_USER_TOKEN_SIGNATURE
export const ACCESS_TOKEN_EXPIRES_IN = parseInt(process.env.ACCESS_TOKEN_EXPIRES_IN ?? "1800")

export const REFRESH_ADMIN_TOKEN_SIGNATURE = process.env.REFRESH_ADMIN_TOKEN_SIGNATURE
export const REFRESH_USER_TOKEN_SIGNATURE = process.env.REFRESH_USER_TOKEN_SIGNATURE
export const REFRESH_TOKEN_EXPIRES_IN = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN ?? "31536000")

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379"
export const REDIS_URI = process.env.REDIS_URI ?? REDIS_URL
export const CACHE_TTL = parseInt(process.env.CACHE_TTL ?? "300")

export const WEB_CLIENT_IDS = process.env.WEB_CLIENT_IDS

export const APP_EMAIL = process.env.APP_EMAIL
export const APP_PASSWORD = process.env.APP_PASSWORD
export const APP_NAME = process.env.APP_NAME ?? "SarahaApp"
