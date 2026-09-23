import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationsService } from './organizations.service';
import { Organization, OrganizationMember } from './organizations.model';
import { UserRole } from '../../types';

vi.mock('./organizations.model');
vi.mock('../../utils/logger');

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockOrgModel: any;
  let mockMemberModel: any;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationsService();
    mockOrgModel = vi.mocked(Organization);
    mockMemberModel = vi.mocked(OrganizationMember);
  });

  describe('create', () => {
    it('should create organization and owner membership', async () => {
      const mockOrg = { _id: 'org1', name: 'Test Org', slug: 'test-org', status: 'active' };
      const mockMember = { _id: 'member1', organizationId: 'org1', userId: 'user1', role: UserRole.ORG_ADMIN };

      mockOrgModel.create.mockResolvedValue(mockOrg);
      mockMemberModel.create.mockResolvedValue(mockMember);

      const result = await service.create({ name: 'Test Org', slug: 'test-org' }, 'user1');

      expect(result.name).toBe('Test Org');
      expect(mockOrgModel.create).toHaveBeenCalled();
      expect(mockMemberModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org1',
          userId: 'user1',
          role: UserRole.ORG_ADMIN,
        })
      );
    });
  });

  describe('addMember', () => {
    it('should add member with default role', async () => {
      const mockMember = { _id: 'member1', organizationId: 'org1', userId: 'user2', role: UserRole.MODERATOR };
      mockMemberModel.create.mockResolvedValue(mockMember);

      const result = await service.addMember('org1', 'user2', UserRole.MODERATOR);

      expect(result.userId).toBe('user2');
      expect(result.role).toBe(UserRole.MODERATOR);
    });

    it('should throw if user is already a member', async () => {
      mockMemberModel.findOne.mockResolvedValue({ _id: 'member1' });

      await expect(service.addMember('org1', 'user2', UserRole.MODERATOR)).rejects.toThrow('User is already a member');
    });
  });

  describe('removeMember', () => {
    it('should remove member', async () => {
      mockMemberModel.findOneAndDelete.mockResolvedValue({ _id: 'member1' });

      const result = await service.removeMember('org1', 'user2', 'user1');

      expect(result).toBe(true);
    });

    it('should prevent removing last org admin', async () => {
      mockMemberModel.findOne.mockResolvedValue({ _id: 'member1', role: UserRole.ORG_ADMIN });
      mockMemberModel.countDocuments.mockResolvedValue(1);

      await expect(service.removeMember('org1', 'user1', 'user1')).rejects.toThrow('Cannot remove the last organization admin');
    });
  });

  describe('updateMemberRole', () => {
    it('should update member role and permissions', async () => {
      const mockMember = { _id: 'member1', organizationId: 'org1', userId: 'user2', role: UserRole.REVIEWER, permissions: [], save: vi.fn().mockResolvedValue(true) };
      mockMemberModel.findOne.mockResolvedValue(mockMember);

      const result = await service.updateMemberRole('org1', 'user2', UserRole.MODERATOR);

      expect(result.role).toBe(UserRole.MODERATOR);
      expect(mockMember.save).toHaveBeenCalled();
    });
  });
});