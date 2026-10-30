import { IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EvaluateMetricsDto {
  @ApiProperty({ description: 'Array of React Flow nodes with architectural data' })
  @IsArray()
  nodes: any[];

  @ApiProperty({ description: 'Array of React Flow edges with protocols' })
  @IsArray()
  edges: any[];
}
