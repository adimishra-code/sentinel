# Phase 1 Implementation Plan — Auth, Organizations, RBAC

**Scope:** Authentication, Organizations, Role-Based Access Control  
**Prerequisites:** Phase 0 complete ✅  
**Target:** Full multi-tenant auth system with permission-based access control

---

## Deliverables

### 1. Database Models (Mongoose)
- [x] User model (email, passwordHash, name, status, emailVerified)
- [x] Organization model (name, slug, status, settings)
- [x] OrganizationMember model (organizationId, userId, role, permissions)
- [x] ApiKey model (organizationId, keyHash, keyPrefix, status, permissions, expiresAt)
- [x] RefreshToken model (userId, tokenHash, expiresAt, device info)

### 2. Auth Module (`backend/src/modules/auth`)
- [x] Registration with organization creation
- [x] Login with JWT access + refresh tokens
- [x] Refresh token rotation
- [x] Logout (token revocation)
- [x] Password hashing (bcrypt)
- [x] Email validation (format only, no SMTP yet)
- [x] Rate limiting for auth endpoints

### 3. Organizations Module (`backend/src/modules/organizations`)
- [x] Create organization (admin only)
- [x] Get organization details
- [x] Update organization settings
- [x] List organization members
- [x] Invite member (create invite token)
- [x] Accept invitation
- [x] Remove member
- [x] Update member role/permissions

### 4. RBAC Middleware
- [x] `authenticate` — verify JWT, attach userId/orgId to request
- [x] `requireRole` — check user has required role
- [x] `requirePermission` — check user has specific permission
- [x] `requireOrgMembership` — verify user belongs to org in request
- [x] Permission inheritance (platform_admin → all permissions)

### 5. API Keys Module
- [x] Generate API key (returns key once, stores hash)
- [x] List organization API keys
- [x] Revoke API key
- [x] API key authentication middleware (alternative to JWT)
- [x] Last used timestamp tracking

### 6. API Routes (`/api/v1`)
```
POST   /auth/register          — Create user + organization
POST   /auth/login             — Email/password → JWT + refresh token
POST   /auth/refresh           — Refresh token → new JWT + refresh token
POST   /auth/logout            — Revoke refresh token
GET    /auth/me                — Get current user info

GET    /organizations/:id      — Get organization (requires membership)
PATCH  /organizations/:id      — Update organization (requires org:write)
GET    /organizations/:id/members — List members
POST   /organizations/:id/members/invite — Invite member
POST   /organizations/invitations/:token/accept — Accept invite
DELETE /organizations/:id/members/:userId — Remove member
PATCH  /organizations/:id/members/:userId — Update member role

POST   /api-keys               — Generate API key (requires api_key:create)
GET    /api-keys               — List org API keys
DELETE /api-keys/:id           — Revoke API key
```

### 7. Validation & Error Handling
- [x] Zod schemas for all request bodies (already in shared/schemas)
- [x] Unique email constraint
- [x] Unique organization slug
- [x] Strong password validation (min 8 chars)
- [x] JWT expiration handling
- [x] Refresh token rotation on use

### 8. Security
- [x] Passwords hashed with bcrypt (salt rounds: 10)
- [x] JWT secrets validated (≥32 chars)
- [x] HttpOnly cookies for refresh tokens (optional)
- [x] Refresh token single-use (rotate on every refresh)
- [x] API keys hashed (SHA256)
- [x] Rate limiting on auth endpoints (10 requests/hour)

### 9. Testing Checklist
- [ ] Register user → creates user + organization + membership
- [ ] Login → returns valid JWT + refresh token
- [ ] JWT authenticates protected routes
- [ ] Refresh token rotation works
- [ ] Logout revokes refresh token
- [ ] Permission checks block unauthorized access
- [ ] Role hierarchy works (platform_admin has all permissions)
- [ ] API key authentication works
- [ ] Cross-tenant access blocked (user from Org A cannot access Org B resources)

---

## Implementation Order

1. **Database models** (User, Organization, OrganizationMember, ApiKey, RefreshToken)
2. **Auth utilities** (password hashing, JWT generation/verification)
3. **Auth routes** (register, login, refresh, logout, me)
4. **RBAC middleware** (authenticate, requireRole, requirePermission)
5. **Organizations routes** (CRUD, members, invitations)
6. **API keys** (generate, list, revoke, authentication middleware)
7. **Integration testing** (manual curl tests + automated if time permits)

