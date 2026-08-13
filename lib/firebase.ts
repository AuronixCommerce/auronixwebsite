import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyPlaceholderKey',
  authDomain: 'erprise-app.firebaseapp.com',
  databaseURL: 'https://erprise-app-default-rtdb.firebaseio.com/',
  projectId: 'erprise-app',
  storageBucket: 'erprise-app.appspot.com',
  messagingSenderId: '0',
  appId: '1:0:web:0',
};

let app: FirebaseApp;
let db: Database;
let auth: Auth;

if (typeof window !== 'undefined') {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getDatabase(app);
  auth = getAuth(app);
}

export { app, db, auth };
