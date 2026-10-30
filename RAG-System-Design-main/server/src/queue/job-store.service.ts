import { Injectable, Logger } from '@nestjs/common';
import { AnalysisJobPayload, AnalysisJobResult, JobStatus } from './queue.interface';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class JobStoreService {
  private readonly logger = new Logger(JobStoreService.name);
  private readonly inMemoryJobs = new Map<string, AnalysisJobResult>();

  constructor(private readonly redisService: RedisService) {}

  /**
   * Register a new job in the store with QUEUED status
   */
  async createJob(payload: AnalysisJobPayload): Promise<AnalysisJobResult> {
    const job: AnalysisJobResult = {
      jobId: payload.jobId,
      status: 'QUEUED',
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.inMemoryJobs.set(job.jobId, job);

    try {
      await this.redisService.set(
        `analysis:job:${job.jobId}`,
        JSON.stringify(job),
        3600 // 1 hour TTL
      );
    } catch {
      // Redis offline fallback handled by RedisService in-memory map
    }

    return job;
  }

  /**
   * Update lifecycle status and data/error of a job
   */
  async updateStatus(
    jobId: string,
    status: JobStatus,
    data?: any,
    error?: string
  ): Promise<AnalysisJobResult | null> {
    let job = await this.getJob(jobId);
    if (!job) {
      job = {
        jobId,
        status,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    job.status = status;
    job.updatedAt = new Date().toISOString();
    if (data !== undefined) job.data = data;
    if (error !== undefined) job.error = error;
    if (status === 'COMPLETED' || status === 'FAILED') {
      job.completedAt = new Date().toISOString();
    }

    this.inMemoryJobs.set(jobId, job);

    try {
      await this.redisService.set(
        `analysis:job:${jobId}`,
        JSON.stringify(job),
        3600
      );
    } catch {
      // Redis offline fallback
    }

    return job;
  }

  /**
   * Retrieve job status by jobId
   */
  async getJob(jobId: string): Promise<AnalysisJobResult | null> {
    try {
      const cached = await this.redisService.get(`analysis:job:${jobId}`);
      if (cached) {
        return JSON.parse(cached) as AnalysisJobResult;
      }
    } catch {
      // Redis offline
    }

    return this.inMemoryJobs.get(jobId) || null;
  }
}
