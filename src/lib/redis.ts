import { Redis } from "@upstash/redis";

function createRedisClient(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url) throw new Error("Missing UPSTASH_REDIS_REST_URL");
  if (!token) throw new Error("Missing UPSTASH_REDIS_REST_TOKEN");
  return new Redis({ url, token });
}

let client: Redis | null = null;

export const redis = new Proxy<Redis>(
  {} as Redis,
  {
    get(target, prop: string | symbol) {
      if (!client) client = createRedisClient();
      return Reflect.get(client, prop, target);
    },
  }
);
