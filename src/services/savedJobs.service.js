import { db } from "./firebase/config";
import {
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  collection,
  serverTimestamp,
} from "firebase/firestore";

export function subscribeSavedJobs(uid, onChange, onError) {
  if (!uid) return () => {};
  const colRef = collection(db, "users", uid, "savedJobs");

  return onSnapshot(
    colRef,
    (snap) => {
      const map = new Map();
      snap.forEach((d) => map.set(d.id, d.data())); // id === jobId
      onChange(map);
    },
    (e) => onError?.(e)
  );
}

export async function saveJob({ uid, jobId, orgId }) {
  if (!uid || !jobId) throw new Error("Missing uid/jobId");
  await setDoc(doc(db, "users", uid, "savedJobs", jobId), {
    jobId,
    orgId: orgId || null,
    savedAt: serverTimestamp(),
  });
}

export async function unsaveJob({ uid, jobId }) {
  if (!uid || !jobId) throw new Error("Missing uid/jobId");
  await deleteDoc(doc(db, "users", uid, "savedJobs", jobId));
}