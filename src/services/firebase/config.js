import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// APP_ENV picks which Firebase project this build talks to. Set per EAS build
// profile in eas.json; defaults to "development" for local `expo start`. See
// CLAUDE.md for the full dev/prod project split.
const APP_ENV = process.env.EXPO_PUBLIC_APP_ENV || "development";

const firebaseConfigByEnv = {
  development: {
    apiKey: "AIzaSyB0FgY56i-oLfkMVSUvJY6trOMUBPMT9Ps",
    authDomain: "quickcrew-2c10c.firebaseapp.com",
    projectId: "quickcrew-2c10c",
    storageBucket: "quickcrew-2c10c.firebasestorage.app",
    messagingSenderId: "222676842218",
    appId: "1:222676842218:web:2ac84790955c34ccce0993",
  },
  production: {
    apiKey: "AIzaSyDJikdpD4cdtgWjsT1zwGavcyjTuDH2QFY",
    authDomain: "quickcrew-prod.firebaseapp.com",
    projectId: "quickcrew-prod",
    storageBucket: "quickcrew-prod.firebasestorage.app",
    messagingSenderId: "806987404946",
    appId: "1:806987404946:web:8cd95892b88b2458aa784b",
  },
};

const firebaseConfig = firebaseConfigByEnv[APP_ENV] || firebaseConfigByEnv.development;

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);

// ✅ IMPORTANT: different auth for web vs native
export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });