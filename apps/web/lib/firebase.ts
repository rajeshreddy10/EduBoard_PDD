"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { initializeFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

import { getFirebaseApiKey } from "./keyRotation";

const firebaseConfig = {
    apiKey: getFirebaseApiKey(),
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || `https://${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'eduboard-ai'}-default-rtdb.firebaseio.com`,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Initialize Firestore with long-polling fallback for network resilience
export const db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
});

// Enable IndexedDB offline persistence for client-side environments safely
if (typeof window !== "undefined") {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === "failed-precondition") {
            console.warn("[Firestore Persistence Warning]: Multiple tabs open. Offline persistence active in primary tab.");
        } else if (err.code === "unimplemented") {
            console.warn("[Firestore Persistence Warning]: IndexedDB is unsupported in this browser environment.");
        } else {
            console.warn("[Firestore Persistence Initialization Notice]:", err.message);
        }
    });
}

export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const realtimeDb = rtdb;
export default app;
