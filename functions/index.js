const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to delete your account.");
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  // 1. Borra todos los archivos de este usuario en Storage (foto, cv, id, visa)
  await bucket.deleteFiles({ prefix: `users/${uid}/` }).catch(() => {
    // best-effort: puede no existir la carpeta
  });

  // 2. Borra documentos relacionados en otras colecciones (best-effort)
  const collectionsToClean = [
    { name: "applications", fields: ["workerUid", "workerId"] },
    { name: "workerShiftDayLocks", fields: ["workerUid"] },
    { name: "assignments", fields: ["workerUid"] },
  ];

  for (const { name, fields } of collectionsToClean) {
    for (const field of fields) {
      const snap = await db.collection(name).where(field, "==", uid).get();
      if (!snap.empty) {
        const batch = db.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  }

  // 3. Borra el documento de perfil y cualquier subcolección (ej. savedJobs)
  await db.recursiveDelete(db.collection("users").doc(uid));

  // 4. Por último, borra el usuario de Firebase Auth
  await admin.auth().deleteUser(uid);

  return { ok: true };
});