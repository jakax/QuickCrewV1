import { collection, getDocs } from "firebase/firestore";
import { db } from "./config.js";

export const readCollection = async (col) => {
  try {
    const ref = collection(db, col);
    const snap = await getDocs(ref);

    if (snap.empty) {
      console.log(`No documents found in collection: ${col}`);
      return [];
    }

    const collectionData = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return collectionData;
  } catch (error) {
    console.error("Firestore error:", error);
    return []; // so your UI doesn't crash
  }
};