// seed-admin-eben.mjs
// Run with: node seed-admin-eben.mjs

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { config } from 'dotenv';

config({ path: '.env.local' });

const app = initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth(app);
const db   = getFirestore(app);

const ADMIN_EMAIL    = 'ewilkins25@gmail.com';
const ADMIN_PASSWORD = 'ValeoAdmin2026!'; // Change this after first login
const ADMIN_NAME     = 'Eben Wilkins';

async function seedAdmin() {
  console.log('🌱 Creating admin account for Eben Wilkins...\n');

  try {
    let uid;

    // 1. Create or fetch Firebase Auth account
    try {
      const userRecord = await auth.createUser({
        email:       ADMIN_EMAIL,
        password:    ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
      });
      uid = userRecord.uid;
      console.log(`✅ Auth account created: ${uid}`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(ADMIN_EMAIL);
        uid = existing.uid;
        // Update password to the one above in case it differs
        await auth.updateUser(uid, { password: ADMIN_PASSWORD, displayName: ADMIN_NAME });
        console.log(`ℹ️  Auth account already exists — updated: ${uid}`);
      } else {
        throw err;
      }
    }

    // 2. Create/overwrite Firestore user document with admin role
    await db.collection('users').doc(uid).set({
      uid,
      email:              ADMIN_EMAIL,
      displayName:        ADMIN_NAME,
      role:               'admin',
      status:             'active',
      onboardingComplete: true,
      createdAt:          new Date().toISOString(),
      createdBy:          'seed',
    }, { merge: true });

    console.log('✅ Firestore admin document created\n');
    console.log('─────────────────────────────────────────');
    console.log(`  Name:     ${ADMIN_NAME}`);
    console.log(`  Email:    ${ADMIN_EMAIL}`);
    console.log(`  Password: ${ADMIN_PASSWORD}`);
    console.log(`  Role:     admin`);
    console.log(`  Login:    https://www.valeoexperience.com/login`);
    console.log('─────────────────────────────────────────');
    console.log('\n⚠️  Change your password after first login!\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedAdmin();
