// seed-dr-miller.mjs
// Run with: node seed-dr-miller.mjs
// Make sure your .env.local is loaded or set FIREBASE_PROJECT_ID etc. manually below.

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config({ path: '.env.local' });

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// Option A: Service account JSON (if you have one)
// const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf8'));

// Option B: Environment variables (recommended)
const app = initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const auth = getAuth(app);
const db   = getFirestore(app);

// ─── DR. MILLER'S PROFILE ────────────────────────────────────────────────────
const DR_MILLER_EMAIL    = 'thevaleoexperience@gmail.com'; // Change to her real email
const DR_MILLER_PASSWORD = 'ValeoDoctor2026!';            // She should change this on first login

const drMillerProfile = {
  // Account
  email:       DR_MILLER_EMAIL,
  displayName: 'Dr. Jozelle Miller',
  role:        'doctor',

  // Professional
  title:             'PhD',
  bio:               'For over 15 years, I have had the privilege of walking alongside individuals and families through their darkest moments—and celebrating with them as they rediscover their light. My approach combines cutting-edge psychology with deep cultural understanding. Because healing happens best when you are truly seen, heard, and understood in your full Caribbean context.',
  gender:            'female',
  yearsExperience:   15,
  timezone:          'America/St_Vincent',
  photoURL:          '',

  // Specializations
  specializations: [
    'Individual Therapy',
    'Couples Therapy',
    'Trauma Recovery',
    'Anxiety & Depression',
    'Workplace Wellness',
    'Resilience Coaching',
    'Group Therapy',
  ],

  // Session types
  sessionTypes: ['video'],

  // Therapeutic approaches
  approaches: [
    'Cognitive Behavioral Therapy (CBT)',
    'Trauma-Informed Care',
    'Solution-Focused Therapy',
    'Culturally-Adaptive Therapy',
  ],

  // Languages
  languages: ['English'],

  // Availability & capacity
  maxClients:       30,
  acceptingClients: true,

  // Pricing (TTD)
  sessionPrice: {
    video:     1000,
    inPerson:  1200,
    phone:     800,
  },

  // Credentials
  credentials: [
    'PhD in Health Psychology',
    'Published Author — 3 Books on Resilience & Caribbean Mental Health',
    'International Keynote Speaker',
    'Specializing in Trauma Recovery, Anxiety & Workplace Mental Health',
  ],

  // Platform
  status:             'active',
  verified:           true,
  onboardingComplete: true,
  createdBy:          'seed',
  createdAt:          new Date().toISOString(),
};

async function seedDrMiller() {
  console.log('🌱 Seeding Dr. Miller\'s profile...\n');

  try {
    // 1. Create Firebase Auth account
    let uid;
    try {
      const userRecord = await auth.createUser({
        email:       DR_MILLER_EMAIL,
        password:    DR_MILLER_PASSWORD,
        displayName: 'Dr. Jozelle Miller',
      });
      uid = userRecord.uid;
      console.log(`✅ Auth account created: ${uid}`);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        const existing = await auth.getUserByEmail(DR_MILLER_EMAIL);
        uid = existing.uid;
        console.log(`ℹ️  Auth account already exists: ${uid}`);
      } else {
        throw err;
      }
    }

    // 2. Create users document
    await db.collection('users').doc(uid).set({
      uid,
      email:              DR_MILLER_EMAIL,
      displayName:        'Dr. Jozelle Miller',
      role:               'doctor',
      onboardingComplete: true,
      status:             'active',
      createdAt:          drMillerProfile.createdAt,
    });
    console.log('✅ users document created');

    // 3. Create doctors document
    await db.collection('doctors').doc(uid).set({
      uid,
      ...drMillerProfile,
    });
    console.log('✅ doctors document created');

    console.log('\n🎉 Done! Dr. Miller\'s profile is ready.\n');
    console.log('─────────────────────────────────────────');
    console.log(`  Email:    ${DR_MILLER_EMAIL}`);
    console.log(`  Password: ${DR_MILLER_PASSWORD}`);
    console.log(`  Login:    https://www.valeoexperience.com/login`);
    console.log('─────────────────────────────────────────');
    console.log('\n⚠️  Make sure Dr. Miller changes her password on first login!\n');

  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedDrMiller();
