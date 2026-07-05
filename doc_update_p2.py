import re

with open('DOCUMENTATION.md', 'r') as f:
    content = f.read()

new_section = """
### Multi-Scenario Optimization Engine (Phase 2)
The underlying tax computation engine has been completely isolated from the main budget state. This enhancement allows the application to concurrently run "what-if" tax scenarios (e.g. comparing high Roth conversion years against baseline) dynamically in background threads without interfering with your main dashboard.
"""

if "Multi-Scenario Optimization Engine (Phase 2)" not in content:
    with open('DOCUMENTATION.md', 'a') as f:
        f.write(new_section)
