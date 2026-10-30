import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../auth/current-user.decorator';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new architecture design project' })
  @ApiResponse({ status: 201, description: 'Project successfully created' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all architecture projects owned by current user' })
  @ApiResponse({ status: 200, description: 'List of projects retrieved' })
  async findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.projectsService.findAllForUser(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details and latest diagram state' })
  @ApiResponse({ status: 200, description: 'Project retrieved' })
  @ApiResponse({ status: 403, description: 'Forbidden: not your project' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.findOne(user.id, id, user.isAdmin);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an architecture project and its diagrams' })
  @ApiResponse({ status: 200, description: 'Project deleted' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.projectsService.remove(user.id, id, user.isAdmin);
  }
}
