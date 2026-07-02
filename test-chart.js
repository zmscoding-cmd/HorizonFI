import { Worker } from 'worker_threads';
import fs from 'fs';

const code = fs.readFileSync('src/workers/simulation.worker.ts', 'utf-8');
// Compile TS to JS in memory (simplistic via esbuild or just use ts-node)
