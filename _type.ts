declare module 'bun' {
  interface Env {
    MONGODB_URI: string;
    PORT: number;
    ACCESS_SECRET: string;
    REFRESH_SECRET: string;
    TOKEN_TTL: string;
    REFRESH_TTL: string;
    MONGO_MIN_POOL: number;
    MONGO_MAX_POOL: number;
  }
}
