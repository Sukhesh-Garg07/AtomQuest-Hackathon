// src/firebase.js
// IMPORTANT: Replace with your actual Firebase project config from Firebase Console
// Go to: Firebase Console → Project Settings → Your Apps → Web App → Config

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBIIaP75F378Uw4eLBFfiEjuH2gc5OiQNY",
  authDomain: "atomquest-hackathon-project.firebaseapp.com",
  projectId: "atomquest-hackathon-project",
  storageBucket: "atomquest-hackathon-project.firebasestorage.app",
  messagingSenderId: "1031921889015",
  appId: "1:1031921889015:web:1c03d3a785c9edb9e82df2"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
