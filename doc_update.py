import re

with open('DOCUMENTATION.md', 'r') as f:
    content = f.read()

# I will append a new section at the end of the file
new_section = """
### Tax Planning Scenarios (Phase 1)
HorizonFI now supports isolated tax planning scenarios.
- **Baseline Scenario**: The application automatically captures your current active budget and generates a locked baseline scenario.
- **Privacy First**: Sensitive tax modeling numbers such as target amounts, funding sources, and Roth conversion thresholds are strictly encrypted at rest on your device and are never transmitted in plaintext.
"""

if "Tax Planning Scenarios (Phase 1)" not in content:
    with open('DOCUMENTATION.md', 'a') as f:
        f.write(new_section)
