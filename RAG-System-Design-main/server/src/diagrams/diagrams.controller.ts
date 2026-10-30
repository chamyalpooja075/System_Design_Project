import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DiagramsService } from './diagrams.service';
import { SaveDiagramDto } from './dto/save-diagram.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@ApiTags('Diagrams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/diagrams')
export class DiagramsController {
  constructor(private readonly diagramsService: DiagramsService) {}

  @Post(':projectId/save')
  @ApiOperation({ summary: 'Save new versioned snapshot of the architecture diagram' })
  @ApiResponse({ status: 201, description: 'Diagram saved successfully' })
  async save(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: SaveDiagramDto,
  ) {
    return this.diagramsService.save(user.id, projectId, dto, user.isAdmin);
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Retrieve current/latest diagram state for a project' })
  @ApiResponse({ status: 200, description: 'Latest diagram state returned' })
  async getLatest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.diagramsService.getLatest(user.id, projectId, user.isAdmin);
  }

  @Get(':projectId/history')
  @ApiOperation({ summary: 'Get list of historical version snapshots for a project' })
  @ApiResponse({ status: 200, description: 'Version history returned' })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
  ) {
    return this.diagramsService.getHistory(user.id, projectId, user.isAdmin);
  }

  @Get(':projectId/version/:version')
  @ApiOperation({ summary: 'Retrieve a specific historical version snapshot' })
  @ApiResponse({ status: 200, description: 'Historical diagram version returned' })
  async getByVersion(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Param('version') version: string,
  ) {
    return this.diagramsService.getByVersion(user.id, projectId, parseInt(version, 10), user.isAdmin);
  }
}
