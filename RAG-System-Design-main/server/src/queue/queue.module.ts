import { Module, Global } from '@nestjs/common';
import { RedpandaProducerService } from './redpanda-producer.service';
import { AnalysisWorker } from './analysis.worker';
import { JobStoreService } from './job-store.service';
import { AiModule } from '../ai/ai.module';

@Global()
@Module({
  imports: [AiModule],
  providers: [JobStoreService, RedpandaProducerService, AnalysisWorker],
  exports: [JobStoreService, RedpandaProducerService, AnalysisWorker],
})
export class QueueModule {}
