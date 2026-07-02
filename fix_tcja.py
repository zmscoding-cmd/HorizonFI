import re

with open('DOCUMENTATION.md', 'r') as f:
    text = f.read()

text = text.replace('(projected for the Post-TCJA 2026 sunset era)', '(with permanent TCJA 2026 brackets)')
text = text.replace('progressive post-TCJA 2026 ordinary income tax brackets', 'progressive permanent TCJA 2026 ordinary income tax brackets')

with open('DOCUMENTATION.md', 'w') as f:
    f.write(text)
