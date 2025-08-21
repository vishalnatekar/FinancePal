import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";

// Check if Firebase environment variables are configured
const hasFirebaseConfig = 
  import.meta.env.VITE_FIREBASE_API_KEY && 
  import.meta.env.VITE_FIREBASE_APP_ID && 
  import.meta.env.VITE_FIREBASE_PROJECT_ID;

let app: any = null;
let auth: any = null;

if (hasFirebaseConfig) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  
  // Log current domain for debugging
  console.log('Current domain:', window.location.hostname);
  console.log('Full URL:', window.location.href);
} else {
  console.warn("Firebase configuration is missing. Please provide VITE_FIREBASE_API_KEY, VITE_FIREBASE_APP_ID, and VITE_FIREBASE_PROJECT_ID environment variables.");
}

export { auth };
