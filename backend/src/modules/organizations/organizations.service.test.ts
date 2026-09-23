import { describe, it, expect, vi } from 'vitest';
import * as orgsService from './organizations.service';

vi.mock('./organization.model', () => ({ Organization: { findOne: vi.fn(), findById: vi.fn(), create: vi.fn(), find: vi.fn(), countDocuments: vi.fn() } }));
vi.mock('./organization-member.model', () => ({ OrganizationMember: { findOne: vi.fn(), find: vi.fn(), create: vi.fn(), countDocuments: vi.fn() } }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

describe('OrganizationsService', () => {
  it('exports getOrganization function', () => {
    expect(typeof orgsService.getOrganization).toBe('function');
  });

  it('exports updateOrganization function', () => {
    expect(typeof orgsService.updateOrganization).toBe('function');
  });
});