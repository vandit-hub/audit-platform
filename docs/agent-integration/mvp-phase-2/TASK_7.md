# TASK 7: Testing Infrastructure

## Overview
Establish comprehensive automated testing for the agent system, including unit tests for RBAC functions, integration tests for the agent API, and role-based access verification.

## Current State
- No automated tests for agent system
- Manual testing only
- No test infrastructure for RBAC functions
- No CI/CD integration

## Target State
- Unit tests for all RBAC query functions
- Integration tests for agent API endpoint
- Tests for all 6 roles (CFO, CXO_TEAM, AUDIT_HEAD, AUDITOR, AUDITEE, GUEST)
- >80% code coverage on new code
- Tests run in CI/CD pipeline
- Test utilities and mocks for reuse

## Acceptance Criteria
- [ ] Unit tests written for all RBAC functions in `src/lib/rbac-queries.ts`
- [ ] Integration tests written for agent API endpoint
- [ ] All 6 roles tested comprehensively
- [ ] Rate limiting tests implemented
- [ ] Audit logging tests implemented
- [ ] >80% code coverage achieved
- [ ] Tests pass consistently
- [ ] Test documentation written

## Implementation Details

### 7.1 Test Setup

**Install Testing Dependencies**:

```bash
npm install --save-dev jest @types/jest ts-jest @testing-library/react @testing-library/jest-dom
npm install --save-dev jest-mock-extended
```

**Jest Configuration**:

**File**: `jest.config.js`

```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
```

**Jest Setup File**:

**File**: `jest.setup.js`

```javascript
// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
```

### 7.2 Test Utilities and Mocks

**Prisma Mock**:

**File**: `src/lib/__tests__/utils/prisma-mock.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

export const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});
```

**Test Data Factory**:

**File**: `src/lib/__tests__/utils/test-data.ts`

```typescript
import { Role } from '@prisma/client';

export const testUsers = {
  cfo: {
    id: 'cfo-user-id',
    email: 'cfo@example.com',
    role: 'CFO' as Role,
    name: 'CFO User'
  },
  cxoTeam: {
    id: 'cxo-user-id',
    email: 'cxo@example.com',
    role: 'CXO_TEAM' as Role,
    name: 'CXO User'
  },
  auditHead: {
    id: 'audit-head-id',
    email: 'audithead@example.com',
    role: 'AUDIT_HEAD' as Role,
    name: 'Audit Head User'
  },
  auditor: {
    id: 'auditor-id',
    email: 'auditor@example.com',
    role: 'AUDITOR' as Role,
    name: 'Auditor User'
  },
  auditee: {
    id: 'auditee-id',
    email: 'auditee@example.com',
    role: 'AUDITEE' as Role,
    name: 'Auditee User'
  },
  guest: {
    id: 'guest-id',
    email: 'guest@example.com',
    role: 'GUEST' as Role,
    name: 'Guest User'
  }
};

export const testAudit = {
  id: 'audit-123',
  title: 'Test Audit',
  plantId: 'plant-123',
  auditHeadId: testUsers.auditHead.id,
  status: 'IN_PROGRESS',
  visitStartDate: new Date('2024-01-01'),
  visitEndDate: new Date('2024-01-15'),
  createdAt: new Date(),
  updatedAt: new Date()
};

export const testObservation = {
  id: 'obs-123',
  auditId: testAudit.id,
  observationText: 'Test observation text',
  riskCategory: 'A',
  currentStatus: 'PENDING_MR',
  approvalStatus: 'DRAFT',
  isPublished: false,
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### 7.3 Unit Tests for RBAC Functions

**File**: `src/lib/__tests__/rbac-queries.test.ts`

```typescript
import { prismaMock } from './utils/prisma-mock';
import { testUsers, testAudit, testObservation } from './utils/test-data';
import {
  buildObservationWhereClause,
  getObservationsForUser,
  getObservationStats,
  buildAuditWhereClause,
  getAuditsForUser,
  canAccessObservation,
  canAccessAudit
} from '../rbac-queries';

// Mock the prisma client
jest.mock('@/server/db', () => ({
  prisma: prismaMock
}));

