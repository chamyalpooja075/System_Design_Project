import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProjectDto {
  @ApiProperty({ example: 'Scalable WhatsApp System Design', description: 'Name of the architecture project' })
  @IsString()
  @IsNotEmpty({ message: 'Project name is required' })
  name: string;

  @ApiProperty({ example: 'High-concurrency chat architecture with Kafka and Redis', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
