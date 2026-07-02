import { createRxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { planSchema } from './src/lib/db';

async function main() {
  // It's tricky to patch the DB from the command line because of the browser environment.
  // Actually, I can't easily patch IndexedDB from the node environment.
}
main();
