import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyASl-UPnjsWyuKcJLmngrzjC4xSpQbtz4A",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "fahem-88d40.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fahem-88d40",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "fahem-88d40.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1061555578804",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1061555578804:web:4af4bf8b8f1702239774e1",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-9FFJ4E8XQQ",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Initialize App Check defensively
let appCheck: any = null;
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY) {
  try {
    // If in development mode or debug is enabled, configure local App Check debug token
    if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_APP_CHECK_DEBUG === "true") {
      // @ts-ignore
      self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("[App Check] Defensive App Check initialized successfully with reCAPTCHA Enterprise");
  } catch (error) {
    console.warn("[App Check] Defensive initialization failed or bypassed:", error);
  }
}

export { app, db, auth, googleProvider, appCheck };


