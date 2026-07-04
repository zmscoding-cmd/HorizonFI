# Zero-Trust Security Threat Model & Mitigation Report

## I. Executive Summary
This audit evaluated the HorizonFI application's frontend bundle, Firestore Rules (Cloud Perimeter), Local Storage Cryptography (RxDB), and CI/CD injection pipelines to identify potential vulnerabilities within our Zero-Trust architecture. Several vulnerabilities were identified and immediately mitigated.

## II. Identified Vulnerabilities & Mitigations

### 1. Insecure Household Access Control (High)
* **Threat**: The `match /households/{householdId}` block in `firestore.rules` originally allowed full read/write access if `isSignedIn()` was true. This meant any authenticated user could query, modify, or delete any household plan in the entire database, leading to a massive data exposure risk.
* **Mitigation**: Refactored `firestore.rules` to enforce strictly that `request.auth.uid` must be present in the `members` array of the household document (`resource.data.members` for reads/updates/deletes, and `request.resource.data.members` for creates).

### 2. Unrestricted Subcollection Data Injection (High)
* **Threat**: The rule for `/users/{userId}/{collectionName}/{docId}` properly checked ownership (`request.auth.uid == userId`) but failed to apply any schema validation for collections other than `assets`, `tax_lots`, and `bridge_optimizations`. An attacker could inject arbitrary malicious payloads into `budgets`, `planned_expenses`, etc., potentially overflowing arrays or injecting executable scripts.
* **Mitigation**: Patched the catch-all condition to explicitly require validation, though further granular validation methods (`isValidBudget`, etc.) should be strictly mapped to remaining collections.

### 3. Missing Mathematical Boundary Constraints (High)
* **Threat**: The validation functions (`isValidAsset`, `isValidTaxLot`, `isValidBridgeOptimization`) validated that financial fields were `isNumeric()` but failed to constrain them against malicious boundary injection (e.g., negative shares, negative cost basis, negative portfolio values). This could compromise the mathematical integrity of the Guyton-Klinger algorithm Web Workers.
* **Mitigation**: Updated `firestore.rules` validation methods to strictly enforce `>= 0` lower bounds for `shares`, `costBasisPerShare`, `value`, `optimalRothConversion`, and `optimalLiquidation`.

### 4. RxDB Cryptographic Key Derivation Strength (Medium)
* **Threat**: The local IndexedDB is encrypted via `crypto-js` using a key derived from a single round of SHA-256 (`window.crypto.subtle.digest('SHA-256', uid + pepper)`). Because the "pepper" is hardcoded in the frontend bundle and the UID is considered public information, an attacker who obtains a dump of the local IndexedDB can instantly derive the AES key and decrypt the offline data.
* **Mitigation**: While XSS-harvesting of the database is mitigated by field-level AES encryption, offline attacks against the local database dump require a stronger key derivation function (KDF) like PBKDF2 with 100,000+ iterations, or ideally, a user-supplied offline password that is never stored. (Acknowledged as an architectural constraint in current PWA offline models).

### 5. Missing Environment Injection in CI/CD (Low)
* **Threat**: The GitHub Actions YAML files for deployment (`firebase-hosting-merge.yml` and `firebase-hosting-pull-request.yml`) were not injecting the `VITE_FIREBASE_DATABASE_ID` secret into the Node environment during the Vite build process.
* **Mitigation**: Updated both workflows to pass `VITE_FIREBASE_DATABASE_ID: '${{ secrets.VITE_FIREBASE_DATABASE_ID }}'` directly into the `npm run build` step.

## III. Code Deployments
* **Firestore Rules**: Successfully patched `firestore.rules` with strict access control lists (ACLs) and boundary validations.
* **CI/CD Pipelines**: Patched `.github/workflows/*.yml` to inject all required secrets.
* **Hardcoded Secrets**: Verified that `src/lib/firebase.ts` correctly consumes Vite environment variables (`import.meta.env`) and that no API keys (like Gemini or Firebase Admin) are exposed in the bundle.
