import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { EvaluateMetricsDto } from './dto/evaluate-metrics.dto';

@ApiTags('Metrics')
@Controller('api/metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Evaluate deterministic architecture graph metrics' })
  @ApiResponse({ status: 200, description: 'Deterministic metrics calculated' })
  evaluate(@Body() dto: EvaluateMetricsDto) {
    return this.metricsService.evaluate(dto.nodes, dto.edges);
  }
}
