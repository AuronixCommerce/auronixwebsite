'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';

import {
  getDatabase,
} from 'firebase/database';

import {
  initializeAuth,
  browserLocalPersistence,
  browserSessionPersistence,
  type Auth,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'missing-firebase-api-key',

  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',

  databaseURL:
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || 'http://127.0.0.1:9000?ns=missing-firebase-project',

  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'missing-firebase-project',

  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',

  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',

  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

function validateConfig() {
  const missing: string[] = [];

  const required: Array<
    [string, string]
  > = [
    [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      firebaseConfig.apiKey,
    ],
    [
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      firebaseConfig.authDomain,
    ],
    [
      'NEXT_PUBLIC_FIREBASE_DATABASE_URL',
      firebaseConfig.databaseURL,
    ],
    [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      firebaseConfig.projectId,
    ],
    [
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      firebaseConfig.storageBucket,
    ],
    [
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      firebaseConfig.messagingSenderId,
    ],
    [
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      firebaseConfig.appId,
    ],
  ];

  for (const [name, value] of required) {
    if (!value || value === 'missing-firebase-api-key' || value === 'missing-firebase-project' || value === 'http://127.0.0.1:9000?ns=missing-firebase-project') {
      missing.push(name);
    }
  }

  if (missing.length > 0) {
    console.error(
      '[firebase] Missing Firebase environment variables:',
      missing
    );
  }
}

validateConfig();

export const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

/*
 * IMPORTANT:
 *
 * Do NOT use the normal getAuth(app) initialization here.
 *
 * The reported runtime error comes from IndexedDB persistence:
 *
 * "Database is closing/hidden"
 *
 * We intentionally use localStorage/session persistence instead.
 *
 * browserLocalPersistence:
 * - keeps users signed in across normal refreshes
 *
 * browserSessionPersistence:
 * - provides a fallback if local persistence cannot be used
 *
 * Neither requires Firebase Auth's IndexedDB persistence.
 */

let authInstance: Auth;

try {
  authInstance = initializeAuth(app, {
    persistence: [
      browserLocalPersistence,
      browserSessionPersistence,
    ],
  });
} catch (error) {
  /*
   * initializeAuth can throw if Auth was already initialized
   * elsewhere during development hot reload.
   *
   * Dynamically importing getAuth here avoids changing the
   * normal startup path and keeps HMR resilient.
   */
  console.warn(
    '[firebase] Auth was already initialized. Reusing existing Auth instance.',
    error
  );

  /*
   * eslint / TypeScript can safely resolve this on the client
   * because this module is explicitly a client module.
   */
  const {
    getAuth,
  } = require('firebase/auth');

  authInstance =
    getAuth(app);
}

export const auth =
  authInstance;

export const db =
  getDatabase(app);