describe('buildObservationWhereClause', () => {
  it('should return empty where clause for CFO', () => {
    const where = buildObservationWhereClause(testUsers.cfo.id, testUsers.cfo.role);
    expect(where).toEqual({});
  });

  it('should return empty where clause for CXO_TEAM', () => {
    const where = buildObservationWhereClause(testUsers.cxoTeam.id, testUsers.cxoTeam.role);
    expect(where).toEqual({});
  });

  it('should filter by audit for AUDIT_HEAD', () => {
    const where = buildObservationWhereClause(testUsers.auditHead.id, testUsers.auditHead.role);
    expect(where).toHaveProperty('audit');
    expect(where.audit).toHaveProperty('OR');
  });

  it('should filter by audit assignment for AUDITOR', () => {
    const where = buildObservationWhereClause(testUsers.auditor.id, testUsers.auditor.role);
    expect(where).toHaveProperty('audit');
    expect(where.audit).toHaveProperty('assignments');
  });

  it('should filter by observation assignment for AUDITEE', () => {
    const where = buildObservationWhereClause(testUsers.auditee.id, testUsers.auditee.role);
    expect(where).toHaveProperty('assignments');
  });

  it('should filter by published and approved for GUEST', () => {
    const where = buildObservationWhereClause(testUsers.guest.id, testUsers.guest.role);
    expect(where).toHaveProperty('isPublished', true);
    expect(where).toHaveProperty('approvalStatus', 'APPROVED');
  });

  it('should combine filters with AND logic', () => {
    const where = buildObservationWhereClause(
      testUsers.auditor.id,
      testUsers.auditor.role,
      {
        auditId: 'audit-123',
        riskCategory: 'A',
        plantId: 'plant-123'
      }
    );

    expect(where.AND).toBeDefined();
    expect(Array.isArray(where.AND)).toBe(true);
  });

  it('should handle searchQuery filter', () => {
    const where = buildObservationWhereClause(
      testUsers.cfo.id,
      testUsers.cfo.role,
      { searchQuery: 'inventory' }
    );

    expect(where).toHaveProperty('OR');
    expect(where.OR).toHaveLength(3); // observationText, riskDescription, managementResponse
  });

  it('should handle date range filters', () => {
    const where = buildObservationWhereClause(
      testUsers.cfo.id,
      testUsers.cfo.role,
      {
        startDate: '2024-01-01',
        endDate: '2024-01-31'
      }
    );

    expect(where.AND).toBeDefined();
    // Check for date filters
  });
});

describe('getObservationsForUser', () => {
  beforeEach(() => {
    prismaMock.observation.findMany.mockResolvedValue([testObservation as any]);
  });

  it('should fetch observations for CFO', async () => {
    const observations = await getObservationsForUser(testUsers.cfo.id, testUsers.cfo.role);
    expect(observations).toHaveLength(1);
    expect(prismaMock.observation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {}
      })
    );
  });

  it('should respect filters', async () => {
    await getObservationsForUser(
      testUsers.cfo.id,
      testUsers.cfo.role,
      { auditId: 'audit-123', riskCategory: 'A' }
    );

    expect(prismaMock.observation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.any(Array)
        })
      })
    );
  });

  it('should handle pagination', async () => {
    await getObservationsForUser(
      testUsers.cfo.id,
      testUsers.cfo.role,
      {},
      { take: 10, skip: 20 }
    );

    expect(prismaMock.observation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        skip: 20
      })
    );
  });
});

describe('canAccessObservation', () => {
  it('should return true for CFO', async () => {
    prismaMock.observation.findFirst.mockResolvedValue(testObservation as any);
    const hasAccess = await canAccessObservation(testUsers.cfo.id, testUsers.cfo.role, 'obs-123');
    expect(hasAccess).toBe(true);
  });

  it('should return false when observation not found', async () => {
    prismaMock.observation.findFirst.mockResolvedValue(null);
    const hasAccess = await canAccessObservation(testUsers.auditor.id, testUsers.auditor.role, 'obs-999');
    expect(hasAccess).toBe(false);
  });

  it('should check RBAC for non-CFO users', async () => {
    prismaMock.observation.findFirst.mockResolvedValue(testObservation as any);
    await canAccessObservation(testUsers.auditor.id, testUsers.auditor.role, 'obs-123');

    expect(prismaMock.observation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'obs-123',
          AND: expect.any(Array)
        })
      })
    );
  });
});

