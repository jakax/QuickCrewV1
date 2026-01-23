import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase/config";

export async function updateUserProfile(uid, patch) {
  if (!uid) throw new Error("Missing uid");
  await updateDoc(doc(db, "users", uid), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}