import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from "firebase/storage";

const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_APIKEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGE_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
});

const firebaseAuth = getAuth(app);
const firebaseDb = getFirestore(app);
const firebaseFunctions = getFunctions(app);
const firebaseStorage = getStorage(app);

if (import.meta.env.MODE === 'development') {
    connectFirestoreEmulator(firebaseDb, 'localhost', 8080);
    connectFunctionsEmulator(firebaseFunctions, 'localhost', 5001);
    connectAuthEmulator(firebaseAuth, 'http://localhost:9099');
    connectStorageEmulator(firebaseStorage, 'localhost', 9199);
}

export { firebaseAuth, firebaseDb, firebaseFunctions, firebaseStorage };
export default app;