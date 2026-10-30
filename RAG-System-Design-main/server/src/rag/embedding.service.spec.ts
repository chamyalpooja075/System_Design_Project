import { ConfigService } from '@nestjs/config';
import { EmbeddingService } from './embedding.service';

describe('EmbeddingService & Vector Search (Phase 4 Verification)', () => {
  let embeddingService: EmbeddingService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(null), // Default to local deterministic semantic embedder
    };
    embeddingService = new EmbeddingService(mockConfigService as ConfigService);
  });

  describe('Cosine Similarity Mathematics', () => {
    it('should calculate 1.0 for identical vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [1, 2, 3];
      const sim = embeddingService.cosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(1.0, 4);
    });

    it('should calculate 0.0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      const sim = embeddingService.cosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(0.0, 4);
    });

    it('should calculate -1.0 for diametrically opposite vectors', () => {
      const vecA = [1, 2, 3];
      const vecB = [-1, -2, -3];
      const sim = embeddingService.cosineSimilarity(vecA, vecB);
      expect(sim).toBeCloseTo(-1.0, 4);
    });

    it('should return 0 safely for empty or invalid vectors without crashing', () => {
      expect(embeddingService.cosineSimilarity([], [1, 2])).toBe(0);
      expect(embeddingService.cosineSimilarity([1, 2], [])).toBe(0);
      expect(embeddingService.cosineSimilarity([], [])).toBe(0);
    });
  });

  describe('Semantic Vector Generation', () => {
    it('should produce a normalized 64-dimensional vector', async () => {
      const vec = await embeddingService.generateEmbedding('Redis cache-aside distributed in-memory store');
      expect(vec).toHaveLength(64);

      // Verify unit length (L2 norm ≈ 1)
      const norm = Math.sqrt(vec.reduce((sum, v) => sum + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 2);
    });

    it('should assign significantly higher similarity to architecturally related concepts than unrelated concepts', async () => {
      const vecDbReplication = await embeddingService.generateEmbedding('database replication failover standby replica primary');
      const vecDbSPOF = await embeddingService.generateEmbedding('unreplicated postgresql database single point of failure');
      const vecUnrelated = await embeddingService.generateEmbedding('colorful watercolor painting landscape floral garden');

      const simRelated = embeddingService.cosineSimilarity(vecDbReplication, vecDbSPOF);
      const simUnrelated = embeddingService.cosineSimilarity(vecDbReplication, vecUnrelated);

      expect(simRelated).toBeGreaterThan(simUnrelated);
      expect(simRelated).toBeGreaterThan(0.3);
    });
  });
});