describe('buildAuditWhereClause', () => {
  it('should return empty where clause for CFO', () => {
    const where = buildAuditWhereClause(testUsers.cfo.id, testUsers.cfo.role);
    expect(where).toEqual({});
  });

  it('should filter by auditHeadId or assignments for AUDIT_HEAD', () => {
    const where = buildAuditWhereClause(testUsers.auditHead.id, testUsers.auditHead.role);
    expect(where).toHaveProperty('OR');
    expect(where.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ auditHeadId: testUsers.auditHead.id })
      ])
    );
  });

  it('should filter by assignments for AUDITOR', () => {
    const where = buildAuditWhereClause(testUsers.auditor.id, testUsers.auditor.role);
    expect(where).toHaveProperty('assignments');
  });

  it('should return no-access for AUDITEE', () => {
    const where = buildAuditWhereClause(testUsers.auditee.id, testUsers.auditee.role);
    expect(where).toHaveProperty('id', 'no-access');
  });
});

describe('getObservationStats', () => {
  beforeEach(() => {
    prismaMock.observation.groupBy.mockResolvedValue([
      { approvalStatus: 'DRAFT', _count: { _all: 5 } },
      { approvalStatus: 'SUBMITTED', _count: { _all: 3 } }
    ] as any);
  });

  it('should return stats grouped by approvalStatus', async () => {
    const stats = await getObservationStats(
      testUsers.cfo.id,
      testUsers.cfo.role,
      'approvalStatus'
    );

    expect(stats).toHaveLength(2);
    expect(stats[0]).toHaveProperty('approvalStatus', 'DRAFT');
    expect(stats[0]._count._all).toBe(5);
  });

  it('should support all groupBy options', async () => {
    const groupByOptions = ['approvalStatus', 'currentStatus', 'riskCategory', 'concernedProcess', 'auditId'];

    for (const groupBy of groupByOptions) {
      await getObservationStats(testUsers.cfo.id, testUsers.cfo.role, groupBy as any);
      expect(prismaMock.observation.groupBy).toHaveBeenCalled();
    }
  });
});
```

### 7.4 Integration Tests for Agent API

**File**: `src/app/api/v1/agent/__tests__/chat.test.ts`

```typescript
import { NextRequest } from 'next/server';
import { POST } from '../chat/route';
import { prismaMock } from '@/lib/__tests__/utils/prisma-mock';
import { testUsers } from '@/lib/__tests__/utils/test-data';

// Mock auth
jest.mock('@/lib/auth', () => ({
  auth: jest.fn()
}));

import { auth } from '@/lib/auth';
const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('POST /api/v1/agent/chat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3005/api/v1/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' })
      });

      const response = await POST(req);
      expect(response.status).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error', 'Unauthorized');
    });

    it('should return 401 when email is missing', async () => {
      mockAuth.mockResolvedValue({ user: { id: '123', role: 'CFO' } } as any);

      const req = new NextRequest('http://localhost:3005/api/v1/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'test' })
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it('should accept valid session', async () => {
      mockAuth.mockResolvedValue({
        user: testUsers.cfo
      } as any);

      const req = new NextRequest('http://localhost:3005/api/v1/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 'How many observations do I have?' })
      });

      // Note: Actual agent logic would need to be mocked
      // This test would verify authentication passes
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: testUsers.cfo } as any);
    });

    it('should return 400 for empty message', async () => {
      const req = new NextRequest('http://localhost:3005/api/v1/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: '' })
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it('should return 400 for non-string message', async () => {
      const req = new NextRequest('http://localhost:3005/api/v1/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: 123 })
      });

      const response = await POST(req);
      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      mockAuth.mockResolvedValue({ user: testUsers.cfo } as any);
    });

    it('should allow requests within limit', async () => {
      // Test would require mocking the rate limit check
      // or testing through multiple requests
    });

    it('should return 429 when limit exceeded', async () => {
      // Simulate exceeding rate limit
      // This test would require setting up rate limit state
    });
  });
});
```

### 7.5 Role-Based Access Tests

**File**: `src/lib/__tests__/rbac-roles.test.ts`

```typescript
import { prismaMock } from './utils/prisma-mock';
import { testUsers, testAudit, testObservation } from './utils/test-data';
import { getObservationsForUser, getAuditsForUser } from '../rbac-queries';

