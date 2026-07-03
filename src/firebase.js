import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey:            "AIzaSyDJhzTbbLbGXvNB0U1-uYPfU59IYbOOKEo",
  authDomain:        "queen-star.firebaseapp.com",
  projectId:         "queen-star",
  storageBucket:     "queen-star.firebasestorage.app",
  messagingSenderId: "127291008287",
  appId:             "1:127291008287:web:b72bed65534fe34b25fc2a",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Push notifications (Cloud Messaging). `messaging` stays null in browsers/
// WebViews that don't support it, or if init fails for any reason — every
// caller must check for null before using it, so a missing/unsupported
// environment never crashes the app the way the missing .env config did.
export let messaging = null;
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  isSupported().then(ok => { if (ok) { try { messaging = getMessaging(app); } catch {} } }).catch(()=>{});
}
