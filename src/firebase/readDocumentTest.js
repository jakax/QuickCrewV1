import { doc, getDoc } from "firebase/firestore";
import { db } from "./config.js";

export const readDocumentTest = async (docPath) => {
  try {
    const ref = doc(db, docPath, "joaquin_test");
    const snap = await getDoc(ref);

    if (snap.exists()) {
      console.log("Firestore user:", snap.data());
    } else {
      console.log("No user found");
    }
  } catch (error) {
    console.error("Firestore error:", error);
  }
};