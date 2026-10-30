import { Module } from '@nestjs/common';
import { MetricsModule } from '../metrics/metrics.module';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';

@Module({
  imports: [MetricsModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
