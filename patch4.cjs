const fs = require('fs');
let code = fs.readFileSync('src/tests/checkpoint.test.ts', 'utf-8');

// The test file contains references to simulateNetWorthProbabilistic.
// Because it's a test for an obsolete function, I can just remove the whole Net Worth suite from the test.
// Wait, is there anything else in the file? Let's check what's in checkpoint.test.ts.

