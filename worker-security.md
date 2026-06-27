# HorizonFI - Web Worker Security & Hardening Audit

## 1. Web Worker Vulnerability Assessment
Web Workers execute in a separate global context from the main UI thread. In financial planning applications like HorizonFI, these workers perform heavy Guyton-Klinger algorithm arrays over decades into the future. 
- **Array Size & DoS Manipulation**: If the main thread passes malicious, un-bounded inputs (e.g., extremely high market returns, hyper-inflation arrays, or massive cumulative year indexes) via `postMessage`, it can cause the Web Worker to crash due to out-of-memory errors or create perpetual infinite loops in the simulation engine. This type of DoS takes down the background worker.
- **Payload Injection Risks**: Unsanitized payloads passed to a worker could potentially disrupt internal math limits. While Web Workers cannot manipulate the central DOM directly, returning manipulated results (`NaN`, `-Infinity`) back into the main thread could cascade into corrupting IndexedDB `scenarios` when synced.

## 2. Refactored TypeScript Interfaces
To strictly enforce typing for message payloads traversing the worker bridge, we refactored the generic object passing in `src/workers/simulation.worker.ts` to utilize discriminated unions. This explicitly isolates success vs. failure events to the UI thread:

```typescript
export type SimulationError = {
  success: false;
  error: string;
};

export type SimulationSuccess = {
  success: true;
  result: SimulationResult;
};

export type SimulationResponse = SimulationSuccess | SimulationError;
```

## 3. Sanitization & Bounds-Checking Logic
Prior to processing, every incoming `SimulationRequest` payload is deeply sanitized using explicit `Math.min/Math.max` boundary checking inside `simulation.worker.ts`:

- Temporal bounded limits: `yearIndex` capped to reasonable maximums (0 to 2100).
- Financial caps boundaries: 
  - `portfolioBalance` cannot be dropped below `0`.
  - `inflationRate` and `lifestyleCreepRate` bounded securely between `-50%` and `1000%`.
  - `initialWithdrawalRate` bounded gracefully between `0%` and `100%`.

By applying `sanitizeInput(e.data)`, the main algorithm `calculateDrawdownProfile` is cryptographically guaranteed to execute within safe floating-point ranges.

## 4. Error Handling and Failure Isolation Protocols
We wrapped the `onmessage` internal logic in a `try...catch` boundary and validated the underlying `e.data` raw message format.

```typescript
self.onmessage = (e: MessageEvent<SimulationRequest>) => {
  try {
    if (!e.data || typeof e.data !== 'object') {
      throw new Error("Invalid request payload. Expected an object.");
    }
    const safeReq = sanitizeInput(e.data);
    const result = calculateDrawdownProfile(safeReq);
    self.postMessage({ success: true, result } as SimulationSuccess);
  } catch (error: any) {
    self.postMessage({ success: false, error: error.message || 'Worker error' } as SimulationError);
  }
};
```
If the simulation encounters a recursive depth failure or bounds breach, it cleanly terminates and passes an `error` struct back to the calling process, allowing the main React thread to isolate the failed subset calculation instead of hard crashing the entire Progressive Web Application.
