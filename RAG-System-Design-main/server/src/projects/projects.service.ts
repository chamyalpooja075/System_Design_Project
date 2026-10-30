import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        userId,
      },
    });

    // Create an initial empty diagram version
    await this.prisma.diagram.create({
      data: {
        projectId: project.id,
        version: 1,
        nodes: '[]',
        edges: '[]',
      },
    });

    return project;
  }

  async findAllForUser(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
      include: {
        diagrams: {
          orderBy: { version: 'desc' },
          take: 1,
          select: {
            id: true,
            version: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(userId: string, projectId: string, isAdmin = false) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        diagrams: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Access denied: You do not own this architecture project');
    }

    return project;
  }

  async remove(userId: string, projectId: string, isAdmin = false) {
    await this.findOne(userId, projectId, isAdmin);

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { message: 'Project successfully deleted', projectId };
  }
}