jest.mock('@/server/db', () => ({
  prisma: prismaMock
}));

describe('RBAC Role Tests', () => {
  describe('CFO', () => {
    it('should see all observations', async () => {
      prismaMock.observation.findMany.mockResolvedValue([testObservation] as any);

      await getObservationsForUser(testUsers.cfo.id, testUsers.cfo.role);

      expect(prismaMock.observation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });

    it('should see all audits', async () => {
      prismaMock.audit.findMany.mockResolvedValue([testAudit] as any);

      await getAuditsForUser(testUsers.cfo.id, testUsers.cfo.role);

      expect(prismaMock.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });
  });

  describe('AUDITOR', () => {
    it('should only see assigned observations', async () => {
      prismaMock.observation.findMany.mockResolvedValue([testObservation] as any);

      await getObservationsForUser(testUsers.auditor.id, testUsers.auditor.role);

      expect(prismaMock.observation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            audit: expect.objectContaining({
              assignments: expect.any(Object)
            })
          })
        })
      );
    });

    it('should only see assigned audits', async () => {
      prismaMock.audit.findMany.mockResolvedValue([testAudit] as any);

      await getAuditsForUser(testUsers.auditor.id, testUsers.auditor.role);

      expect(prismaMock.audit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignments: expect.any(Object)
          })
        })
      );
    });
  });

  describe('GUEST', () => {
    it('should only see published and approved observations', async () => {
      prismaMock.observation.findMany.mockResolvedValue([testObservation] as any);

      await getObservationsForUser(testUsers.guest.id, testUsers.guest.role);

      expect(prismaMock.observation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isPublished: true,
            approvalStatus: 'APPROVED'
          })
        })
      );
    });

    it('should see no audits', async () => {
      prismaMock.audit.findMany.mockResolvedValue([]);

      const audits = await getAuditsForUser(testUsers.guest.id, testUsers.guest.role);

      expect(audits).toHaveLength(0);
    });
  });
});
```

### 7.6 Test Scripts

**Add to `package.json`**:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

## Testing Checklist

### Unit Tests - RBAC Functions
- [ ] `buildObservationWhereClause()` tests pass for all roles
- [ ] `buildAuditWhereClause()` tests pass for all roles
- [ ] `getObservationsForUser()` tests pass
- [ ] `getAuditsForUser()` tests pass
- [ ] `canAccessObservation()` tests pass
- [ ] `canAccessAudit()` tests pass
- [ ] `getObservationStats()` tests pass
- [ ] Filter combination tests pass
- [ ] Edge cases handled

### Integration Tests - Agent API
- [ ] Authentication tests pass
- [ ] Request validation tests pass
- [ ] Rate limiting tests pass (if implemented)
- [ ] Error handling tests pass

### Role-Based Tests
- [ ] CFO access tests pass
- [ ] CXO_TEAM access tests pass
- [ ] AUDIT_HEAD access tests pass
- [ ] AUDITOR access tests pass
- [ ] AUDITEE access tests pass
- [ ] GUEST access tests pass

### Coverage
- [ ] Code coverage >80%
- [ ] All new functions covered
- [ ] Critical paths tested
- [ ] Edge cases covered

### CI/CD
- [ ] Tests run in CI pipeline
- [ ] Coverage reports generated
- [ ] Failed tests block merges
- [ ] Test results visible in PRs

## Dependencies
- **All other tasks** - Testing validates implementations from all tasks

## Related Tasks
All tasks - testing validates the entire Phase 2 implementation

## Notes
- Keep tests focused and isolated
- Use mocks for external dependencies
- Test both happy paths and error cases
- Document test failures clearly
- Keep test data realistic but minimal

## Future Enhancements
- E2E tests with Playwright
- Performance testing
- Load testing
- Security testing
- Visual regression testing

## References
- Jest Documentation: https://jestjs.io/docs/getting-started
- Testing Library: https://testing-library.com/docs/
- Prisma Testing: https://www.prisma.io/docs/guides/testing/unit-testing
