import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function main() {
  console.log('Inspecting Firestore collections...');
  const collections = ['registrationRequests', 'members', 'users', 'counters'];
  for (const colName of collections) {
    const snap = await getDocs(collection(db, colName));
    console.log(`Collection: ${colName}, Count: ${snap.size}`);
    snap.forEach(d => {
      const data = d.data();
      console.log(` - ID: ${d.id}, Name: ${data.name || data.title}, Email: ${data.email}, Role: ${data.role}, Status: ${data.status}`);
    });
  }

  // Also check settings
  const settingsSnap = await getDoc(doc(db, 'settings', 'committee'));
  if (settingsSnap.exists()) {
    console.log('Committee Settings:', JSON.stringify(settingsSnap.data(), null, 2).slice(0, 300));
  } else {
    console.log('No committee settings found.');
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
