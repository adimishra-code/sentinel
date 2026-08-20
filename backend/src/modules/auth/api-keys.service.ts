import { ApiKey } from '../auth/api-key.model';
import { OrganizationMember } from '../organizations/organization-member.model';
import { AppError } from '../../middleware/errorHandler';
import { generateApiKey } from '../auth/auth.utils';
import { hasPermission } from '../auth/permissions.utils';
import { PERMISSIONS } from '../../types';
import logger from '../../utils/logger';

export interface CreateApiKeyInput {
  name: string;
  permissions: string[];
  expiresInDays?: number;
}

/**
 * Generate new API key
 */
export const createApiKey = async (
  organizationId: string,
  userId: string,
  input: CreateApiKeyInput
) => {
  const { name, permissions, expiresInDays } = input;

  // Verify user has permission to create API keys
  const membership = await OrganizationMember.findOne({
    organizationId,
    userId,
  });

  if (!membership) {
    throw AppError.forbidden('Not a member of this organization');
  }

  if (!hasPermission(membership.role, membership.permissions, PERMISSIONS.API_KEY_CREATE)) {
    throw AppError.forbidden('Missing permission: api_key:create');
  }

  // Generate API key
  const { key, hash, prefix } = generateApiKey();

  // Calculate expiration
  let expiresAt: Date | undefined;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  // Create API key record
  const apiKey = await ApiKey.create({
    organizationId,
    name,
    keyHash: hash,
    keyPrefix: prefix,
    status: 'active',
    permissions,
    expiresAt,
  });

  logger.info('API key created', {
    apiKeyId: apiKey._id,
    organizationId,
    userId,
    name,
  });

  // Return the actual key (only time it's shown)
  return {
    id: apiKey._id.toString(),
    key, // Only returned on creation
    keyPrefix: apiKey.keyPrefix,
    name: apiKey.name,
    permissions: apiKey.permissions,
    expiresAt: apiKey.expiresAt,
    createdAt: apiKey.createdAt,
    warning: 'Save this key securely. It will not be shown again.',
  };
};

/**
 * List organization API keys
 */
export const listApiKeys = async (organizationId: string, userId: string) => {
  // Verify user is a member
  const membership = await OrganizationMember.findOne({
    organizationId,
    userId,
  });

  if (!membership) {
    throw AppError.forbidden('Not a member of this organization');
  }

  const apiKeys = await ApiKey.find({ organizationId }).sort({ createdAt: -1 });

  return apiKeys.map((key) => ({
    id: key._id.toString(),
    keyPrefix: key.keyPrefix,
    name: key.name,
    status: key.status,
    permissions: key.permissions,
    expiresAt: key.expiresAt,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
  }));
};

/**
 * Revoke API key
 */
export const revokeApiKey = async (
  apiKeyId: string,
  organizationId: string,
  userId: string
) => {
  const apiKey = await ApiKey.findById(apiKeyId);

  if (!apiKey) {
    throw AppError.notFound('API key not found');
  }

  if (apiKey.organizationId.toString() !== organizationId) {
    throw AppError.forbidden('API key does not belong to this organization');
  }

  // Verify user has permission
  const membership = await OrganizationMember.findOne({
    organizationId,
    userId,
  });

  if (!membership) {
    throw AppError.forbidden('Not a member of this organization');
  }

  if (!hasPermission(membership.role, membership.permissions, PERMISSIONS.API_KEY_REVOKE)) {
    throw AppError.forbidden('Missing permission: api_key:revoke');
  }

  apiKey.status = 'revoked';
  await apiKey.save();

  logger.info('API key revoked', {
    apiKeyId,
    organizationId,
    userId,
  });

  return {
    message: 'API key revoked successfully',
  };
};
