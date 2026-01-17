import { db } from "./config";
import { collection, getDocs, query } from "firebase/firestore";

/**
 * Read all documents from a collection
 * @param {string} collectionName
 * @returns {Promise<Array<{ id: string }>>}
 */
export async function readCollection(collectionName) {
  if (!collectionName) {
    throw new Error("readCollection: collectionName is required");
  }

  const colRef = collection(db, collectionName);
  const q = query(colRef);

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}