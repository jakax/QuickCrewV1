import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase/config";

// Keep your existing updateUserProfile if you have it.
// If you already export updateUserProfile, just ensure it sets updatedAt.
export async function updateUserProfile(uid, updates) {
  if (!uid) throw new Error("Missing uid");
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, {
    ...(updates || {}),
    updatedAt: serverTimestamp(),
  });
}

// Helper: convert a local file URI to Blob (Expo/RN)
async function uriToBlob(uri) {
  const res = await fetch(uri);
  if (!res.ok) throw new Error("Could not read file");
  return await res.blob();
}

export async function uploadUserPhoto({ uid, uri }) {
  if (!uid) throw new Error("Missing uid");
  if (!uri) throw new Error("Missing file uri");

  const blob = await uriToBlob(uri);

  // Store under users/{uid}/photo
  const path = `users/${uid}/photo.jpg`;
  const r = storageRef(storage, path);

  await uploadBytes(r, blob, { contentType: "image/jpeg" });
  const url = await getDownloadURL(r);

  await updateUserProfile(uid, {
    photo: { url, path, uploadedAt: serverTimestamp() },
  });

  return { url, path };
}

export async function uploadUserCv({ uid, uri, fileName, mimeType }) {
  if (!uid) throw new Error("Missing uid");
  if (!uri) throw new Error("Missing file uri");

  const blob = await uriToBlob(uri);

  const safeName = (fileName || "cv").replace(/[^\w.-]+/g, "_");
  const path = `users/${uid}/cv/${safeName}`;
  const r = storageRef(storage, path);

  await uploadBytes(r, blob, { contentType: mimeType || "application/pdf" });
  const url = await getDownloadURL(r);

  await updateUserProfile(uid, {
    cv: { url, path, fileName: safeName, uploadedAt: serverTimestamp() },
  });

  return { url, path };
}

export async function uploadUserIdDocument({ uid, uri, fileName, mimeType }) {
  if (!uid) throw new Error("Missing uid");
  if (!uri) throw new Error("Missing file uri");

  const blob = await uriToBlob(uri);

  const safeName = (fileName || "id_document").replace(/[^\w.-]+/g, "_");
  const path = `users/${uid}/idDocument/${safeName}`;
  const r = storageRef(storage, path);

  await uploadBytes(r, blob, { contentType: mimeType || "application/pdf" });
  const url = await getDownloadURL(r);

  await updateUserProfile(uid, {
    idDocument: { url, path, fileName: safeName, uploadedAt: serverTimestamp() },
  });

  return { url, path };
}
