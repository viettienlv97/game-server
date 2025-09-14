declare module 'bun' {
  interface Env {
    DB_URI: string;
    DB_NAME: string;
    PORT: number;
    ACCESS_SECRET: string;
    REFRESH_SECRET: string;
  }
}
