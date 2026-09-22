import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function main() {
  const base64 = fs.readFileSync('scripts/admin_photo_base64.txt', 'utf-8').trim();
  console.log('Updating member photo to base64 length:', base64.length);
  await updateDoc(doc(db, 'members', 'mem_admin_narendra'), {
    photoUrl: base64,
    updatedAt: new Date().toISOString()
  });
  console.log('Successfully updated members/mem_admin_narendra photoUrl with base64 data URL!');
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
