/**
 * Policies Service
 * Manages policy lifecycle and versioning
 */

import { Policy, PolicyVersion, IPolicy, IPolicyCategory } from './policy.model';
import { AppError } from '../../middleware/errorHandler';
import { PolicyStatus } from '../../types';
import logger from '../../utils/logger';

export interface CreatePolicyInput {
  name: string;
  description?: string;
  categories: IPolicyCategory[];
  rules?: Record<string, unknown>;
}

export interface UpdatePolicyInput {
  name?: string;
  description?: string;
  categories?: IPolicyCategory[];
  rules?: Record<string, unknown>;
}

/**
 * Create a new policy draft
 */
export const createPolicy = async (
  organizationId: string,
  input: CreatePolicyInput
) => {
  const policy = await Policy.create({
    organizationId,
    name: input.name,
    description: input.description,
    status: PolicyStatus.DRAFT,
    currentVersion: 1,
  });

  await PolicyVersion.create({
    policyId: policy._id,
    organizationId,
    version: 1,
    categories: input.categories,
    rules: input.rules || {},
    effectiveFrom: new Date(),
  });

  logger.info('Policy created', { policyId: policy._id, organizationId });

  return getPolicy(policy._id.toString(), organizationId);
};

/**
 * Get policy by ID
 */
export const getPolicy = async (policyId: string, organizationId: string) => {
  const policy = await Policy.findOne({ _id: policyId, organizationId });
  if (!policy) throw AppError.notFound('Policy not found');

  const currentVersion = await PolicyVersion.findOne({
    policyId: policy._id,
    version: policy.currentVersion,
  });

  return {
    id: policy._id.toString(),
    name: policy.name,
    description: policy.description,
    status: policy.status,
    currentVersion: policy.currentVersion,
    categories: currentVersion?.categories || [],
    rules: currentVersion?.rules || {},
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
  };
};

/**
 * List policies for organization
 */
export const listPolicies = async (
  organizationId: string,
  options: { status?: PolicyStatus; page?: number; limit?: number } = {}
) => {
  const page = options.page || 1;
  const limit = Math.min(options.limit || 20, 100);
  const skip = (page - 1) * limit;

  const filter: any = { organizationId };
  if (options.status) filter.status = options.status;

  const [items, total] = await Promise.all([
    Policy.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Policy.countDocuments(filter),
  ]);

  return {
    items: items.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description,
      status: p.status,
      currentVersion: p.currentVersion,
      createdAt: p.createdAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update policy (creates a new version draft, does not activate)
 */
export const updatePolicy = async (
  policyId: string,
  organizationId: string,
  input: UpdatePolicyInput
) => {
  const policy = await Policy.findOne({ _id: policyId, organizationId });
  if (!policy) throw AppError.notFound('Policy not found');

  if (input.name) policy.name = input.name;
  if (input.description !== undefined) policy.description = input.description;
  await policy.save();

  if (input.categories) {
    const newVersion = policy.currentVersion + 1;
    await PolicyVersion.create({
      policyId: policy._id,
      organizationId,
      version: newVersion,
      categories: input.categories,
      rules: input.rules || {},
      effectiveFrom: new Date(),
    });
    policy.currentVersion = newVersion;
    await policy.save();
  }

  return getPolicy(policyId, organizationId);
};

/**
 * Activate a policy (make it live)
 */
export const activatePolicy = async (policyId: string, organizationId: string) => {
  const policy = await Policy.findOne({ _id: policyId, organizationId });
  if (!policy) throw AppError.notFound('Policy not found');

  if (policy.status === PolicyStatus.ACTIVE) {
    throw AppError.badRequest('Policy is already active');
  }

  // Deactivate existing active policies for the org
  await Policy.updateMany(
    { organizationId, status: PolicyStatus.ACTIVE },
    { status: PolicyStatus.ARCHIVED }
  );

  policy.status = PolicyStatus.ACTIVE;
  await policy.save();

  logger.info('Policy activated', { policyId, organizationId });

  return getPolicy(policyId, organizationId);
};

/**
 * Archive a policy
 */
export const archivePolicy = async (policyId: string, organizationId: string) => {
  const policy = await Policy.findOne({ _id: policyId, organizationId });
  if (!policy) throw AppError.notFound('Policy not found');

  policy.status = PolicyStatus.ARCHIVED;
  await policy.save();

  return getPolicy(policyId, organizationId);
};

/**
 * Get policy version history
 */
export const getPolicyVersions = async (policyId: string, organizationId: string) => {
  const policy = await Policy.findOne({ _id: policyId, organizationId });
  if (!policy) throw AppError.notFound('Policy not found');

  const versions = await PolicyVersion.find({ policyId }).sort({ version: -1 }).lean();

  return versions.map((v) => ({
    version: v.version,
    categories: v.categories,
    rules: v.rules,
    effectiveFrom: v.effectiveFrom,
    effectiveUntil: v.effectiveUntil,
    createdAt: v.createdAt,
  }));
};

/**
 * Get the active policy for an organization
 */
export const getActivePolicy = async (organizationId: string) => {
  const policy = await Policy.findOne({ organizationId, status: PolicyStatus.ACTIVE });
  if (!policy) return null;

  const currentVersion = await PolicyVersion.findOne({
    policyId: policy._id,
    version: policy.currentVersion,
  });

  return {
    id: policy._id.toString(),
    name: policy.name,
    categories: currentVersion?.categories || [],
    rules: currentVersion?.rules || {},
    version: policy.currentVersion,
  };
};
