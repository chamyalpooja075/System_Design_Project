import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { DiagramsModule } from './diagrams/diagrams.module';
import { MetricsModule } from './metrics/metrics.module';
import { RedisModule } from './redis/redis.module';
import { GatewayModule } from './gateway/gateway.module';
import { RulesModule } from './rules/rules.module';
import { RagModule } from './rag/rag.module';
import { QueueModule } from './queue/queue.module';
import { AiModule } from './ai/ai.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    RedisModule,
    GatewayModule,
    RulesModule,
    RagModule,
    QueueModule,
    AuthModule,
    ProjectsModule,
    DiagramsModule,
    MetricsModule,
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
