import { RedpandaProducerService } from './redpanda-producer.service';
import { JobStoreService } from './job-store.service';
import { AnalysisWorker } from './analysis.worker';
import { AnalysisJobPayload } from './queue.interface';

describe('Queue & Worker Architecture (Phase 5)', () => {
  let producerService: RedpandaProducerService;
  let jobStore: JobStoreService;
  let worker: AnalysisWorker;

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  } as any;

  const mockAiService = {
    generateCritique: jest.fn().mockResolvedValue({
      source: 'deterministic-fallback',
      metrics: { services: 1, databases: 1 },
      analysis: {
        executiveSummary: 'Test evaluation passed',
        strengths: ['Single service structure'],
        spofRisks: [],
        scalabilityBottlenecks: [],
        recommendations: [],
      },
      rawCritiqueText: 'Critique content',
    }),
  } as any;

  const mockGateway = {
    emitStatusUpdate: jest.fn(),
    emitCritiqueComplete: jest.fn(),
  } as any;

  beforeEach(async () => {
    producerService = new RedpandaProducerService();
    // Do not connect to real network kafka during unit test
    jest.spyOn(producerService as any, 'initKafkaConnection').mockResolvedValue(undefined);
    await producerService.onModuleInit();

    jobStore = new JobStoreService(mockRedisService);
    worker = new AnalysisWorker(producerService, jobStore, mockAiService, mockGateway);
    await worker.onModuleInit();
  });

  afterEach(async () => {
    await worker.onModuleDestroy();
    await producerService.onModuleDestroy();
  });

  describe('JobStoreService', () => {
    it('should create a job with QUEUED status', async () => {
      const payload: AnalysisJobPayload = {
        jobId: 'job-123',
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
      };

      const job = await jobStore.createJob(payload);
      expect(job.jobId).toBe('job-123');
      expect(job.status).toBe('QUEUED');

      const retrieved = await jobStore.getJob('job-123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.status).toBe('QUEUED');
    });

    it('should transition job through PROCESSING and COMPLETED', async () => {
      await jobStore.createJob({
        jobId: 'job-456',
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
      });

      const processing = await jobStore.updateStatus('job-456', 'PROCESSING');
      expect(processing?.status).toBe('PROCESSING');

      const completed = await jobStore.updateStatus('job-456', 'COMPLETED', {
        summary: 'done',
      });
      expect(completed?.status).toBe('COMPLETED');
      expect(completed?.data).toEqual({ summary: 'done' });
      expect(completed?.completedAt).toBeDefined();
    });
  });

  describe('RedpandaProducerService & AnalysisWorker', () => {
    it('should route job to in-memory fallback queue when broker is offline and process it', async () => {
      const payload: AnalysisJobPayload = {
        jobId: 'job-async-test',
        projectId: 'project-99',
        socketId: 'socket-99',
        nodes: [{ id: '1', data: { label: 'Auth Service', type: 'service' } }],
        edges: [],
        createdAt: new Date().toISOString(),
      };

      await jobStore.createJob(payload);

      // Enqueue job
      const enqueueResult = await producerService.enqueueAnalysisJob(payload);
      expect(enqueueResult.jobId).toBe('job-async-test');

      // Wait a tick for in-memory event dispatch
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(mockAiService.generateCritique).toHaveBeenCalledWith(
        payload.nodes,
        payload.edges,
        undefined,
        payload.projectId,
        payload.socketId
      );

      // Verify WebSocket emission
      expect(mockGateway.emitCritiqueComplete).toHaveBeenCalledWith(
        'job-async-test',
        expect.any(Object),
        'project-99',
        'socket-99'
      );

      // Verify job is marked as COMPLETED in store
      const finalJob = await jobStore.getJob('job-async-test');
      expect(finalJob?.status).toBe('COMPLETED');
    });
  });
});
