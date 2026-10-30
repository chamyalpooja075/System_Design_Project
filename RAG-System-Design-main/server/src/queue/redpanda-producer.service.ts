import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka, Producer, Admin, logLevel } from 'kafkajs';
import { EventEmitter } from 'events';
import { AnalysisJobPayload, AnalysisJobResult } from './queue.interface';

export const TOPIC_ANALYSIS_REQUESTED = 'diagram.analysis.requested';
export const TOPIC_ANALYSIS_COMPLETED = 'diagram.analysis.completed';

@Injectable()
export class RedpandaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedpandaProducerService.name);
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private admin: Admin | null = null;
  private isConnected = false;

  // In-memory EventEmitter fallback for zero-crash offline execution
  readonly localEvents = new EventEmitter();

  async onModuleInit() {
    await this.initKafkaConnection();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Attempt connection to Redpanda/Kafka brokers with graceful fallback
   */
  private async initKafkaConnection() {
    const brokersEnv = process.env.KAFKA_BROKERS || 'localhost:19092';
    const brokers = brokersEnv.split(',').map((b) => b.trim());

    try {
      this.kafka = new Kafka({
        clientId: 'system-design-producer',
        brokers,
        connectionTimeout: 1500,
        requestTimeout: 2500,
        logLevel: logLevel.NOTHING,
        retry: {
          retries: 1,
          initialRetryTime: 200,
        },
      });

      this.admin = this.kafka.admin();
      await this.admin.connect();

      // Ensure required topics exist
      await this.admin.createTopics({
        topics: [
          { topic: TOPIC_ANALYSIS_REQUESTED, numPartitions: 2, replicationFactor: 1 },
          { topic: TOPIC_ANALYSIS_COMPLETED, numPartitions: 2, replicationFactor: 1 },
        ],
        waitForLeaders: false,
      });

      this.producer = this.kafka.producer();
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log(`Connected to Redpanda broker at ${brokers.join(', ')}`);
    } catch (error: any) {
      this.isConnected = false;
      this.logger.warn(
        `Redpanda broker at ${brokers.join(', ')} is offline or unreachable (${error?.message || 'Connection failed'}). Activated high-performance in-memory event-queue fallback.`
      );
    }
  }

  /**
   * Disconnect producer and admin instances cleanly
   */
  private async disconnect() {
    try {
      if (this.producer) await this.producer.disconnect();
      if (this.admin) await this.admin.disconnect();
    } catch {
      // Ignore cleanup errors during shutdown
    }
  }

  /**
   * Is Redpanda broker actively connected
   */
  get isBrokerConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Enqueue an analysis job to Redpanda topic or local fallback queue
   */
  async enqueueAnalysisJob(payload: AnalysisJobPayload): Promise<{ jobId: string; channel: string }> {
    if (this.isConnected && this.producer) {
      try {
        await this.producer.send({
          topic: TOPIC_ANALYSIS_REQUESTED,
          messages: [
            {
              key: payload.jobId,
              value: JSON.stringify(payload),
              timestamp: `${Date.now()}`,
            },
          ],
        });
        return { jobId: payload.jobId, channel: 'redpanda' };
      } catch (err: any) {
        this.logger.warn(`Failed to produce to Redpanda (${err.message}). Routing to fallback queue.`);
      }
    }

    // Asynchronous dispatch via in-process event queue
    setImmediate(() => {
      this.localEvents.emit('analysis_requested', payload);
    });

    return { jobId: payload.jobId, channel: 'in-memory-queue' };
  }

  /**
   * Publish analysis completion event to Redpanda topic or local fallback
   */
  async publishJobCompleted(result: AnalysisJobResult): Promise<void> {
    if (this.isConnected && this.producer) {
      try {
        await this.producer.send({
          topic: TOPIC_ANALYSIS_COMPLETED,
          messages: [
            {
              key: result.jobId,
              value: JSON.stringify(result),
              timestamp: `${Date.now()}`,
            },
          ],
        });
        return;
      } catch {
        // Fallback
      }
    }

    setImmediate(() => {
      this.localEvents.emit('analysis_completed', result);
    });
  }
}
