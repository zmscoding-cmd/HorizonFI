import { readFileSync } from 'fs';
import { assertSucceeds, assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll } from 'vitest';

describe('Firestore Security Rules Integration Emulator Suite', () => {
  let testEnv: any;
  const PROJECT_ID = 'demo-horizonfi-security-tests';

  beforeAll(async () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  // Helper to generate a dummy valid scenario item
  function createValidScenario(id = 'scenario-1') {
    return {
      id,
      name: 'Baseline Route',
      budget: {
        monthlyIncome: 8000,
        monthlyExpenses: 4000,
        inflationRate: 0.03, // 3%
        lifestyleCreepRate: 0.01, // 1%
        residencyState: 'CA',
      },
      milestones: [],
      assets: [],
    };
  }

  describe('Phase 1: The Cloud Perimeter (Structural Payload Validation)', () => {
    
    it('ALLOWS an authenticated user to write a valid retirement plan to their own subcollection', async () => {
      const userA = testEnv.authenticatedContext('user-a-123');
      const validPlan = {
        id: 'plan-1',
        name: 'HorizonFI Active Plan',
        members: ['user-a-123'],
        scenarios: [createValidScenario()],
        _deleted: false,
      };

      await assertSucceeds(
        userA.firestore()
          .collection('users')
          .doc('user-a-123')
          .collection('plans')
          .doc('plan-1')
          .set(validPlan)
      );
    });

    it('REJECTS a plan write with mathematically impossible parameter (inflationRate of -5%)', async () => {
      const userA = testEnv.authenticatedContext('user-a-123');
      
      const scenarioWithInvalidInflation = createValidScenario();
      scenarioWithInvalidInflation.budget.inflationRate = -5.0; // Under boundary limit of -0.2 (-20%)

      const maliciousPlan = {
        id: 'plan-invalid-inflation',
        name: 'Malicious Inflation Plan',
        members: ['user-a-123'],
        scenarios: [scenarioWithInvalidInflation],
        _deleted: false,
      };

      await assertFails(
        userA.firestore()
          .collection('users')
          .doc('user-a-123')
          .collection('plans')
          .doc('plan-invalid-inflation')
          .set(maliciousPlan)
      );
    });

    it('REJECTS a plan write with bloated milestones array exceeding the 100-item security boundary', async () => {
      const userA = testEnv.authenticatedContext('user-a-123');
      
      // Generate exactly 105 milestones to simulate an array bloating attack (DoS vector)
      const bloatedMilestones = Array.from({ length: 105 }, (_, i) => ({
        id: `milestone-${i}`,
        name: `Milestone #${i}`,
        targetAmount: 500000 + i * 1000,
        targetYear: 2030 + (i % 20),
      }));

      const scenarioWithBloatedMilestones = createValidScenario();
      scenarioWithBloatedMilestones.milestones = bloatedMilestones as any;

      const maliciousPlan = {
        id: 'plan-bloated-milestones',
        name: 'Bloated Milestones Plan',
        members: ['user-a-123'],
        scenarios: [scenarioWithBloatedMilestones],
        _deleted: false,
      };

      await assertFails(
        userA.firestore()
          .collection('users')
          .doc('user-a-123')
          .collection('plans')
          .doc('plan-bloated-milestones')
          .set(maliciousPlan)
      );
    });

    it('REJECTS a plan write with bloated assets array exceeding the 100-item limit', async () => {
      const userA = testEnv.authenticatedContext('user-a-123');
      
      const bloatedAssets = Array.from({ length: 105 }, (_, i) => ({
        id: `asset-${i}`,
        name: `Asset #${i}`,
        value: 1000 * i,
      }));

      const scenarioWithBloatedAssets = createValidScenario();
      scenarioWithBloatedAssets.assets = bloatedAssets as any;

      const maliciousPlan = {
        id: 'plan-bloated-assets',
        name: 'Bloated Assets Plan',
        members: ['user-a-123'],
        scenarios: [scenarioWithBloatedAssets],
        _deleted: false,
      };

      await assertFails(
        userA.firestore()
          .collection('users')
          .doc('user-a-123')
          .collection('plans')
          .doc('plan-bloated-assets')
          .set(maliciousPlan)
      );
    });

    it('REJECTS a plan write when name exceeds 120 character length clamp', async () => {
      const userA = testEnv.authenticatedContext('user-a-123');
      const longName = 'A'.repeat(125); // Limit is 120
      
      const maliciousPlan = {
        id: 'plan-long-name',
        name: longName,
        members: ['user-a-123'],
        scenarios: [createValidScenario()],
        _deleted: false,
      };

      await assertFails(
        userA.firestore()
          .collection('users')
          .doc('user-a-123')
          .collection('plans')
          .doc('plan-long-name')
          .set(maliciousPlan)
      );
    });
  });

  describe('Phase 2: Multi-Tenant & Replication Isolation (RxDB & Subcollections)', () => {

    it('ALLOWS User A to write and read their own root-level replication state containing their UID', async () => {
      const userA = testEnv.authenticatedContext('user-a-123');
      const docPath = 'plans-rxdb-replication-state-user-a-123';
      const payload = {
        lastPushId: 'push-999',
        lastPullTimestamp: 1625000000,
      };

      await assertSucceeds(
        userA.firestore()
          .collection('plans-rxdb-replication-state')
          .doc(docPath)
          .set(payload)
      );

      await assertSucceeds(
        userA.firestore()
          .collection('plans-rxdb-replication-state')
          .doc(docPath)
          .get()
      );
    });

    it('PREVENTS User B from reading or modifying User A\'s root-level replication state', async () => {
      const userB = testEnv.authenticatedContext('user-b-456');
      const docPath = 'plans-rxdb-replication-state-user-a-123';
      const payload = {
        lastPushId: 'push-evil-attacker',
      };

      // User B should fail trying to read User A's replication document
      await assertFails(
        userB.firestore()
          .collection('plans-rxdb-replication-state')
          .doc(docPath)
          .get()
      );

      // User B should fail trying to write/hijack User A's replication state
      await assertFails(
        userB.firestore()
          .collection('plans-rxdb-replication-state')
          .doc(docPath)
          .set(payload)
      );
    });

    it('PREVENTS User B from accessing nested replication states in User A\'s path', async () => {
      const userB = testEnv.authenticatedContext('user-b-456');

      await assertFails(
        userB.firestore()
          .collection('users')
          .doc('user-a-123')
          .collection('assets-rxdb-replication-state')
          .doc('state-checkpoint')
          .get()
      );
    });

    it('PREVENTS unauthenticated clients from reading or writing replication states', async () => {
      const unauthCtx = testEnv.unauthenticatedContext();
      
      await assertFails(
        unauthCtx.firestore()
          .collection('plans-rxdb-replication-state')
          .doc('plans-rxdb-replication-state-user-a-123')
          .get()
      );
    });
  });
});
