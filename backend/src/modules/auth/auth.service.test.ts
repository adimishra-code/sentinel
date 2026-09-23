import { describe, it, expect, vi } from 'vitest';
import * as authService from './auth.service';

vi.mock('./user.model', () => ({ User: { findOne: vi.fn(), create: vi.fn(), findById: vi.fn() } }));
vi.mock('../organizations/organization.model', () => ({ Organization: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../organizations/organization-member.model', () => ({ OrganizationMember: { findOne: vi.fn(), find: vi.fn(), create: vi.fn() } }));
vi.mock('./refresh-token.model', () => ({ RefreshToken: { findOne: vi.fn(), create: vi.fn() } }));
vi.mock('../../utils/logger', () => ({ default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() } }));

describe('AuthService', () => {
  it('exports register function', () => {
    expect(typeof authService.register).toBe('function');
  });

  it('exports login function', () => {
    expect(typeof authService.login).toBe('function');
  });

  it('exports logout function', () => {
    expect(typeof authService.logout).toBe('function');
  });

  it('exports getCurrentUser function', () => {
    expect(typeof authService.getCurrentUser).toBe('function');
  });
});