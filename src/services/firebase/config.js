import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB0FgY56i-oLfkMVSUvJY6trOMUBPMT9Ps",
  authDomain: "quickcrew-2c10c.firebaseapp.com",
  projectId: "quickcrew-2c10c",
  storageBucket: "quickcrew-2c10c.firebasestorage.app",
  messagingSenderId: "222676842218",
  appId: "1:222676842218:web:2ac84790955c34ccce0993",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

// ✅ IMPORTANT: different auth for web vs native
export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });