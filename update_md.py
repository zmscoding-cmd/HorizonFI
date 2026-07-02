import re

with open('architecture.md', 'r') as f:
    content = f.read()

checkpoint = """
### Checkpoint: Currency Toggle in Comparative Analytics
Trigger: Addition of the current/future dollars toggle to the long-term simulation Comparative Analytics view.

1. Architectural State Changes:
- Added `CurrencyToggle` to the `Comparative Analytics View` header.
- This UI element allows users to toggle between real (inflation-adjusted) and nominal (future) dollars across all long-term longitudinal projections.

2. ARCHITECTURE.md Diff/Additions:
[New Section: Currency Mode in Analytics]
- **Shared State**: The Comparative Analytics view now properly interfaces with the `CurrencyModeContext` to control real vs nominal visualization for multi-decade Monte Carlo and deterministic runs.

3. Validation Status:
[x] Offline Capability Verified
[x] Night-Watch UI/UX Verified when in dark mode
[x] API Telemetry Logged
"""

with open('architecture.md', 'a') as f:
    f.write(checkpoint)
