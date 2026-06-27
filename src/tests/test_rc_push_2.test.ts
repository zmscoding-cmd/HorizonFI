import { readFileSync } from 'fs';
import { assertSucceeds, assertFails, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll } from 'vitest';

describe('Exact Payload RC_PUSH test', () => {
  let testEnv: any;

  beforeAll(async () => {
    const rules = readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-test-rc-push',
      firestore: {
        host: '127.0.0.1',
        port: 8080,
        rules
      }
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  it('Allows the exact RC_PUSH payload to be created', async () => {
    const bob = testEnv.authenticatedContext('zMvSDEP1CohNwdC9p5vV6VPk7632');
    
    const payload = {
      "id": "a1a83661-3330-411d-a955-0b0ac3f314da",
      "name": "New Shared Plan",
      "members": [
        "zMvSDEP1CohNwdC9p5vV6VPk7632"
      ],
      "scenarios": [
        {
          "id": "01bcbb07-a62e-4577-82c7-eb24afdbfadb",
          "name": "Baseline Plan",
          "budget": {
            "monthlyIncome": 10000,
            "budgetPhases": [
              {
                "phaseId": "945898ce-7a67-4b87-a08c-c14d172405c1",
                "startYear": 2026,
                "endYear": 2100,
                "baselineAmount": 54000,
                "applyLifestyleAdjustment": true,
                "lifestyleAdjustmentRate": 2
              }
            ],
            "inflationRate": 3,
            "residencyState": "FL",
            "allocationMode": "PERCENTAGE",
            "buckets": {
              "qualifiedDividends": 0,
              "taxableBrokerage": 0,
              "traditional401kIra": 0,
              "rothIra": 0,
              "nonTaxableGift": 0
            },
            "blendedCostBasisPercentage": 60
          },
          "milestones": [
            {
              "id": "c8f102a1-065a-4a5b-a791-48a2d1c622b1",
              "name": "Financial Independence",
              "targetAmount": 1500000,
              "targetYear": 2040
            }
          ],
          "assets": []
        }
      ],
      "createdAt": 1782220422968,
      "updatedAt": 1782220422968,
      "_deleted": false
    };

    await assertSucceeds(bob.firestore().collection('households').doc('a1a83661-3330-411d-a955-0b0ac3f314da').set(payload));
  });
});
