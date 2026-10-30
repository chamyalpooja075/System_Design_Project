import { IsArray, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SaveDiagramDto {
  @ApiProperty({ description: 'Array of React Flow nodes with metadata' })
  @IsArray()
  nodes: any[];

  @ApiProperty({ description: 'Array of React Flow edges with protocol attributes' })
  @IsArray()
  edges: any[];

  @ApiProperty({ required: false, description: 'Calculated deterministic metrics summary' })
  @IsOptional()
  metrics?: Record<string, any>;
}
