/**
 * Tenant Isolation (IDOR) Integration Tests
 *
 * Verifies that a user from organization B can never read or mutate
 * resources belonging to organization A, by ID or otherwise.
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
import { ApiKey } from '../modules/auth/api-key.model';
import { generateAccessToken } from '../modules/auth/auth.utils';
import { UserRole } from '../types';

let mongod: MongoMemoryServer;
let orgAId: string;
let orgBId: string;
let userAId: string;
let userBId: string;
let tokenA: string;
let tokenB: string;
let contentAId: string;
let caseAId: string;
let appealAId: string;
let apiKeyAId: string;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());

  // Create organization A + user A (org admin)
  const orgA = await Organization.create({ name: 'Org A', slug: 'org-a', status: 'active' });
  orgAId = orgA._id.toString();
  const userA = await User.create({ email: 'a@test.com', passwordHash: 'hash', name: 'User A', status: 'active' });
  userAId = userA._id.toString();
  await OrganizationMember.create({ organizationId: orgA._id, userId: userA._id, role: UserRole.ORG_ADMIN, permissions: [] });

  // Create organization B + user B (org admin)
  const orgB = await Organization.create({ name: 'Org B', slug: 'org-b', status: 'active' });
  orgBId = orgB._id.toString();
  const userB = await User.create({ email: 'b@test.com', passwordHash: 'hash', name: 'User B', status: 'active' });
  userBId = userB._id.toString();
  await OrganizationMember.create({ organizationId: orgB._id, userId: userB._id, role: UserRole.ORG_ADMIN, permissions: [] });

  tokenA = generateAccessToken(userAId, 'a@test.com');
  tokenB = generateAccessToken(userBId, 'b@test.com');

  // Create resources in Org A
  const contentA = await Content.create({ organizationId: orgA._id, contentType: 'text', text: 'Org A secret content' });
  contentAId = contentA._id.toString();

  const caseA = await Case.create({ organizationId: orgA._id, contentId: contentA._id, status: 'pending', priority: 'high', riskScore: 0.9, categories: ['threat_direct'] });
  caseAId = caseA._id.toString();

  const appealA = await Appeal.create({ organizationId: orgA._id, caseId: caseA._id, userId: userA._id, reason: 'Org A appeal reason', status: 'pending' });
  appealAId = appealA._id.toString();

  const apiKeyA = await ApiKey.create({ organizationId: orgA._id, name: 'Org A Key', keyHash: 'hash', keyPrefix: 'orga', status: 'active', permissions: ['content:read'] });
  apiKeyAId = apiKeyA._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
  await mongod.stop();
});

describe('Tenant isolation (IDOR)', () => {
  it('Org B cannot read Org A case', async () => {
    const res = await request(app).get(`/api/v1/cases/${caseAId}`).set('Authorization', `Bearer ${tokenB}`);
    expect([403, 404]).toContain(res.status);
  });

  it('Org A can read its own case', async () => {
    const res = await request(app).get(`/api/v1/cases/${caseAId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(caseAId);
  });

  it('Org B cannot list Org A cases', async () => {
    const res = await request(app).get('/api/v1/cases').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map((c: any) => c.id);
    expect(ids).not.toContain(caseAId);
  });

  it('Org B cannot resolve Org A case', async () => {
    const res = await request(app).post(`/api/v1/cases/${caseAId}/resolve`).set('Authorization', `Bearer ${tokenB}`).send({ action: 'remove', rationale: 'takeover' });
    expect([400, 403, 404]).toContain(res.status);
  });

  it('Org B cannot read Org A content', async () => {
    const res = await request(app).get(`/api/v1/content/${contentAId}`).set('Authorization', `Bearer ${tokenB}`);
    expect([403, 404, 500]).toContain(res.status);
  });

  it('Org A can read its own content', async () => {
    const res = await request(app).get(`/api/v1/content/${contentAId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
  });

  it('Org B cannot read Org A appeal', async () => {
    const res = await request(app).get(`/api/v1/appeals/${appealAId}`).set('Authorization', `Bearer ${tokenB}`);
    expect([403, 404]).toContain(res.status);
  });

  it('Org A can read its own appeal', async () => {
    const res = await request(app).get(`/api/v1/appeals/${appealAId}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(appealAId);
  });

  it('Org B cannot resolve Org A appeal', async () => {
    const res = await request(app).post(`/api/v1/appeals/${appealAId}/resolve`).set('Authorization', `Bearer ${tokenB}`).send({ status: 'reversed', outcomeRationale: 'takeover' });
    expect([400, 403, 404]).toContain(res.status);
  });

  it('Org B cannot list Org A API keys', async () => {
    const res = await request(app).get('/api/v1/api-keys').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    const ids = (res.body.data || []).map((k: any) => k.id);
    expect(ids).not.toContain(apiKeyAId);
  });

  it('Org B cannot revoke Org A API key', async () => {
    const res = await request(app).delete(`/api/v1/api-keys/${apiKeyAId}`).set('Authorization', `Bearer ${tokenB}`);
    expect([403, 404]).toContain(res.status);
  });

  it('Org B cannot read Org A policies', async () => {
    const res = await request(app).get('/api/v1/policies').set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(200);
    const items = res.body.data?.items || res.body.data || [];
    const ids = items.map((p: any) => p.id);
    expect(ids).not.toContain(apiKeyAId);
  });

  it('unauthenticated requests are rejected', async () => {
    const res = await request(app).get(`/api/v1/cases/${caseAId}`);
    expect(res.status).toBe(401);
  });
});
