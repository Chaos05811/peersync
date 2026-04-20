import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAA7XCQysFCbvbviUxHJKyLNU4XZ96Cqbs",
  authDomain: "peersync-fafcf.firebaseapp.com",
  projectId: "peersync-fafcf",
  storageBucket: "peersync-fafcf.firebasestorage.app",
  messagingSenderId: "361358469846",
  appId: "1:361358469846:web:0af9f13df3f3e5e9daf777",
  measurementId: "G-GTNNP8NPNY"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);

let analyticsPromise;

export function initializeFirebaseAnalytics() {
  if (!analyticsPromise && typeof window !== "undefined") {
    analyticsPromise = analyticsSupported()
      .then((supported) => (supported ? getAnalytics(firebaseApp) : null))
      .catch(() => null);
  }

  return analyticsPromise ?? Promise.resolve(null);
}
