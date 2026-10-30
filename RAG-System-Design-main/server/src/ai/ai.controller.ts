import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { CritiqueRequestDto } from './dto/critique.dto';
import { GenerateInterviewQuestionsDto, EvaluateInterviewAnswerDto } from './dto/interview.dto';
import { RedisService } from '../redis/redis.service';
import { RedpandaProducerService } from '../queue/redpanda-producer.service';
import { JobStoreService } from '../queue/job-store.service';
import { AnalysisJobPayload } from '../queue/queue.interface';

@ApiTags('AI Critique')
@Controller('api/ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly redisService: RedisService,
    private readonly producerService: RedpandaProducerService,
    private readonly jobStore: JobStoreService,
  ) {}

  @Post('critique')
  @ApiOperation({ summary: 'Generate architecture critique using LLM grounded in deterministic metrics' })
  @ApiResponse({ status: 200, description: 'Synchronous critique report generated' })
  @ApiResponse({ status: 202, description: 'Asynchronous job enqueued to Redpanda worker' })
  @ApiResponse({ status: 429, description: 'Too many requests. Rate limit is 10 requests per minute.' })
  async generateCritique(
    @Body() dto: CritiqueRequestDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    // Sliding-window rate limit: 10 requests per minute per client IP
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown-client';

    const rateLimit = await this.redisService.rateLimit(
      `critique:${clientIp}`,
      10,
      60
    );

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many critique requests. Rate limit is 10 requests per minute.',
          remaining: 0,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // If client requested asynchronous processing or large-scale evaluation
    if (dto.async) {
      res.status(HttpStatus.ACCEPTED);
      return this.enqueueJob(dto);
    }

    // Default synchronous path
    res.status(HttpStatus.OK);
    return this.aiService.generateCritique(
      dto.nodes,
      dto.edges,
      dto.systemContext,
      dto.projectId,
      dto.socketId,
    );
  }

  @Post('critique/async')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Enqueue critique job for asynchronous worker execution via Redpanda' })
  @ApiResponse({ status: 202, description: 'Job enqueued with jobId and status: QUEUED' })
  async enqueueCritiqueAsync(@Body() dto: CritiqueRequestDto, @Req() req: Request) {
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown-client';

    const rateLimit = await this.redisService.rateLimit(
      `critique:${clientIp}`,
      20,
      60
    );

    if (!rateLimit.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many critique requests. Rate limit exceeded.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return this.enqueueJob(dto);
  }

  @Get('jobs/:jobId')
  @ApiOperation({ summary: 'Get current status and result of an asynchronous analysis job' })
  @ApiParam({ name: 'jobId', description: 'Unique analysis job identifier' })
  @ApiResponse({ status: 200, description: 'Job details and result' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJobStatus(@Param('jobId') jobId: string) {
    const job = await this.jobStore.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Analysis job with ID ${jobId} not found`);
    }
    return job;
  }

  @Post('interview/questions')
  @ApiOperation({ summary: 'Generate balanced interview questions based on graph topology' })
  @ApiResponse({ status: 200, description: 'Interview questions generated' })
  async getInterviewQuestions(@Body() dto: GenerateInterviewQuestionsDto) {
    return this.aiService.generateInterviewQuestions(
      dto.nodes || [],
      dto.edges || [],
      dto.count || 5,
      dto.systemContext,
    );
  }

  @Post('interview/evaluate')
  @ApiOperation({ summary: 'Evaluate student interview answer against ideal answer and concepts' })
  @ApiResponse({ status: 200, description: 'Answer evaluated with accuracy and feedback' })
  async evaluateInterviewAnswer(@Body() dto: EvaluateInterviewAnswerDto) {
    return this.aiService.evaluateInterviewAnswer(
      dto.question,
      dto.idealAnswer,
      dto.keyConcepts || [],
      dto.userAnswer,
    );
  }

  /**
   * Helper to create and enqueue an analysis job
   */
  private async enqueueJob(dto: CritiqueRequestDto) {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const payload: AnalysisJobPayload = {
      jobId,
      projectId: dto.projectId,
      socketId: dto.socketId,
      nodes: dto.nodes || [],
      edges: dto.edges || [],
      systemContext: dto.systemContext,
      createdAt: new Date().toISOString(),
    };

    // 1. Register in JobStore
    const job = await this.jobStore.createJob(payload);

    // 2. Publish to queue
    const enqueueResult = await this.producerService.enqueueAnalysisJob(payload);

    return {
      jobId: job.jobId,
      status: job.status,
      channel: enqueueResult.channel,
      message: 'Analysis job enqueued for background worker processing',
      pollUrl: `/api/ai/jobs/${job.jobId}`,
    };
  }
}
