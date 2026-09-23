import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service';
import { User } from './auth.model';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

vi.mock('./auth.model');
vi.mock('bcrypt');
vi.mock('jsonwebtoken');
vi.mock('../../utils/logger');

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserModel: any;
  let mockBcrypt: any;
  let mockJwt: any;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService();
    mockUserModel = vi.mocked(User);
    mockBcrypt = vi.mocked(bcrypt);
    mockJwt = vi.mocked(jwt);
  });

  describe('register', () => {
    it('should create user and organization', async () => {
      const mockUser = { _id: 'user1', email: 'test@test.com', name: 'Test', passwordHash: 'hashed' };
      const mockOrg = { _id: 'org1', name: 'Test Org', slug: 'test-org' };

      mockUserModel.findOne.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed');
      mockUserModel.create.mockResolvedValue(mockUser);
      mockOrg.create.mockResolvedValue(mockOrg);
      mockJwt.sign.mockReturnValue('token');

      const result = await authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test',
        organizationName: 'Test Org',
      });

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw if email already exists', async () => {
      mockUserModel.findOne.mockResolvedValue({ _id: 'user1' });

      await expect(authService.register({
        email: 'test@test.com',
        password: 'password123',
        name: 'Test',
        organizationName: 'Test Org',
      })).rejects.toThrow('Email already registered');
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const mockUser = { _id: 'user1', email: 'test@test.com', name: 'Test', passwordHash: 'hashed', organizationId: 'org1' };
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('token');

      const result = await authService.login('test@test.com', 'password123');

      expect(result.user.email).toBe('test@test.com');
      expect(result.accessToken).toBeDefined();
    });

    it('should throw for invalid password', async () => {
      const mockUser = { _id: 'user1', email: 'test@test.com', name: 'Test', passwordHash: 'hashed' };
      mockUserModel.findOne.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authService.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });

    it('should throw for non-existent user', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      await expect(authService.login('test@test.com', 'password')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      const mockUser = { _id: 'user1', email: 'test@test.com', name: 'Test', organizationId: 'org1', status: 'active' };
      mockJwt.verify.mockReturnValue({ userId: 'user1', tokenType: 'refresh' });
      mockUserModel.findById.mockResolvedValue(mockUser);
      mockJwt.sign.mockReturnValue('new-token');

      const result = await authService.refreshToken('valid-refresh-token');

      expect(result.accessToken).toBe('new-token');
      expect(result.refreshToken).toBe('new-token');
    });

    it('should throw for invalid token', async () => {
      mockJwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });

      await expect(authService.refreshToken('invalid')).rejects.toThrow('Invalid refresh token');
    });
  });
});