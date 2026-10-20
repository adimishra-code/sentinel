/**
 * RBAC Matrix Integration Tests
 *
 * Verifies that route access is correctly allowed or denied based on
 * the user's role, per the ROLE_PERMISSIONS matrix in types/constants.ts.
 */

import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app';
import { Organization } from '../modules/organizations/organization.model';
import { User } from '../modules/auth/user.model';
import { OrganizationMember } from '../modules/organizations/organization-member.model';
import { Content } from '../modules/content/content.model';
import { Case } from '../modules/cases/case.model';
import { Appeal } from '../modules/appeals/appeal.model';
import { generateAccessToken } from '../modules/auth/auth.utils';
import { UserRole } from '../types';

let mongod: MongoMemoryServer;
let orgId: string;
const users: Record<string, { id: string; token: string }> = {};

const createUser = async (email: string, name: string, role: string, permissions: string[] = []) => {
  const user = await User.create({ email, passwordHash: 'hash', name, status: 'active' });
  await OrganizationMember.create({ organizationId: orgId, userId: user._id, role: role as any, permissions });
  const token = generateAccessToken(user._id.toString(), email);
  users[role] = { id: user._id.toString(), token };
};

const call = (method: string, url: string, token: string | null, body?: any) => {
  return new Promise<{ status: number; body: any }>((resolve) => {
    const r = request(app)[method as 'get' | 'post' | 'delete' | 'patch'](`/api/v1${url}`);
    if (token) r.set('Authorization', `Bearer ${token}`);
    if (body) r.send(body);
    r.end((err, res) => {
      if (err) resolve({ status: 0, body: {} });
      else resolve({ status: res.statusCode, body: res.body || {} });
    });
  });
};

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  const org = await Organization.create({ name: 'RBAC Org', slug: 'rbac-org', status: 'active' });
  orgId = org._id.toString();

  await createUser('admin@test.com', 'Admin', UserRole.ORG_ADMIN);
  await createUser('mod@test.com', 'Moderator', UserRole.MODERATOR);
  await createUser('rev@test.com', 'Reviewer', UserRole.REVIEWER);
  await createUser('enduser@test.com', 'End User', UserRole.END_USER);
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

