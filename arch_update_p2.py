import re

with open('architecture.md', 'r') as f:
    content = f.read()

new_section = """
### Phase 2: Tax Modeling Engine Web Worker Decoupling
- **Payload Refactoring**: `simulation.worker.ts` has been refactored to accept a `TaxOptimizationRequest` payload. This decouples the calculation logic from a global state.
- **Dynamic Scenario Processing**: Progressive tax brackets, capital gains stacking, and gross-up calculations are now computed dynamically on arbitrary scenario data, isolating memory states.
- **Thread Isolation**: Strict thread isolation maintained—no DOM manipulation or main-thread dependencies exist inside `simulation.worker.ts`.
- **Security Check**: Verified that no secrets or API keys were hardcoded during this update.
"""

if "Phase 2: Tax Modeling Engine Web Worker Decoupling" not in content:
    with open('architecture.md', 'a') as f:
        f.write(new_section)
