import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveDiagramDto } from './dto/save-diagram.dto';

@Injectable()
export class DiagramsService {
  constructor(private readonly prisma: PrismaService) {}

  async save(userId: string, projectId: string, dto: SaveDiagramDto, isAdmin = false) {
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
      throw new ForbiddenException('Access denied: You do not own this project');
    }

    const nextVersion = project.diagrams.length > 0 ? project.diagrams[0].version + 1 : 1;

    const [diagram] = await this.prisma.$transaction([
      this.prisma.diagram.create({
        data: {
          projectId,
          version: nextVersion,
          nodes: typeof dto.nodes === 'string' ? dto.nodes : JSON.stringify(dto.nodes),
          edges: typeof dto.edges === 'string' ? dto.edges : JSON.stringify(dto.edges),
          metrics: dto.metrics ? (typeof dto.metrics === 'string' ? dto.metrics : JSON.stringify(dto.metrics)) : null,
        },
      }),
      this.prisma.project.update({
        where: { id: projectId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return {
      message: 'Diagram state successfully saved',
      version: diagram.version,
      diagramId: diagram.id,
      savedAt: diagram.createdAt,
    };
  }

  async getLatest(userId: string, projectId: string, isAdmin = false) {
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
      throw new ForbiddenException('Access denied: You do not own this project');
    }

    const latestDiagram = project.diagrams[0] || null;
    let parsedDiagram = null;
    if (latestDiagram) {
      try {
        parsedDiagram = {
          ...latestDiagram,
          nodes: typeof latestDiagram.nodes === 'string' ? JSON.parse(latestDiagram.nodes) : latestDiagram.nodes,
          edges: typeof latestDiagram.edges === 'string' ? JSON.parse(latestDiagram.edges) : latestDiagram.edges,
          metrics: latestDiagram.metrics && typeof latestDiagram.metrics === 'string' ? JSON.parse(latestDiagram.metrics) : latestDiagram.metrics,
        };
      } catch {
        parsedDiagram = latestDiagram;
      }
    }

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        updatedAt: project.updatedAt,
      },
      diagram: parsedDiagram,
    };
  }

  async getHistory(userId: string, projectId: string, isAdmin = false) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Access denied: You do not own this project');
    }

    return this.prisma.diagram.findMany({
      where: { projectId },
      orderBy: { version: 'desc' },
      select: {
        id: true,
        version: true,
        createdAt: true,
      },
    });
  }

  async getByVersion(userId: string, projectId: string, version: number, isAdmin = false) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (project.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Access denied: You do not own this project');
    }

    const diagram = await this.prisma.diagram.findFirst({
      where: { projectId, version },
    });

    if (!diagram) {
      throw new NotFoundException(`Diagram version ${version} not found`);
    }

    return {
      ...diagram,
      nodes: typeof diagram.nodes === 'string' ? JSON.parse(diagram.nodes) : diagram.nodes,
      edges: typeof diagram.edges === 'string' ? JSON.parse(diagram.edges) : diagram.edges,
      metrics: diagram.metrics && typeof diagram.metrics === 'string' ? JSON.parse(diagram.metrics) : diagram.metrics,
    };
  }
}
