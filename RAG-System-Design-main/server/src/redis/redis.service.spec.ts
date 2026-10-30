import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

describe('RedisService (Caching & Rate Limiting Engine)', () => {
  let redisService: RedisService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'REDIS_URL') return 'redis://localhost:6379';
        return null;
      }),
    };

    redisService = new RedisService(mockConfigService as ConfigService);
    // Do not connect to real redis in unit tests, test memory-fallback engine
  });

  afterEach(() => {
    redisService.onModuleDestroy();
  });

  describe('Cache Operations (Set / Get / Del)', () => {
    it('should store and retrieve values successfully', async () => {
      await redisService.set('test:key', JSON.stringify({ score: 95 }));
      const retrieved = await redisService.get('test:key');
      expect(retrieved).not.toBeNull();
      const parsed = JSON.parse(retrieved!);
      expect(parsed.score).toBe(95);
    });

    it('should return null for non-existent keys', async () => {
      const result = await redisService.get('nonexistent:key');
      expect(result).toBeNull();
    });

    it('should delete keys successfully', async () => {
      await redisService.set('test:delete', 'value123');
      expect(await redisService.get('test:delete')).toBe('value123');

      await redisService.del('test:delete');
      expect(await redisService.get('test:delete')).toBeNull();
    });

    it('should expire keys when TTL passes', async () => {
      // Set key with 1-second TTL
      await redisService.set('test:ttl', 'temp-value', 1);
      expect(await redisService.get('test:ttl')).toBe('temp-value');

      // Fast-forward or wait 1100ms
      await new Promise((resolve) => setTimeout(resolve, 1100));
      expect(await redisService.get('test:ttl')).toBeNull();
    });
  });

  describe('Sliding-Window Rate Limiting', () => {
    it('should allow requests within the rate limit and track remaining capacity', async () => {
      const limit = 5;
      const windowSec = 60;
      const key = 'test-client-ip-1';

      // 1st request
      const res1 = await redisService.rateLimit(key, limit, windowSec);
      expect(res1.allowed).toBe(true);
      expect(res1.remaining).toBe(4);

      // 2nd request
      const res2 = await redisService.rateLimit(key, limit, windowSec);
      expect(res2.allowed).toBe(true);
      expect(res2.remaining).toBe(3);
    });

    it('should block requests that exceed the rate limit', async () => {
      const limit = 3;
      const windowSec = 60;
      const key = 'test-client-ip-burst';

      for (let i = 0; i < limit; i++) {
        const res = await redisService.rateLimit(key, limit, windowSec);
        expect(res.allowed).toBe(true);
      }

      // 4th request -> must be rejected (429 condition)
      const blocked = await redisService.rateLimit(key, limit, windowSec);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should isolate rate limits across different client keys', async () => {
      const limit = 2;
      const clientA = 'ip-a';
      const clientB = 'ip-b';

      await redisService.rateLimit(clientA, limit, 60);
      await redisService.rateLimit(clientA, limit, 60);
      const blockedA = await redisService.rateLimit(clientA, limit, 60);
      expect(blockedA.allowed).toBe(false);

      // Client B should still be allowed
      const allowedB = await redisService.rateLimit(clientB, limit, 60);
      expect(allowedB.allowed).toBe(true);
      expect(allowedB.remaining).toBe(1);
    });
  });
});