describe('RBAC matrix', () => {
  describe('GET /cases (CASE_READ)', () => {
    it('org_admin can access', async () => {
      const res = await call('get', '/cases', users.org_admin.token);
      expect(res.status).toBe(200);
    });
    it('moderator can access', async () => {
      const res = await call('get', '/cases', users.moderator.token);
      expect(res.status).toBe(200);
    });
    it('reviewer can access', async () => {
      const res = await call('get', '/cases', users.reviewer.token);
      expect(res.status).toBe(200);
    });
    it('end_user cannot access', async () => {
      const res = await call('get', '/cases', users.end_user.token);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /cases/:id/resolve (CASE_RESOLVE)', () => {
    let caseId: string;
    beforeAll(async () => {
      const content = await Content.create({ organizationId: orgId, contentType: 'text', text: 'test' });
      const c = await Case.create({ organizationId: orgId, contentId: content._id, status: 'pending', priority: 'high', riskScore: 0.9, categories: ['threat_direct'] });
      caseId = c._id.toString();
    });
    it('org_admin can access', async () => {
      const res = await call('post', `/cases/${caseId}/resolve`, users.org_admin.token, { action: 'remove', rationale: 'Test rationale long enough' });
      expect([200, 404]).toContain(res.status);
    });
    it('moderator can access', async () => {
      const res = await call('post', `/cases/${caseId}/resolve`, users.moderator.token, { action: 'remove', rationale: 'Test rationale long enough' });
      expect([200, 404]).toContain(res.status);
    });
    it('reviewer cannot access', async () => {
      const res = await call('post', `/cases/${caseId}/resolve`, users.reviewer.token, { action: 'remove', rationale: 'Test rationale long enough' });
      expect(res.status).toBe(403);
    });
    it('end_user cannot access', async () => {
      const res = await call('post', `/cases/${caseId}/resolve`, users.end_user.token, { action: 'remove', rationale: 'Test rationale long enough' });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api-keys (API_KEY_CREATE)', () => {
    it('org_admin can access', async () => {
      const res = await call('post', '/api-keys', users.org_admin.token, { name: 'test', permissions: ['content:read'] });
      expect(res.status).toBe(201);
    });
    it('moderator cannot access', async () => {
      const res = await call('post', '/api-keys', users.moderator.token, { name: 'test', permissions: ['content:read'] });
      expect(res.status).toBe(403);
    });
    it('reviewer cannot access', async () => {
      const res = await call('post', '/api-keys', users.reviewer.token, { name: 'test', permissions: ['content:read'] });
      expect(res.status).toBe(403);
    });
    it('end_user cannot access', async () => {
      const res = await call('post', '/api-keys', users.end_user.token, { name: 'test', permissions: ['content:read'] });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /appeals (APPEAL_SUBMIT)', () => {
    let caseId: string;
    beforeAll(async () => {
      const content = await Content.create({ organizationId: orgId, contentType: 'text', text: 'test' });
      const c = await Case.create({ organizationId: orgId, contentId: content._id, status: 'resolved', priority: 'medium', riskScore: 0.5, categories: ['toxicity'] });
      caseId = c._id.toString();
    });
    it('org_admin can submit', async () => {
      const res = await call('post', '/appeals', users.org_admin.token, { caseId, reason: 'Test appeal reason that is long enough' });
      expect([201, 409, 400]).toContain(res.status);
    });
    it('end_user can submit', async () => {
      const res = await call('post', '/appeals', users.end_user.token, { caseId, reason: 'Test appeal reason that is long enough' });
      expect([201, 409, 400]).toContain(res.status);
    });
  });

  describe('POST /policies (POLICY_WRITE)', () => {
    it('org_admin can access', async () => {
      const res = await call('post', '/policies', users.org_admin.token, {
        name: 'Test Policy',
        categories: [{ name: 'toxicity', severityThreshold: 0.5, firstOffenseAction: 'warn', repeatOffenseAction: 'remove', requiresHumanReview: false }],
      });
      expect(res.status).toBe(201);
    });
    it('moderator cannot access', async () => {
      const res = await call('post', '/policies', users.moderator.token, { name: 'Test', categories: [] });
      expect(res.status).toBe(403);
    });
    it('reviewer cannot access', async () => {
      const res = await call('post', '/policies', users.reviewer.token, { name: 'Test', categories: [] });
      expect(res.status).toBe(403);
    });
    it('end_user cannot access', async () => {
      const res = await call('post', '/policies', users.end_user.token, { name: 'Test', categories: [] });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /appeals/:id/resolve (APPEAL_RESOLVE)', () => {
    let appealId: string;
    beforeAll(async () => {
      const content = await Content.create({ organizationId: orgId, contentType: 'text', text: 'test' });
      const c = await Case.create({ organizationId: orgId, contentId: content._id, status: 'resolved', priority: 'medium', riskScore: 0.5, categories: ['toxicity'] });
      const a = await Appeal.create({ organizationId: orgId, caseId: c._id, userId: users.end_user.id, reason: 'Test appeal reason that is long enough', status: 'pending' });
      appealId = a._id.toString();
    });
    it('org_admin can access', async () => {
      const res = await call('post', `/appeals/${appealId}/resolve`, users.org_admin.token, { status: 'upheld', outcomeRationale: 'Test rationale that is long enough' });
      expect([200, 400, 404]).toContain(res.status);
    });
    it('reviewer can access', async () => {
      const res = await call('post', `/appeals/${appealId}/resolve`, users.reviewer.token, { status: 'upheld', outcomeRationale: 'Test rationale that is long enough' });
      expect([200, 400, 404]).toContain(res.status);
    });
    it('moderator cannot access', async () => {
      const res = await call('post', `/appeals/${appealId}/resolve`, users.moderator.token, { status: 'upheld', outcomeRationale: 'Test rationale that is long enough' });
      expect(res.status).toBe(403);
    });
    it('end_user cannot access', async () => {
      const res = await call('post', `/appeals/${appealId}/resolve`, users.end_user.token, { status: 'upheld', outcomeRationale: 'Test rationale that is long enough' });
      expect(res.status).toBe(403);
    });
  });

  describe('Unauthenticated access', () => {
    it('GET /cases is rejected', async () => {
      const res = await call('get', '/cases', null);
      expect(res.status).toBe(401);
    });
    it('POST /api-keys is rejected', async () => {
      const res = await call('post', '/api-keys', null, { name: 'test', permissions: [] });
      expect(res.status).toBe(401);
    });
  });
});
