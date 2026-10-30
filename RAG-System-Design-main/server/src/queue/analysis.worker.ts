import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Consumer, Kafka } from 'kafkajs';
import { RedpandaProducerService, TOPIC_ANALYSIS_REQUESTED } from './redpanda-producer.service';
import { JobStoreService } from './job-store.service';
import { AiService } from '../ai/ai.service';
import { AnalysisGateway } from '../gateway/analysis.gateway';
import { AnalysisJobPayload, AnalysisJobResult } from './queue.interface';

@Injectable()
export class AnalysisWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalysisWorker.name);
  private kafkaConsumer: Consumer | null = null;
  private isConsuming = false;

  constructor(
    private readonly producerService: RedpandaProducerService,
    private readonly jobStore: JobStoreService,
    private readonly aiService: AiService,
    private readonly analysisGateway: AnalysisGateway,
  ) {}

  async onModuleInit() {
    // 1. Subscribe to local event fallback
    this.producerService.localEvents.on('analysis_requested', async (payload: AnalysisJobPayload) => {
      this.logger.debug(`[In-Memory Queue] Processing job ${payload.jobId}`);
      await this.processJob(payload);
    });

    // 2. If Redpanda broker is connected, start Kafka consumer group
    if (this.producerService.isBrokerConnected) {
      await this.startKafkaConsumer();
    }
  }

  async onModuleDestroy() {
    if (this.kafkaConsumer) {
      try {
        await this.kafkaConsumer.disconnect();
      } catch {
        // Ignore disconnect errors during teardown
      }
    }
  }

  /**
   * Start distributed Kafka consumer on Redpanda topic
   */
  private async startKafkaConsumer() {
    const brokersEnv = process.env.KAFKA_BROKERS || 'localhost:19092';
    const brokers = brokersEnv.split(',').map((b) => b.trim());

    try {
      const kafka = new Kafka({
        clientId: 'system-design-worker',
        brokers,
        connectionTimeout: 2000,
        requestTimeout: 3000,
      });

      this.kafkaConsumer = kafka.consumer({
        groupId: 'system-design-analysis-workers',
      });

      await this.kafkaConsumer.connect();
      await this.kafkaConsumer.subscribe({
        topic: TOPIC_ANALYSIS_REQUESTED,
        fromBeginning: false,
      });

      this.isConsuming = true;
      this.logger.log(`Analysis worker subscribed to topic ${TOPIC_ANALYSIS_REQUESTED}`);

      await this.kafkaConsumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;
          try {
            const payload: AnalysisJobPayload = JSON.parse(message.value.toString());
            await this.processJob(payload);
          } catch (err: any) {
            this.logger.error(`Error parsing message from queue: ${err.message}`);
          }
        },
      });
    } catch (err: any) {
      this.logger.warn(`Could not start Kafka consumer (${err.message}). Defaulting to in-process queue.`);
    }
  }

  /**
   * Execute architectural analysis workflow for enqueued job
   */
  async processJob(payload: AnalysisJobPayload): Promise<AnalysisJobResult> {
    const startTime = Date.now();
    this.logger.log(`Worker picked up analysis job ${payload.jobId}`);

    // Update status to PROCESSING
    await this.jobStore.updateStatus(payload.jobId, 'PROCESSING');
    this.analysisGateway.emitStatusUpdate(
      'QUEUED',
      'Worker picked up job from queue. Beginning architectural evaluation...',
      payload.projectId,
      payload.socketId
    );

    try {
      // Execute the multi-stage pipeline: Metrics -> Rules -> RAG -> LLM/Fallback
      const critiqueResult = await this.aiService.generateCritique(
        payload.nodes,
        payload.edges,
        payload.systemContext,
        payload.projectId,
        payload.socketId
      );

      // Mark COMPLETED in job store
      const completedJob = await this.jobStore.updateStatus(
        payload.jobId,
        'COMPLETED',
        critiqueResult
      );

      // Publish completion event to Redpanda topic
      if (completedJob) {
        await this.producerService.publishJobCompleted(completedJob);
      }

      // Stream completion payload to subscribed WebSocket client
      this.analysisGateway.emitCritiqueComplete(
        payload.jobId,
        critiqueResult,
        payload.projectId,
        payload.socketId
      );

      const elapsed = Date.now() - startTime;
      this.logger.log(`Job ${payload.jobId} completed successfully in ${elapsed}ms`);

      return (
        completedJob || {
          jobId: payload.jobId,
          status: 'COMPLETED',
          data: critiqueResult,
          createdAt: payload.createdAt,
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
      );
    } catch (error: any) {
      this.logger.error(`Failed to process job ${payload.jobId}: ${error.message}`);
      const failedJob = await this.jobStore.updateStatus(
        payload.jobId,
        'FAILED',
        undefined,
        error.message
      );

      this.analysisGateway.emitStatusUpdate(
        'FAILED',
        `Job processing failed: ${error.message}`,
        payload.projectId,
        payload.socketId
      );

      return (
        failedJob || {
          jobId: payload.jobId,
          status: 'FAILED',
          error: error.message,
          createdAt: payload.createdAt,
          updatedAt: new Date().toISOString(),
        }
      );
    }
  }
}
