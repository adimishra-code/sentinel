import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from './auth.service';

vi.mock('./user.model', () => ({
  User: {
    findOne: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
  },
}));
vi.mock('./password-reset-token.model', () => ({
  PasswordResetToken: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
  },
}));
vi.mock('./refresh-token.model', () => ({
  RefreshToken: {
    findOne: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    findById: vi.fn(),
  },
}));
vi.mock('./totp-secret.model', () => ({
  TotpSecret: {
    findOne: vi.fn(),
    create: vi.fn(),
  },
}));
vi.mock('../../utils/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));
vi.mock('../notifications/notifications.service', () => ({
  notify: vi.fn(() => Promise.resolve()),
}));
vi.mock('./auth.utils', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  hashToken: vi.fn(),
  encryptSecret: vi.fn(),
  decryptSecret: vi.fn(),
  generateAccessToken: vi.fn(),
  generateRefreshToken: vi.fn(),
}));

import { User } from './user.model';
import { PasswordResetToken } from './password-reset-token.model';
import { RefreshToken } from './refresh-token.model';
import { TotpSecret } from './totp-secret.model';
import { notify } from '../notifications/notifications.service';
import {
  hashPassword,
  comparePassword,
  hashToken,
  encryptSecret,
  decryptSecret,
  generateAccessToken,
  generateRefreshToken,
} from './auth.utils';

const mockUser = (overrides: any = {}) => ({
  _id: 'user_123',
  passwordHash: 'old-hash',
  email: 'a@b.com',
  save: vi.fn(),
  ...overrides,
});

const chainable = (val: any) => ({ select: vi.fn().mockResolvedValue(val) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(hashPassword).mockResolvedValue('hashed-new-password');
  vi.mocked(comparePassword).mockResolvedValue(true);
  vi.mocked(hashToken).mockImplementation((t: string) => `hash:${t}`);
  vi.mocked(encryptSecret).mockImplementation((s: string) => `iv:${s}:encrypted`);
  vi.mocked(decryptSecret).mockImplementation((s: string) => {
    const parts = s.split(':');
    return parts[parts.length - 1] === 'encrypted' ? parts[1] : s;
  });
  vi.mocked(generateAccessToken).mockReturnValue('access-token');
  vi.mocked(generateRefreshToken).mockReturnValue('refresh-token');
  vi.mocked(notify).mockResolvedValue(undefined);
});

describe('AuthService security', () => {
  describe('changePassword', () => {
    it('rejects wrong current password', async () => {
      (User.findById as any).mockReturnValue(chainable(mockUser()));
      vi.mocked(comparePassword).mockResolvedValue(false);

      await expect(
        authService.changePassword('user_123', 'wrong', 'newpassword123')
      ).rejects.toThrow(/incorrect/);
    });

    it('hashes new password and revokes sessions on success', async () => {
      const user = mockUser();
      (User.findById as any).mockReturnValue(chainable(user));
      vi.mocked(comparePassword).mockResolvedValue(true);
      (RefreshToken.updateMany as any).mockResolvedValue({});

      await authService.changePassword('user_123', 'current', 'newpassword123');

      expect(hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(user.passwordHash).toBe('hashed-new-password');
      expect(user.save).toHaveBeenCalled();
      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        { userId: 'user_123', revoked: false },
        { revoked: true }
      );
      expect(notify).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('does not reveal whether email exists', async () => {
      (User.findOne as any).mockReturnValue(chainable(null));
      await expect(
        authService.forgotPassword('nonexistent@test.com')
      ).resolves.toBeUndefined();
      expect(PasswordResetToken.create).not.toHaveBeenCalled();
    });

    it('creates a reset token for existing user', async () => {
      (User.findOne as any).mockReturnValue(chainable({ _id: 'user_123' }));
      (PasswordResetToken.updateMany as any).mockResolvedValue({});
      (PasswordResetToken.create as any).mockResolvedValue({});

      await authService.forgotPassword('existing@test.com');

      expect(PasswordResetToken.create).toHaveBeenCalled();
      const call = (PasswordResetToken.create as any).mock.calls[0][0];
      expect(call.userId).toBe('user_123');
      expect(call.used).toBe(false);
      expect(call.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('resetPassword', () => {
    it('rejects invalid or expired token', async () => {
      (PasswordResetToken.findOne as any).mockResolvedValue(null);
      await expect(
        authService.resetPassword('badtoken', 'newpassword123')
      ).rejects.toThrow(/Invalid or expired/);
    });

    it('resets password and revokes sessions on valid token', async () => {
      const resetToken = { _id: 'rt', userId: 'user_123', used: false, save: vi.fn() };
      (PasswordResetToken.findOne as any).mockResolvedValue(resetToken);
      const user = mockUser();
      (User.findById as any).mockReturnValue(chainable(user));
      (RefreshToken.updateMany as any).mockResolvedValue({});

      await authService.resetPassword('validtoken', 'newpassword123');

      expect(hashPassword).toHaveBeenCalledWith('newpassword123');
      expect(resetToken.used).toBe(true);
      expect(resetToken.save).toHaveBeenCalled();
      expect(RefreshToken.updateMany).toHaveBeenCalledWith(
        { userId: 'user_123', revoked: false },
        { revoked: true }
      );
    });
  });
});
