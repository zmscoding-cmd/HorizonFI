import re

with open('DOCUMENTATION.md', 'r') as f:
    text = f.read()

# Remove the bullet point about TCJA Sunset Reversion
text = re.sub(r'\*\s+\*\*2026 TCJA Sunset Reversion:\*\*\s+The engine factors in the statutory expiration of the 2017 Tax Cuts and Jobs Act on December 31, 2025\.\s+In calendar year 2026, progressive tax rates automatically return to pre-sunset brackets \(indexing ordinary brackets up to 39\.6% and halving the standard deduction\)\.\n?', '', text)

with open('DOCUMENTATION.md', 'w') as f:
    f.write(text)
