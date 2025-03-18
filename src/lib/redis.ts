import { createClient } from 'redis'

export type HabitType = 'sleep' | 'smoothie' | 'exercise' | 'social_media'
export type CreditAction = 'earn' | 'lose'

export interface HabitRecord {
  date: string
  habit: HabitType
  action: CreditAction
  credits: number
  notes?: string
}

export interface UserData {
  totalCredits: number
  habits: HabitRecord[]
  rewards: {
    id: string
    name: string
    credits: number
    claimed: boolean
    imgUrl?: string
    amazonUrl?: string
  }[]
}

// In-memory store for local development when Redis is not available
const localStore: Record<string, string> = {};

// Check if we're in development mode and without a Redis URL
const isDevelopmentWithoutRedis = process.env.NODE_ENV === 'development' && !process.env.REDIS_URL;

// Create a wrapper for the Redis client
class RedisWrapper {
  private client: ReturnType<typeof createClient> | null = null;
  private mockClient: boolean;
  public isOpen: boolean;

  constructor(useMock: boolean) {
    this.mockClient = useMock;
    this.isOpen = useMock; // Mock client is always "open"
  }

  initializeRealClient(url: string) {
    if (this.mockClient) return;
    
    this.client = createClient({
      url,
      socket: {
        connectTimeout: 10000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
      }
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.client.on('connect', () => console.log('Redis Client Connected'));
    this.client.on('ready', () => console.log('Redis Client Ready'));
    this.client.on('end', () => console.log('Redis Client Connection Ended'));
  }

  async connect(): Promise<void> {
    if (this.mockClient || this.isOpen) return;
    if (this.client) {
      await this.client.connect();
      this.isOpen = true;
    }
  }

  async disconnect(): Promise<void> {
    if (this.mockClient) return;
    if (this.client && this.isOpen) {
      await this.client.disconnect();
      this.isOpen = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.mockClient) {
      return Promise.resolve(localStore[key] || null);
    }
    
    if (!this.client) return null;
    return this.client.get(key);
  }

  async set(key: string, value: string): Promise<string | null> {
    if (this.mockClient) {
      localStore[key] = value;
      return Promise.resolve('OK');
    }
    
    if (!this.client) return null;
    return this.client.set(key, value);
  }

  async del(key: string): Promise<number> {
    if (this.mockClient) {
      delete localStore[key];
      return Promise.resolve(1);
    }
    
    if (!this.client) return 0;
    return this.client.del(key);
  }
}

// Initialize the appropriate client
const redisWrapper = new RedisWrapper(isDevelopmentWithoutRedis);

if (!isDevelopmentWithoutRedis && process.env.REDIS_URL) {
  console.log('Initializing Redis client with URL:', process.env.REDIS_URL);
  redisWrapper.initializeRealClient(process.env.REDIS_URL);
} else if (isDevelopmentWithoutRedis) {
  console.log('REDIS_URL not set. Using in-memory storage for local development.');
} else {
  throw new Error('REDIS_URL environment variable is not set and we are not in development mode');
}

// Ensure we're connected before operations
const ensureConnection = async () => {
  if (!isDevelopmentWithoutRedis && !redisWrapper.isOpen) {
    console.log('Connecting to Redis...');
    await redisWrapper.connect();
  }
};

export const redis = {
  get: async (key: string) => {
    await ensureConnection();
    return redisWrapper.get(key);
  },
  set: async (key: string, value: string) => {
    await ensureConnection();
    return redisWrapper.set(key, value);
  },
  del: async (key: string) => {
    await ensureConnection();
    return redisWrapper.del(key);
  },
  disconnect: async () => {
    if (!isDevelopmentWithoutRedis && redisWrapper.isOpen) {
      await redisWrapper.disconnect();
    }
  }
} 