# Security Specification

## Data Invariants
1. A household must have a name, members array (<= 10), and timestamps.
2. A household can only be modified by a user in its members array.
3. A scenario must be tied to a valid household ID and the user must be a member of that household.
4. Scenarios contain configurable budget objects, and arrays for limits/assets.
5. All IDs must be strictly validated.

## Dirty Dozen Payloads
1. Create household with missing members.
2. Create household without timestamps.
3. Update household without being a member.
4. Create household where member ID exceeds 128 characters.
5. Create scenario but householdId is ghost/doesn't exist.
6. Create scenario but user is not in the parent household's member list.
7. Update scenario modifying the `householdId` (immutable).
8. Update scenario where members array contains huge string.
9. Delete scenario without being a household member.
10. Query scenarios where `householdId` doesn't match the one the user belongs to.
11. Update scenario status to terminal state skipping required logic.
12. Attempt to add a ghost field to a Household or Scenario.
