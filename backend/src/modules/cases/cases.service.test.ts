import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CasesService } from './cases.service';
import { Case } from './cases.model';
import { CaseStatus, CasePriority } from '../../types';

vi.mock('./cases.model');
vi.mock('../../utils/logger');
vi.mock('../../utils/socket');

describe('CasesService', () => {
  let service: CasesService;
  let mockCaseModel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CasesService();
    mockCaseModel = vi.mocked(Case);
  });

  describe('listCases', () => {
    it('should return paginated cases', async () => {
      const mockCases = [
        { _id: 'case1', id: 'CASE-001', status: CaseStatus.PENDING, priority: CasePriority.HIGH },
        { _id: 'case2', id: 'CASE-002', status: CaseStatus.IN_REVIEW, priority: CasePriority.MEDIUM },
      ];
      mockCaseModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockCases),
      });
      mockCaseModel.countDocuments.mockResolvedValue(2);

      const result = await service.listCases({ page: 1, limit: 10 });

      expect(result.cases).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockCaseModel.find.mockReturnValue({
        sort: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      });
      mockCaseModel.countDocuments.mockResolvedValue(0);

      await service.listCases({ page: 1, limit: 10, status: CaseStatus.PENDING });

      expect(mockCaseModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ status: CaseStatus.PENDING })
      );
    });
  });

  describe('getCase', () => {
    it('should return case by id', async () => {
      const mockCase = { _id: 'case1', id: 'CASE-001', status: CaseStatus.PENDING };
      mockCaseModel.findById.mockResolvedValue(mockCase);

      const result = await service.getCase('case1');

      expect(result.id).toBe('CASE-001');
    });

    it('should throw if case not found', async () => {
      mockCaseModel.findById.mockResolvedValue(null);

      await expect(service.getCase('nonexistent')).rejects.toThrow('Case not found');
    });
  });

  describe('assignCase', () => {
    it('should assign case to user', async () => {
      const mockCase = {
        _id: 'case1',
        id: 'CASE-001',
        status: CaseStatus.PENDING,
        assignedTo: undefined,
        assignedAt: undefined,
        save: vi.fn().mockResolvedValue(true),
      };
      mockCaseModel.findById.mockResolvedValue(mockCase);

      const result = await service.assignCase('case1', 'user1');

      expect(result.assignedTo).toBe('user1');
      expect(result.assignedAt).toBeDefined();
      expect(result.status).toBe(CaseStatus.IN_REVIEW);
    });
  });

  describe('resolveCase', () => {
    it('should resolve case with decision', async () => {
      const mockCase = {
        _id: 'case1',
        id: 'CASE-001',
        status: CaseStatus.IN_REVIEW,
        resolvedAt: undefined,
        resolvedBy: undefined,
        save: vi.fn().mockResolvedValue(true),
      };
      mockCaseModel.findById.mockResolvedValue(mockCase);

      const result = await service.resolveCase('case1', 'user1', 'remove', 'Violates policy');

      expect(result.status).toBe(CaseStatus.RESOLVED);
      expect(result.resolvedBy).toBe('user1');
      expect(result.resolvedAt).toBeDefined();
    });
  });
});