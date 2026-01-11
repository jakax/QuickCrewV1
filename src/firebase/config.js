// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB0FgY56i-oLfkMVSUvJY6trOMUBPMT9Ps",
  authDomain: "quickcrew-2c10c.firebaseapp.com",
  projectId: "quickcrew-2c10c",
  storageBucket: "quickcrew-2c10c.firebasestorage.app",
  messagingSenderId: "222676842218",
  appId: "1:222676842218:web:2ac84790955c34ccce0993"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);