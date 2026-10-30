import { Module, Global } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { RagService } from './rag.service';

@Global()
@Module({
  providers: [EmbeddingService, RagService],
  exports: [EmbeddingService, RagService],
})
export class RagModule {}