---

## Database Schema Details

### User
```typescript
{
  _id: ObjectId,
  email: string (unique, lowercase, trimmed),
  passwordHash: string,
  name: string,
  status: 'active' | 'suspended' | 'deleted',
  emailVerified: boolean (default: false),
  lastLoginAt: Date?,
  createdAt: Date,
  updatedAt: Date
}
```

### Organization
```typescript
{
  _id: ObjectId,
  name: string,
  slug: string (unique, lowercase),
  status: 'active' | 'suspended' | 'deleted',
  settings: object (flexible JSON),
  createdAt: Date,
  updatedAt: Date
}
```

### OrganizationMember
```typescript
{
  _id: ObjectId,
  organizationId: ObjectId (ref: Organization),
  userId: ObjectId (ref: User),
  role: 'platform_admin' | 'org_admin' | 'moderator' | 'reviewer' | 'end_user',
  permissions: string[] (explicit overrides),
  createdAt: Date,
  updatedAt: Date,
  // Unique compound index: (organizationId, userId)
}
```

### ApiKey
```typescript
{
  _id: ObjectId,
  organizationId: ObjectId (ref: Organization),
  name: string,
  keyHash: string (SHA256),
  keyPrefix: string (first 8 chars for display),
  status: 'active' | 'revoked',
  permissions: string[],
  expiresAt: Date?,
  lastUsedAt: Date?,
  createdAt: Date,
  updatedAt: Date
}
```

### RefreshToken
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  tokenHash: string (SHA256),
  expiresAt: Date,
  revoked: boolean (default: false),
  userAgent: string?,
  ipAddress: string?,
  createdAt: Date
  // TTL index on expiresAt
}
```

---

## Auth Flow Diagrams

### Registration
```
POST /auth/register { email, password, name, organizationName }
  → Validate input
  → Check email unique
  → Hash password
  → Create Organization (slug = sanitized org name)
  → Create User
  → Create OrganizationMember (role: org_admin)
  → Return { user, organization, tokens: { access, refresh } }
```

### Login
```
POST /auth/login { email, password }
  → Find user by email
  → Verify password (bcrypt.compare)
  → Check user.status === 'active'
  → Get user's organizations + roles
  → Generate JWT (userId, email, orgs)
  → Create RefreshToken record
  → Return { user, tokens: { access, refresh } }
```

### Token Refresh
```
POST /auth/refresh { refreshToken }
  → Hash incoming token
  → Find RefreshToken record
  → Verify not expired, not revoked
  → Revoke old refresh token (single-use)
  → Generate new JWT + new RefreshToken
  → Return { tokens: { access, refresh } }
```

### Protected Route
```
GET /organizations/:id (with Authorization: Bearer <JWT>)
  → authenticate middleware
    → Extract JWT from header
    → Verify signature + expiration
    → Attach req.userId, req.userRole, req.permissions
  → requireOrgMembership middleware
    → Check user is member of :id organization
  → Route handler executes
```

---

## Permission System

### Roles (from shared/constants)
- `platform_admin` — All permissions across all orgs
- `org_admin` — Full control within their organization
- `moderator` — Case review + decisions
- `reviewer` — Appeal review
- `end_user` — Submit content + appeals only

### Permission Inheritance
```typescript
if (user.role === 'platform_admin') {
  return true; // Has all permissions
}

const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
const explicitPermissions = membership.permissions || [];
const allPermissions = [...rolePermissions, ...explicitPermissions];

return allPermissions.includes(requiredPermission);
```

### Middleware Example
```typescript
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // req.userId, req.organizationId set by authenticate middleware
    const membership = await OrganizationMember.findOne({
      userId: req.userId,
      organizationId: req.organizationId,
      status: 'active'
    });

    if (!membership) {
      throw AppError.forbidden('Not a member of this organization');
    }

    const hasPermission = checkPermission(membership.role, membership.permissions, permission);
    if (!hasPermission) {
      throw AppError.forbidden(`Missing permission: ${permission}`);
    }

    req.userRole = membership.role;
    req.permissions = getPermissions(membership.role, membership.permissions);
    next();
  };
};
```

---

## Ready to implement?

Confirm to proceed with Phase 1 implementation.
