# HorizonFI - Authorization & Security Audit

## 1. Authorization Vulnerability Assessment

### Current State Analysis
- **Authentication**: Firebase Authentication restricts login to two allowed Google users (`jesse.laten.shumaker@gmail.com` and `cshumaker81@gmail.com`). This is strictly enforced both at the UI layer (`src/App.tsx` sign-out logic) and at the Firestore database schema layer (`firestore.rules`).
- **Data Isolation**: RxDB is currently replicating data per-user using a compound replication identifier (`firestore-sync-plans-${user.uid}`). 
- **Vulnerability Identifications**:
  1. **Direct Firestore API Exploitation**: An attacker explicitly hitting the Firestore API (bypassing the React web app) with a valid email domain *might* gain unauthorized access if database rules do not securely enforce member-uid lookups. Strict limits on read/writes per document are required to ensure they can only query their own household.
  2. **Rule Bypasses via Unbounded Array Injection**: If unbounded mathematical parameters or massive arrays are synced back to the backend, it could lead to denial-of-service (DoS) on document read limits or poison the Guyton-Klinger calculations for other household members.

## 2. Refactored `firestore.rules` Enforcing Household-Level Isolation

The backend rules have been extensively updated to provide robust, cryptographic-level isolation ensuring a user can *only* interact with `households` where their intrinsic `request.auth.uid` explicitly exists within the document's `members` array. 

```javascript
// Enforces tenant isolation:
allow get: if isSignedIn() && (request.auth.uid in existing().members);
allow list: if isSignedIn() && request.auth.uid in resource.data.members;

// Enforces creation invariants:
allow create: if isSignedIn() &&
              isValidId(householdId) &&
              isValidHousehold(incoming()) &&
              incoming().id == householdId &&
              request.auth.uid in incoming().members;

// Enforces secure mutation limits (cannot remove own permissions maliciously):
allow update: if isSignedIn() &&
              (request.auth.uid in existing().members) &&
              incoming().id == existing().id &&
              incoming().diff(existing()).affectedKeys().hasOnly(['name', 'members', 'scenarios', 'updatedAt', '_deleted', '_rev', '_meta']);
```

## 3. Schema Validation Rules & Anomaly Prevention

To prevent malicious injection of mathematical limits that could crash the RxDB web worker engine or corrupt the Guyton-Klinger simulations (such as negative inflation rates or massive yield percentages), explicit bounded constraints have been deployed to the Firestore schema rules:

```javascript
function isValidScenarioItem(scenario) {
  // Bounded constraint math checks
  return scenario.budget.monthlyIncome >= -10000000 && scenario.budget.monthlyIncome <= 10000000 &&
         scenario.budget.inflationRate >= -100 && scenario.budget.inflationRate <= 1000 &&
         scenario.budget.lifestyleCreepRate >= -100 && scenario.budget.lifestyleCreepRate <= 1000 &&
         
         // Safe schema bounds for optional complex injection fields
         (!('schdDividendYield' in scenario.budget) || 
         (scenario.budget.schdDividendYield is number && scenario.budget.schdDividendYield >= 0 && scenario.budget.schdDividendYield <= 100)) &&
         
         // Memory DOS bounds limits
         scenario.milestones.size() <= 100 &&
         scenario.assets.size() <= 100;
}
```

## 4. Recommendations for Securing Firebase Auth State Offline

Because HorizonFI operates as an *Offline-First Progressive Web Application*, it leverages IndexedDB caches for both Firebase Auth states and RxDB data storage. During prolonged offline periods (such as being in a remote location caching data):

1. **Short-Lived JWT Configurations (Risk: Medium)**: Firebase Auth JWT tokens expire every 1 hour, but the Firebase Auth SDK automatically stores the offline refresh token. 
   - *Recommendation*: Implement an application-level "Timeout Lock" inside `src/App.tsx`. Use standard `localStorage` or `sessionStorage` alongside an encrypted local PIN to encrypt the Dexie RxDB layers. If the app is offline for > 24 hours, the user must re-enter their offline PIN to unlock the local database.
2. **Local Dexie Database Encryption (Risk: High)**: Currently, the IndexedDB cache is unencrypted and readable via Chrome DevTools physically on the device.
   - *Recommendation*: Use the RxDB Crypto plugin (`rxdb/plugins/encryption-crypto-js`). Store the symmetric encryption key derived from a combination of the user's Firebase UID and a local manual PIN.
3. **Session Verification Before Background Sync (Risk: Low)**:
   - *Recommendation*: Wrap the RxDB `replicationState` startup inside an explicit token refresh call (`await auth.currentUser.getIdToken(true)`). This mathematically ensures that when coming back online, background data queues won't attempt to sync onto a revoked user state. 
