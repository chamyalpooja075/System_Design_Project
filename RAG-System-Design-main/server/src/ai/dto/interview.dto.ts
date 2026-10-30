import { IsArray, IsOptional, IsNumber, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateInterviewQuestionsDto {
  @ApiProperty({ description: 'Raw nodes from React Flow graph' })
  @IsArray()
  nodes: any[];

  @ApiProperty({ description: 'Raw edges from React Flow graph' })
  @IsArray()
  edges: any[];

  @ApiPropertyOptional({ description: 'Number of questions to generate (5 or 10)', default: 5 })
  @IsOptional()
  @IsNumber()
  count?: number;

  @ApiPropertyOptional({ description: 'System context or architecture description' })
  @IsOptional()
  @IsString()
  systemContext?: string;
}

export class EvaluateInterviewAnswerDto {
  @ApiProperty({ description: 'Question ID' })
  @IsString()
  @IsNotEmpty()
  questionId: string;

  @ApiProperty({ description: 'The question asked' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: 'The ideal model answer' })
  @IsString()
  @IsNotEmpty()
  idealAnswer: string;

  @ApiPropertyOptional({ description: 'Key technical concepts expected' })
  @IsOptional()
  @IsArray()
  keyConcepts?: string[];

  @ApiProperty({ description: 'Student typed answer' })
  @IsString()
  @IsNotEmpty()
  userAnswer: string;

  @ApiPropertyOptional({ description: 'Raw nodes' })
  @IsOptional()
  @IsArray()
  nodes?: any[];

  @ApiPropertyOptional({ description: 'Raw edges' })
  @IsOptional()
  @IsArray()
  edges?: any[];
}
