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

  // 2. Cierra cualquier shift donde este worker haya quedado asignado/confirmado —
  // si no, el shift queda huérfano (assignedWorkerUid/filledByUid apuntando a un
  // usuario que ya no existe) y el employer se queda sin ninguna acción disponible
  // en la app para cerrarlo (ver AssignedWorkerDetails.jsx). Mismo estado terminal
  // que usa el cancelJob del employer (jobs.service.js) para reusar la UI existente.
  const TERMINAL_JOB_STATUSES = ["cancelled", "finished", "completed"];
  const assignedFields = ["assignedWorkerUid", "filledByUid"];

  for (const field of assignedFields) {
    const jobsSnap = await db.collection("jobs").where(field, "==", uid).get();
    if (jobsSnap.empty) continue;

    const batch = db.batch();
    jobsSnap.docs.forEach((jobDoc) => {
      const status = String(jobDoc.data()?.status || "").toLowerCase();
      if (TERMINAL_JOB_STATUSES.includes(status)) return;
      batch.update(jobDoc.ref, {
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: "worker_account_deleted",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // 3. Borra documentos relacionados en otras colecciones (best-effort)
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

  // 4. Borra el documento de perfil y cualquier subcolección (ej. savedJobs)
  await db.recursiveDelete(db.collection("users").doc(uid));

  // 5. Por último, borra el usuario de Firebase Auth
  await admin.auth().deleteUser(uid);

  return { ok: true };
});