import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CritiqueRequestDto {
  @ApiProperty({ description: 'Array of React Flow nodes' })
  @IsArray()
  nodes: any[];

  @ApiProperty({ description: 'Array of React Flow edges' })
  @IsArray()
  edges: any[];

  @ApiProperty({ required: false, example: '50M DAU, global read-heavy architecture', description: 'System constraints or design goal' })
  @IsOptional()
  @IsString()
  systemContext?: string;

  @ApiProperty({ required: false, description: 'Optional project ID to emit status updates to' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ required: false, description: 'Optional socket ID to emit targeted real-time status updates to' })
  @IsOptional()
  @IsString()
  socketId?: string;

  @ApiProperty({ required: false, description: 'Whether to process analysis asynchronously via queue' })
  @IsOptional()
  @IsBoolean()
  async?: boolean;
}

