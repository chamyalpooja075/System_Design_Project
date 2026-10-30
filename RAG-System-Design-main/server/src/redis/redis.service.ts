import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isRedisConnected = false;

  // Resilient In-Memory Fallback if Redis server is offline
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly memoryRateLimit = new Map<string, RateLimitEntry>();

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2000,
        retryStrategy: (times) => {
          if (times > 2) {
            this.logger.warn('Redis server unavailable. Operating seamlessly in memory-cache fallback mode.');
            return null; // Stop retrying
          }
          return 1000;
        },
      });

      this.client.on('connect', () => {
        this.isRedisConnected = true;
        this.logger.log('Connected to Redis server successfully.');
      });

      this.client.on('error', (err) => {
        this.isRedisConnected = false;
        // Suppress continuous noisy error logs
        this.logger.debug(`Redis connection issue (${err.message}). Using local in-memory fallback cache.`);
      });
    } catch (err: any) {
      this.isRedisConnected = false;
      this.logger.warn(`Could not initialize Redis client: ${err.message}. Using in-memory fallback.`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isRedisConnected && this.client) {
      try {
        return await this.client.get(key);
      } catch {
        // Fallback to memory on runtime error
      }
    }

    const entry = this.memoryCache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds = 3600): Promise<void> {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.set(key, value, 'EX', ttlSeconds);
        return;
      } catch {
        // Fallback to memory
      }
    }

    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    if (this.isRedisConnected && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        // Fallback
      }
    }
    this.memoryCache.delete(key);
  }

  async rateLimit(
    key: string,
    limit = 10,
    windowSeconds = 60
  ): Promise<{ allowed: boolean; remaining: number }> {
    const rateKey = `ratelimit:${key}`;

    if (this.isRedisConnected && this.client) {
      try {
        const current = await this.client.incr(rateKey);
        if (current === 1) {
          await this.client.expire(rateKey, windowSeconds);
        }
        return {
          allowed: current <= limit,
          remaining: Math.max(0, limit - current),
        };
      } catch {
        // Fallback to memory
      }
    }

    const now = Date.now();
    const entry = this.memoryRateLimit.get(rateKey);

    if (!entry || now > entry.resetAt) {
      this.memoryRateLimit.set(rateKey, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });
      return { allowed: true, remaining: limit - 1 };
    }

    entry.count++;
    return {
      allowed: entry.count <= limit,
      remaining: Math.max(0, limit - entry.count),
    };
  }

  isUsingRedis(): boolean {
    return this.isRedisConnected;
  }
}
