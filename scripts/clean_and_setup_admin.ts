import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, deleteDoc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

async function main() {
  console.log('--- STEP 1: Deleting all test registration requests ---');
  const regSnap = await getDocs(collection(db, 'registrationRequests'));
  for (const d of regSnap.docs) {
    console.log(`Deleting registration request: ${d.id} (${d.data().name})`);
    await deleteDoc(doc(db, 'registrationRequests', d.id));
  }

  console.log('--- STEP 2: Deleting all existing test members ---');
  const memSnap = await getDocs(collection(db, 'members'));
  for (const d of memSnap.docs) {
    console.log(`Deleting member record: ${d.id} (${d.data().name})`);
    await deleteDoc(doc(db, 'members', d.id));
  }

  console.log('--- STEP 3: Cleaning up non-admin users ---');
  const userSnap = await getDocs(collection(db, 'users'));
  for (const d of userSnap.docs) {
    const data = d.data();
    if (data.role !== 'ADMIN' && d.id !== 'admin_master_kishau') {
      console.log(`Deleting test user: ${d.id} (${data.name || data.email})`);
      await deleteDoc(doc(db, 'users', d.id));
    }
  }

  console.log('--- STEP 4: Creating/Updating Admin Member Record & User Account ---');
  const now = new Date().toISOString();

  // Admin User Account
  const adminAccount = {
    id: 'admin_master_kishau',
    email: 'kishaubandhsangharshsamiti@gmail.com',
    mobile: '6397987952',
    name: 'Narendra Singh Tomar',
    fatherName: 'Sitaram Tomar',
    role: 'ADMIN',
    status: 'APPROVED',
    code: 'ADM-001',
    memberId: 'mem_admin_narendra',
    updatedAt: now
  };
  await setDoc(doc(db, 'users', 'admin_master_kishau'), adminAccount, { merge: true });
  console.log('Updated users/admin_master_kishau');

  // Admin Member Record
  const adminMember = {
    id: 'mem_admin_narendra',
    userId: 'admin_master_kishau',
    code: 'ADM-001',
    role: 'ADMIN',
    name: 'Narendra Singh Tomar',
    fatherName: 'Sitaram Tomar',
    email: 'kishaubandhsangharshsamiti@gmail.com',
    mobile: '6397987952',
    address: 'Shambhar Mailoth Kwanu',
    village: 'Kwanu',
    designation: 'Chief Executive Administrator',
    education: 'Graduate',
    photoUrl: '/admin_narendra_photo.jpg',
    status: 'APPROVED',
    createdAt: now,
    updatedAt: now,
    approvedAt: now,
    approvedBy: 'Central Executive Council'
  };
  await setDoc(doc(db, 'members', 'mem_admin_narendra'), adminMember);
  console.log('Created members/mem_admin_narendra');

  console.log('--- STEP 5: Updating Committee Settings Admin Signatory Name ---');
  const settingsRef = doc(db, 'settings', 'committee');
  const settingsSnap = await getDoc(settingsRef);
  if (settingsSnap.exists()) {
    await updateDoc(settingsRef, {
      adminName: 'Narendra Singh Tomar',
      updatedAt: now
    });
    console.log('Updated committee settings adminName to Narendra Singh Tomar');
  } else {
    await setDoc(settingsRef, {
      committeeName: 'Kishau Bandh Sangharsh Samiti',
      logoUrl: '',
      presidentName: 'Shri Surat Singh Tomar',
      presidentSignatureUrl: '',
      adminName: 'Narendra Singh Tomar',
      adminSignatureUrl: '',
      updatedAt: now
    });
    console.log('Created default committee settings with adminName: Narendra Singh Tomar');
  }

  console.log('--- STEP 6: Resetting Counters cleanly ---');
  await setDoc(doc(db, 'counters', 'codes'), {
    memberCounter: 0,
    officerCounter: 0,
    updatedAt: now
  }, { merge: true });

  console.log('ALL TASKS COMPLETED SUCCESSFULLY!');
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});
