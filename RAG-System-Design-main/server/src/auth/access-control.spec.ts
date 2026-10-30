import { ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { DiagramsService } from '../diagrams/diagrams.service';
import { JwtStrategy, JwtPayload } from './jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('Authentication & Authorization Access Control Audit', () => {
  let projectsService: ProjectsService;
  let diagramsService: DiagramsService;
  let jwtStrategy: JwtStrategy;

  const mockPrisma: any = {
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    diagram: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((promises) => Promise.all(promises)),
  };

  const mockConfig: any = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      return null;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    projectsService = new ProjectsService(mockPrisma);
    diagramsService = new DiagramsService(mockPrisma);
    jwtStrategy = new JwtStrategy(mockConfig as ConfigService, mockPrisma);
  });

  describe('1. JWT Strategy & Token Validation (401 Unauthorized)', () => {
    it('should reject validation if user does not exist in database', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const payload: JwtPayload = { sub: 'non-existent-user-id', email: 'ghost@test.com', isAdmin: false };
      await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
      await expect(jwtStrategy.validate(payload)).rejects.toThrow('User no longer exists');
    });

    it('should validate and return active user profile', async () => {
      const activeUser = { id: 'user-123', email: 'user@test.com', name: 'Alice', isAdmin: false };
      mockPrisma.user.findUnique.mockResolvedValue(activeUser);

      const payload: JwtPayload = { sub: 'user-123', email: 'user@test.com', isAdmin: false };
      const result = await jwtStrategy.validate(payload);
      expect(result).toEqual(activeUser);
    });
  });

  describe('2. Cross-User Resource Isolation (403 Forbidden)', () => {
    const userA_Id = 'user-alice-111';
    const userB_Id = 'user-bob-222';
    const projectB_Id = 'project-bob-999';

    const projectB = {
      id: projectB_Id,
      name: "Bob's High-Scale System",
      userId: userB_Id, // owned by Bob
      diagrams: [{ id: 'diag-1', version: 1, nodes: '[]', edges: '[]', metrics: null }],
    };

    it('should DENY User A from viewing User B project (403 Forbidden)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(projectB);

      await expect(projectsService.findOne(userA_Id, projectB_Id, false)).rejects.toThrow(ForbiddenException);
      await expect(projectsService.findOne(userA_Id, projectB_Id, false)).rejects.toThrow(
        'Access denied: You do not own this architecture project'
      );
    });

    it('should DENY User A from deleting User B project (403 Forbidden)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(projectB);

      await expect(projectsService.remove(userA_Id, projectB_Id, false)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.project.delete).not.toHaveBeenCalled();
    });

    it('should DENY User A from reading User B diagram (403 Forbidden)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(projectB);

      await expect(diagramsService.getLatest(userA_Id, projectB_Id, false)).rejects.toThrow(ForbiddenException);
      await expect(diagramsService.getLatest(userA_Id, projectB_Id, false)).rejects.toThrow(
        'Access denied: You do not own this project'
      );
    });

    it('should DENY User A from reading User B diagram version history (403 Forbidden)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(projectB);

      await expect(diagramsService.getHistory(userA_Id, projectB_Id, false)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.diagram.findMany).not.toHaveBeenCalled();
    });

    it('should DENY User A from reading a specific version of User B diagram (403 Forbidden)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(projectB);

      await expect(diagramsService.getByVersion(userA_Id, projectB_Id, 1, false)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.diagram.findFirst).not.toHaveBeenCalled();
    });

    it('should DENY User A from saving/modifying User B diagram (403 Forbidden)', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(projectB);

      await expect(
        diagramsService.save(userA_Id, projectB_Id, { nodes: [], edges: [] }, false)
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.diagram.create).not.toHaveBeenCalled();
    });
  });

  describe('3. Parameter Tampering & Unknown IDs (404 Not Found)', () => {
    it('should return 404 when project ID is unknown or tampered', async () => {
      mockPrisma.project.findUnique.mockResolvedValue(null);

      await expect(projectsService.findOne('user-1', 'tampered-uuid-999', false)).rejects.toThrow(NotFoundException);
      await expect(diagramsService.getLatest('user-1', 'tampered-uuid-999', false)).rejects.toThrow(NotFoundException);
      await expect(diagramsService.getHistory('user-1', 'tampered-uuid-999', false)).rejects.toThrow(NotFoundException);
      await expect(diagramsService.getByVersion('user-1', 'tampered-uuid-999', 1, false)).rejects.toThrow(NotFoundException);
      await expect(diagramsService.save('user-1', 'tampered-uuid-999', { nodes: [], edges: [] }, false)).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Owner and Admin Authorization Checks', () => {
    it('should ALLOW the actual owner to access and modify their project', async () => {
      const userA_Id = 'user-alice-111';
      const projectA_Id = 'project-alice-111';
      const projectA = {
        id: projectA_Id,
        name: "Alice's Project",
        userId: userA_Id,
        diagrams: [{ id: 'diag-1', version: 1, nodes: '[]', edges: '[]', metrics: null }],
      };

      mockPrisma.project.findUnique.mockResolvedValue(projectA);

      const result = await projectsService.findOne(userA_Id, projectA_Id, false);
      expect(result.id).toBe(projectA_Id);

      const latestDiagram = await diagramsService.getLatest(userA_Id, projectA_Id, false);
      expect(latestDiagram.project.id).toBe(projectA_Id);
    });

    it('should ALLOW an admin to inspect resources across users for audit/moderation', async () => {
      const adminUserId = 'user-admin-000';
      const userB_Id = 'user-bob-222';
      const projectB_Id = 'project-bob-999';
      const projectB = {
        id: projectB_Id,
        name: "Bob's Project",
        userId: userB_Id,
        diagrams: [{ id: 'diag-1', version: 1, nodes: '[]', edges: '[]', metrics: null }],
      };

      mockPrisma.project.findUnique.mockResolvedValue(projectB);

      const result = await projectsService.findOne(adminUserId, projectB_Id, true);
      expect(result.id).toBe(projectB_Id);
    });
  });
});
