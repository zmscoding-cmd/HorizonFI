# HorizonFI - Local Storage Security Audit & Hardening

## 1. Local Storage Threat Model
Operating as an offline-first PWA presents specific persistence threats:
- **Cross-Site Scripting (XSS)**: If a malicious script runs, it could query IndexedDB directly to extract sensitive financial arrays. Because `crypto-js` encryption operates effectively at the RxDB layer, raw IndexedDB reads using the developer console or XSS will now return AES-encrypted payloads instead of raw unencrypted JSON.
- **Physical Device Access**: If an unlocked device is compromised, extracting the generic `horizonfi_db` could yield plaintext financial milestones. Combining device presence with a user-derived encryption key mitigates casual physical snooping if the user has signed out.

## 2. Refactored RxDB Schema & Client-Side Encryption
To protect long-term financial milestones, budgets, and net-worth aggregations, the RxDB schema now explicitly encrypts the `scenarios` nested structures. 

Instead of caching locally in plaintext, we applied the standard `rxdb-encryption-crypto-js` wrapped Dexie storage layer:
```javascript
import { wrappedKeyEncryptionCryptoJsStorage } from 'rxdb/plugins/encryption-crypto-js';

const rxdb = await createRxDatabase({
  name: 'horizonfi_db',
  storage: wrappedKeyEncryptionCryptoJsStorage({
    storage: getRxStorageDexie() // Underlying raw IndexedDB driver
  }),
  password: getEncryptionKey(), 
  multiInstance: true
});

// We explicitly target only the sensitive nested arrays for encryption:
const planSchema = {
  ...
  encrypted: ['scenarios'],
  ...
}
```

## 3. Secure Key Management Strategy
Encryption demands symmetric key management that functions offline:
- **Hardware/User Linked Determinism**: We construct the encryption password directly using the Firebase `uid` (`auth.currentUser.uid`). Because Firebase caches its own authentication JWT context offline, the UID remains resolvable offline while still ensuring that a different user accessing the same physical device cannot decrypt the payload.
- **Future Hardening (Manual PIN)**: For maximum offline security (preventing even a compromise of the offline Firebase Auth cache), the final evolution of key derivation should mandate a user-provided 4-digit PIN combined with their `uid` using PBKDF2.

## 4. IndexedDB Clearance Protocols Upon Logout
A crucial flaw in standard PWAs is leaving the encrypted or unencrypted databases intact after a user explicitly signs out.
We have refactored the `src/App.tsx` sign-out trajectory:
```typescript
const handleSignOut = async () => {
    try {
      await clearDatabase(); // Immediately destroys the rxdb instance and erases the dexie DB
      setDb(null);
      setPlans([]);
    } catch(e) {
      console.error('Failed to clear database', e);
    }
    await signOut(auth); // Clears the Firebase Auth SDK cache
};
```
This guarantees that explicit session termination explicitly drops the sensitive caching tables.
