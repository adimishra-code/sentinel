// MongoDB initialization script
// Runs once on container startup to set up database structure

db = db.getSiblingDB('sentinel');

print('🔧 Initializing Sentinel database...');

// Create collections with validation schemas

// Organizations collection
db.createCollection('organizations', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'slug', 'status', 'createdAt'],
      properties: {
        name: { bsonType: 'string' },
        slug: { bsonType: 'string' },
        status: { enum: ['active', 'suspended', 'deleted'] },
        createdAt: { bsonType: 'date' },
      },
    },
  },
});

db.organizations.createIndex({ slug: 1 }, { unique: true });
db.organizations.createIndex({ status: 1 });
db.organizations.createIndex({ createdAt: -1 });

// Users collection
db.createCollection('users');
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ organizationId: 1, status: 1 });
db.users.createIndex({ createdAt: -1 });

// Organization members (many-to-many with roles)
db.createCollection('organization_members');
db.organization_members.createIndex({ organizationId: 1, userId: 1 }, { unique: true });
db.organization_members.createIndex({ userId: 1 });
db.organization_members.createIndex({ organizationId: 1, role: 1 });

// API Keys
db.createCollection('api_keys');
db.api_keys.createIndex({ keyHash: 1 }, { unique: true });
db.api_keys.createIndex({ organizationId: 1, status: 1 });
db.api_keys.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Content
db.createCollection('content');
db.content.createIndex({ organizationId: 1, createdAt: -1 });
db.content.createIndex({ authorId: 1, organizationId: 1 });
db.content.createIndex({ conversationId: 1, organizationId: 1 });
db.content.createIndex({ organizationId: 1, contentType: 1 });

// Cases
db.createCollection('cases');
db.cases.createIndex({ organizationId: 1, status: 1, priority: -1, createdAt: -1 });
db.cases.createIndex({ organizationId: 1, assignedTo: 1, status: 1 });
db.cases.createIndex({ contentId: 1, organizationId: 1 });
db.cases.createIndex({ organizationId: 1, severity: 1 });

// Case events (audit trail for case lifecycle)
db.createCollection('case_events');
db.case_events.createIndex({ caseId: 1, createdAt: -1 });
db.case_events.createIndex({ organizationId: 1, createdAt: -1 });

// Moderation decisions
db.createCollection('moderation_decisions');
db.moderation_decisions.createIndex({ caseId: 1, organizationId: 1 });
db.moderation_decisions.createIndex({ organizationId: 1, moderatorId: 1, createdAt: -1 });
db.moderation_decisions.createIndex({ organizationId: 1, action: 1, createdAt: -1 });

// Policies
db.createCollection('policies');
db.policies.createIndex({ organizationId: 1, status: 1 });
db.policies.createIndex({ organizationId: 1, createdAt: -1 });

// Policy versions (immutable)
db.createCollection('policy_versions');
db.policy_versions.createIndex({ policyId: 1, version: -1 });
db.policy_versions.createIndex({ organizationId: 1, createdAt: -1 });

// Model runs (AI execution records)
db.createCollection('model_runs');
db.model_runs.createIndex({ contentId: 1, organizationId: 1 });
db.model_runs.createIndex({ organizationId: 1, createdAt: -1 });
db.model_runs.createIndex({ organizationId: 1, modelProvider: 1, modelName: 1 });

// Appeals
db.createCollection('appeals');
db.appeals.createIndex({ caseId: 1, organizationId: 1 });
db.appeals.createIndex({ organizationId: 1, status: 1, createdAt: -1 });
db.appeals.createIndex({ userId: 1, organizationId: 1 });

// User risk profiles
db.createCollection('user_risk_profiles');
db.user_risk_profiles.createIndex({ userId: 1, organizationId: 1 }, { unique: true });
db.user_risk_profiles.createIndex({ organizationId: 1, riskScore: -1 });
db.user_risk_profiles.createIndex({ organizationId: 1, updatedAt: -1 });

// Audit logs (immutable, append-only)
db.createCollection('audit_logs');
db.audit_logs.createIndex({ organizationId: 1, createdAt: -1 });
db.audit_logs.createIndex({ entityType: 1, entityId: 1, organizationId: 1 });
db.audit_logs.createIndex({ actorId: 1, organizationId: 1, createdAt: -1 });
db.audit_logs.createIndex({ action: 1, organizationId: 1, createdAt: -1 });

// Notifications
db.createCollection('notifications');
db.notifications.createIndex({ userId: 1, organizationId: 1, read: 1, createdAt: -1 });
db.notifications.createIndex({ organizationId: 1, createdAt: -1 });
// TTL index - auto-delete read notifications after 30 days
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000, partialFilterExpression: { read: true } });

// Integrations
db.createCollection('integrations');
db.integrations.createIndex({ organizationId: 1, type: 1 });
db.integrations.createIndex({ organizationId: 1, status: 1 });

// Configuration
db.createCollection('configuration');
db.configuration.createIndex({ organizationId: 1, key: 1 }, { unique: true });

print('✅ Database initialized successfully');
print('📊 Collections created with indexes');
