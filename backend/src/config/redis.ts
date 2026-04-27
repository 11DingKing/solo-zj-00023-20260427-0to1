import { createClient } from 'redis';
import { env } from './env';

let redisClient: ReturnType<typeof createClient> | null = null;

export const getRedisClient = async (): Promise<ReturnType<typeof createClient>> => {
  if (redisClient && redisClient.isReady) {
    return redisClient;
  }

  redisClient = createClient({
    url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('Redis Client Connected');
  });

  await redisClient.connect();
  
  return redisClient;
};

export const acquireLock = async (key: string, ttl: number = 30000): Promise<boolean> => {
  const client = await getRedisClient();
  const result = await client.set(key, 'locked', {
    NX: true,
    PX: ttl
  });
  return result === 'OK';
};

export const releaseLock = async (key: string): Promise<void> => {
  const client = await getRedisClient();
  await client.del(key);
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  const client = await getRedisClient();
  const data = await client.get(key);
  if (data) {
    return JSON.parse(data) as T;
  }
  return null;
};

export const setCache = async (key: string, value: unknown, ttl: number = 300): Promise<void> => {
  const client = await getRedisClient();
  await client.set(key, JSON.stringify(value), {
    EX: ttl
  });
};

export const deleteCache = async (key: string): Promise<void> => {
  const client = await getRedisClient();
  await client.del(key);
};
