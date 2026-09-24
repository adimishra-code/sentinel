import mongoose from 'mongoose';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

import config from '../config';
import { Organization } from '../modules/organizations/organization.model';
import { User } from '../modules/auth/user.model';
import { OrganizationMember } from '../modules/organizations/organization-member.model';
import { ApiKey } from '../modules/auth/api-key.model';
import { Policy, PolicyVersion } from '../modules/policies/policy.model';
import { Case } from '../modules/cases/case.model';
import { Content } from '../modules/content/content.model';
import { hashPassword } from '../modules/auth/auth.utils';
import { UserRole, UserStatus, PolicyStatus, CaseStatus, CasePriority, ContentType } from '../types';

async function seed() {
  console.log('🌱 Starting Sentinel database seed...');
  console.log(`📡 Connecting to MongoDB at ${config.mongo.uri.replace(/\/\/.*@/, '//***@')}`);

  await mongoose.connect(config.mongo.uri);

  try {
    // 1. Create or update Demo Organization
    let org = await Organization.findOne({ slug: 'acme' });
    if (!org) {
      org = await Organization.create({
        name: 'Acme Global Enterprises',
        slug: 'acme',
        status: 'active',
        plan: 'enterprise',
        settings: {
          customDomain: 'trust.acme.com',
          dataRetentionDays: 90,
          notificationEmail: 'trust@acme.com',
        },
      });
      console.log('✅ Created organization: Acme Global Enterprises (slug: acme)');
    } else {
      console.log('ℹ️ Organization "acme" already exists');
    }

    // 2. Create Admin User
    const adminEmail = 'admin@sentinel.dev';
    let adminUser = await User.findOne({ email: adminEmail });
    if (!adminUser) {
      adminUser = await User.create({
        email: adminEmail,
        passwordHash: await hashPassword('Sentinel@2026!'),
        name: 'Aditya Mishra (Admin)',
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });
      console.log(`✅ Created admin user: ${adminEmail} (password: Sentinel@2026!)`);
    }

    // Ensure Admin membership
    const existingAdminMember = await OrganizationMember.findOne({
      organizationId: org._id,
      userId: adminUser._id,
    });
    if (!existingAdminMember) {
      await OrganizationMember.create({
        organizationId: org._id,
        userId: adminUser._id,
        role: UserRole.ORG_ADMIN,
        permissions: ['*'],
      });
      console.log('✅ Assigned Org Admin role');
    }

    // 3. Create Reviewer User
    const reviewerEmail = 'reviewer@sentinel.dev';
    let reviewerUser = await User.findOne({ email: reviewerEmail });
    if (!reviewerUser) {
      reviewerUser = await User.create({
        email: reviewerEmail,
        passwordHash: await hashPassword('Sentinel@2026!'),
        name: 'Alex Rivera (Reviewer)',
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });
      console.log(`✅ Created reviewer user: ${reviewerEmail} (password: Sentinel@2026!)`);
    }

    const existingReviewerMember = await OrganizationMember.findOne({
      organizationId: org._id,
      userId: reviewerUser._id,
    });
    if (!existingReviewerMember) {
      await OrganizationMember.create({
        organizationId: org._id,
        userId: reviewerUser._id,
        role: UserRole.REVIEWER,
        permissions: ['cases:read', 'cases:review'],
      });
      console.log('✅ Assigned Reviewer role');
    }

    // 4. Create Production API Key
    const rawApiKey = 'sk_live_sentinel_enterprise_seed_key_89234789';
    const keyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
    const existingApiKey = await ApiKey.findOne({ keyHash });
    if (!existingApiKey) {
      await ApiKey.create({
        organizationId: org._id,
        name: 'Default Production API Key',
        keyHash,
        keyPrefix: 'sk_live_sentinel',
        status: 'active',
        permissions: ['*'],
      });
      console.log(`✅ Created API Key: ${rawApiKey}`);
    }

    // 5. Create Default Policy
    let policy = await Policy.findOne({ organizationId: org._id, name: 'Standard Global Moderation Policy' });
    if (!policy) {
      policy = await Policy.create({
        organizationId: org._id,
        name: 'Standard Global Moderation Policy',
        description: 'Standard trust & safety baseline enforcing safety thresholds across text & media',
        status: PolicyStatus.ACTIVE,
        currentVersion: 1,
      });

      await PolicyVersion.create({
        policyId: policy._id,
        organizationId: org._id,
        version: 1,
        categories: [
          {
            id: 'hate_speech',
            name: 'Hate Speech & Targeted Discrimination',
            severityThreshold: 0.7,
            firstOffenseAction: 'remove',
            repeatOffenseAction: 'suspend',
            requiresHumanReview: true,
          },
          {
            id: 'harassment',
            name: 'Harassment & Bullying',
            severityThreshold: 0.65,
            firstOffenseAction: 'warn',
            repeatOffenseAction: 'limit',
            requiresHumanReview: true,
          },
          {
            id: 'toxicity',
            name: 'Profanity & High Hostility',
            severityThreshold: 0.8,
            firstOffenseAction: 'warn',
            repeatOffenseAction: 'remove',
            requiresHumanReview: false,
          },
          {
            id: 'spam',
            name: 'Commercial Spam & Phishing',
            severityThreshold: 0.6,
            firstOffenseAction: 'remove',
            repeatOffenseAction: 'suspend',
            requiresHumanReview: false,
          },
        ],
        rules: {},
        effectiveFrom: new Date(),
      });
      console.log('✅ Created default active enterprise policy with 4 core categories');
    }

    // 6. Create Demo Content and Cases
    const existingCases = await Case.countDocuments({ organizationId: org._id });
    if (existingCases === 0) {
      const demoContents = [
        {
          text: 'I hate everyone in this group and hope you all get harmed immediately!',
          authorId: 'usr_malicious_99',
          priority: CasePriority.CRITICAL,
          status: CaseStatus.PENDING,
          severity: 'critical',
          riskScore: 0.94,
          categories: ['threat_direct', 'hate_speech'],
        },
        {
          text: 'Click this link right now to win $10,000 cash bonus http://free-crypto-drop.ru',
          authorId: 'usr_spammer_12',
          priority: CasePriority.MEDIUM,
          status: CaseStatus.RESOLVED,
          severity: 'medium',
          riskScore: 0.65,
          categories: ['spam', 'phishing'],
        },
        {
          text: 'Can somebody please explain why the server returns a 500 error on checkout?',
          authorId: 'usr_customer_44',
          priority: CasePriority.LOW,
          status: CaseStatus.DISMISSED,
          severity: 'low',
          riskScore: 0.05,
          categories: [],
        },
      ];

      for (const item of demoContents) {
        const contentDoc = await Content.create({
          organizationId: org._id,
          contentType: ContentType.TEXT,
          text: item.text,
          authorId: item.authorId,
          language: 'en',
        });

        await Case.create({
          organizationId: org._id,
          contentId: contentDoc._id,
          status: item.status,
          priority: item.priority,
          severity: item.severity,
          riskScore: item.riskScore,
          categories: item.categories,
          reason: `Automated detection flagged high risk: ${item.categories.join(', ') || 'clean'}`,
          requiresReview: item.riskScore > 0.5,
        });
      }
      console.log(`✅ Seeded ${demoContents.length} demo moderation cases`);
    }

    console.log('\n============================================================');
    console.log('🎉 SENTINEL DATABASE SEED COMPLETED SUCCESSFULLY');
    console.log('============================================================');
    console.log('🏢 Organization: Acme Global Enterprises');
    console.log('🔑 Org Slug:     acme');
    console.log('👤 Admin Email:  admin@sentinel.dev');
    console.log('🔐 Password:     Sentinel@2026!');
    console.log('🛡️ API Key:      sk_live_sentinel_enterprise_seed_key_89234789');
    console.log('🌐 Swagger Docs: http://localhost:3000/api/docs');
    console.log('📊 Status SLA:   http://localhost:3000/status');
    console.log('============================================================\n');
  } catch (err) {
    console.error('❌ Seed error:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
