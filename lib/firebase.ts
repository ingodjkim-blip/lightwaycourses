import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyA1221-NjogOmgPKENEL8KUwy6sZ4tfKCU",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "lightway-course.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "lightway-course",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "lightway-course.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "48135183063",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:48135183063:web:2d5f2638413c877a15ee92",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-7TPWY4KTH5",
};

const emulatorMode = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === "true";
const isNewApp = !getApps().length;
// Local tests cannot fall back to the production project or analytics.
const config = emulatorMode ? {
  apiKey: "local-emulator-key",
  authDomain: "localhost",
  projectId: "demo-lightway-pilot",
  appId: "local-emulator-app",
} : firebaseConfig;
export const firebaseApp = isNewApp ? initializeApp(config) : getApp();
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
if (emulatorMode && isNewApp) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export async function initializeAnalytics() {
  if (typeof window === "undefined" || emulatorMode) return;
  const { getAnalytics, isSupported } = await import("firebase/analytics");
  if (await isSupported()) getAnalytics(firebaseApp);
}

export function friendlyFirebaseError(error: unknown) {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code.includes("invalid-credential")) return "Email or password is incorrect.";
  if (code.includes("too-many-requests")) return "Too many attempts. Please wait and try again.";
  if (code.includes("network-request-failed")) return "Cannot reach Firebase. Check your connection.";
  if (code.includes("permission-denied")) return "Your account does not have permission for this action.";
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}
