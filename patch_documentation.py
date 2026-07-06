import re

with open('DOCUMENTATION.md', 'r') as f:
    content = f.read()

# Insert before "## Managing Assets" or at the end if not found
scenario_docs = """
## Multi-Scenario Budgeting & Sandbox Mode

HorizonFI supports complex multi-scenario planning, allowing you to create different hypothetical futures (e.g., "Baseline", "Boat Refit", "High Travel Year") without impacting your real-world variance tracking.

### Active Tracking Scenario vs. Sandbox Scenarios
*   **Active Tracking Scenario:** Only **one** scenario can be designated as the "Active Tracking" scenario for a given calendar year. When you record real-world "Actual Expenses", HorizonFI compares those expenses strictly against the budget targets of the active scenario to calculate your Budget vs. Actuals variance.
*   **Sandbox Scenarios:** All other scenarios operate in "Sandbox Mode". You can freely adjust their budget targets, add scenario-specific tax events (e.g., hypothetical Roth conversions or asset liquidations), and modify funding allocations without altering your baseline variance reporting.

### Using the Scenario Hub
To manage your scenarios:
1. Click the **Scenario Switcher** dropdown in the top navigation header.
2. Select **Manage Scenarios** to open the **Scenario Hub** drawer.
3. **Create New:** Quickly build a fresh scenario from scratch.
4. **Duplicate (Clone):** Click the "Copy" icon next to an existing scenario to duplicate its configuration. This is the safest way to test hypothetical changes (e.g., cloning "Baseline" to model the tax impact of buying a boat) without destroying your core plan.
5. **Set Active:** Click the "Target" icon on a sandbox scenario to promote it to the "Active Tracking Scenario" for the current year.

*Visual Cues:* The top navigation bar explicitly displays a green "Active Tracking" badge or an amber "Sandbox Mode" badge, so you always know exactly what context you are editing.
"""

if "## Managing Assets" in content:
    content = content.replace("## Managing Assets", scenario_docs + "\n## Managing Assets")
else:
    content += "\n" + scenario_docs

with open('DOCUMENTATION.md', 'w') as f:
    f.write(content)

print("Patched DOCUMENTATION.md")
