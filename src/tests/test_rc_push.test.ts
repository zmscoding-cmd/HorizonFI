import { readFileSync, writeFileSync } from 'fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { test, beforeAll, afterAll } from 'vitest';

let testEnv: any;

beforeAll(async () => {
  const rules = readFileSync('firestore.rules', 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-test',
    firestore: { rules },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

test('RC_PUSH exact payload test', async () => {
  const bob = testEnv.authenticatedContext('zMvSDEP1CohNwdC9p5vV6VPk7632');
  const payload = {
      "id": "f2f363e7-426f-47c4-ae3a-953c50c6591a",
      "name": "New Shared Plan",
      "members": [
        "zMvSDEP1CohNwdC9p5vV6VPk7632"
      ],
      "scenarios": [],
      "createdAt": 1781391951965,
      "updatedAt": 1781391951965,
      "_deleted": false
  };

  await assertSucceeds(bob.firestore().collection('households').doc('f2f363e7-426f-47c4-ae3a-953c50c6591a').set(payload));
});
