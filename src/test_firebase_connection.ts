import { db, auth } from './lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export async function testFirebase() {
  const user = auth.currentUser;
  console.log('Testing User:', user?.uid, user?.email);
  if (!user) return;
  try {
    const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
    const snap = await getDocs(q);
    console.log('TEST GETDOCS SUCCESS', snap.size);
  } catch (e: any) {
    console.error('TEST GETDOCS ERROR', e.code, e.message);
  }
}
