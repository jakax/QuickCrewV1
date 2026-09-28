const { onCall, HttpsError } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

admin.initializeApp();

exports.deleteAccount = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in to delete your account.");
  }

  const db = admin.firestore();
  const bucket = admin.storage().bucket();

  // Read the profile now, before anything below deletes it — needed for the
  // tombstone written just before step 4, and to branch on role below.
  const userSnapBeforeDelete = await db.collection("users").doc(uid).get();
  const userDataBeforeDelete = userSnapBeforeDelete.exists ? userSnapBeforeDelete.data() : null;
  const isEmployer = userDataBeforeDelete?.role === "employer";

  // 1. Borra todos los archivos de este usuario en Storage (foto, cv, id, visa)
  await bucket.deleteFiles({ prefix: `users/${uid}/` }).catch(() => {
    // best-effort: puede no existir la carpeta
  });

  // Employers: none of the worker-specific cleanup below applies to them (they're
  // never assignedWorkerUid/filledByUid/workerUid on anything), and everything
  // that follows through step 4 is worker-shaped. Instead of recursiveDelete-ing
  // their users/{uid} doc — which is the ONLY thing EmployersScreen.tsx queries,
  // so deleting it makes them vanish from the backoffice's Employers tab entirely,
  // even though their organization survives — keep the doc and flip it to
  // "suspended" with a reason. This reuses the EXISTING Suspended tab and its
  // existing statusReason column (EmployersScreen.tsx already renders both) —
  // no new backoffice UI. Employers also never upload anything sensitive (no
  // CV/idDocument/visaDocument, unlike workers), so there's far less at stake
  // privacy-wise in leaving their basic profile fields in place.
  if (isEmployer) {
    // Cancel every non-terminal job this employer created — mirrors jobs.service.js's
    // client-side cancelJob cascade exactly (job -> "cancelled", attached worker's
    // assignment closed with a reason, pending/accepted applications -> "job_cancelled",
    // day locks released) so workers who had a shift with this business aren't left
    // with a stale "upcoming shift" that quietly never happens.
    const TERMINAL_JOB_STATUSES = ["cancelled", "cancel", "finished", "completed"];
    const createdJobsSnap = await db.collection("jobs").where("createdBy", "==", uid).get();

    for (const jobDoc of createdJobsSnap.docs) {
      const job = jobDoc.data();
      const status = String(job?.status || "").toLowerCase();
      if (TERMINAL_JOB_STATUSES.includes(status)) continue;

      const batch = db.batch();

      batch.update(jobDoc.ref, {
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: "employer_account_deleted",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const attachedWorkerUid = job?.assignedWorkerUid || job?.filledByUid;
      if (attachedWorkerUid) {
        const assignmentSnap = await db.collection("assignments").doc(`${jobDoc.id}_${attachedWorkerUid}`).get();
        if (assignmentSnap.exists && assignmentSnap.data()?.hoursSubmitted !== true) {
          batch.update(assignmentSnap.ref, {
            status: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelReason: "employer_account_deleted",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      const appsSnap = await db.collection("applications")
        .where("jobId", "==", jobDoc.id)
        .where("orgId", "==", job.orgId || null)
        .where("status", "in", ["pending", "accepted"])
        .get();

      appsSnap.docs.forEach((appDoc) => {
        const app = appDoc.data();
        batch.update(appDoc.ref, {
          status: "job_cancelled",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        const appWorkerUid = app?.workerUid || app?.workerId;
        const appShiftDate = String(app?.shiftDate || "").trim();
        if (appWorkerUid && appShiftDate) {
          batch.delete(db.collection("workerShiftDayLocks").doc(`${appWorkerUid}_${appShiftDate}`));
        }
      });

      await batch.commit();
    }

    await db.collection("users").doc(uid).update({
      approvalStatus: "suspended",
      isActive: false,
      statusReason: "Account deleted by the employer.",
      statusUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      statusUpdatedBy: "system:deleteAccount",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Still actually deletes the Auth user — they can no longer sign in, which is
    // the part of "delete my account" that matters from the user's own side.
    await admin.auth().deleteUser(uid);
    return { ok: true };
  }

  // 2. Detaches this worker from any shift they were assigned/confirmed to. If the
  // shift hasn't started yet, reopen it (status "open", cleared assignedWorkerUid/
  // filledByUid/assignmentId) so another worker can take it — the shift itself is
  // still legitimate, only this worker can no longer work it (same reasoning as
  // the backoffice's suspend-worker cascade in users.service.ts). If it already
  // started (or its start time is unknown), reopening makes no sense — cancel it
  // instead, same as before, so the employer isn't left with an ambiguous "open"
  // shift for something already underway.
  const TERMINAL_JOB_STATUSES = ["cancelled", "finished", "completed"];
  const assignedFields = ["assignedWorkerUid", "filledByUid"];

  const getShiftStartMs = (job) => {
    const ts = job?.shiftStartAt;
    if (ts && typeof ts.toMillis === "function") return ts.toMillis();
    if (ts && typeof ts.toDate === "function") return ts.toDate().getTime();
    return NaN;
  };

  for (const field of assignedFields) {
    const jobsSnap = await db.collection("jobs").where(field, "==", uid).get();
    if (jobsSnap.empty) continue;

    const batch = db.batch();
    jobsSnap.docs.forEach((jobDoc) => {
      const status = String(jobDoc.data()?.status || "").toLowerCase();
      if (TERMINAL_JOB_STATUSES.includes(status)) return;

      const startMs = getShiftStartMs(jobDoc.data());
      const hasNotStartedYet = Number.isFinite(startMs) && startMs > Date.now();

      if (hasNotStartedYet) {
        batch.update(jobDoc.ref, {
          status: "open",
          assignedWorkerUid: null,
          assignedAt: null,
          filledByUid: null,
          assignmentId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        batch.update(jobDoc.ref, {
          status: "cancelled",
          cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
          cancelReason: "worker_account_deleted",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });
    await batch.commit();
  }

  // 2.5. Close out this worker's assignments instead of deleting them — an
  // assignment is QuickCrew's actual shift record (used by the backoffice's
  // Unclosed/Pending/Reviewed/Paid/Rejected tabs). Deleting it here would erase
  // any trace that the shift ever existed, even though step 2 just took care to
  // mark the job itself "cancelled" with a reason. One still-open assignment
  // (hoursSubmitted !== true) gets the same treatment as step 2's job cancel —
  // closed with a reason so it drops out of "Unclosed" but stays queryable.
  // Anything already past hoursSubmitted (reviewed/paid/rejected) is untouched —
  // it's real payroll history, not this cleanup's concern.
  const assignmentsSnap = await db.collection("assignments").where("workerUid", "==", uid).get();
  if (!assignmentsSnap.empty) {
    const batch = db.batch();
    assignmentsSnap.docs.forEach((assignmentDoc) => {
      if (assignmentDoc.data()?.hoursSubmitted === true) return;
      batch.update(assignmentDoc.ref, {
        status: "cancelled",
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: "worker_account_deleted",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  // 3. Borra documentos relacionados en otras colecciones (best-effort) — a
  // diferencia de assignments (arriba), applications y workerShiftDayLocks no se
  // muestran en ningún lado del backoffice, así que borrarlos no pierde ningún
  // registro visible para QuickCrew.
  const collectionsToClean = [
    { name: "applications", fields: ["workerUid", "workerId"] },
    { name: "workerShiftDayLocks", fields: ["workerUid"] },
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

  // 3.5. Leave a minimal tombstone before the profile is gone for good — QC needs
  // some way to know who this was if a dispute/safety issue comes up later (Apple
  // guideline 5.1.1(v) and privacy law both allow retaining the minimum necessary
  // for legitimate business purposes like this, same reasoning as the 50%-charge
  // and payroll snapshots elsewhere in this batch — it's not "keep everything",
  // it's "keep enough to know who this was and whether they had a pattern").
  // Deliberately excludes anything sensitive that's already wiped from Storage:
  // no CV, no idDocument/visaDocument, no passport/address/DOB/emergency contact.
  if (userDataBeforeDelete) {
    await db.collection("deletedUsers").doc(uid).set({
      fullName: userDataBeforeDelete.fullName || null,
      email: userDataBeforeDelete.email || null,
      phone: userDataBeforeDelete.phone || null,
      role: userDataBeforeDelete.role || null,
      approvalStatus: userDataBeforeDelete.approvalStatus || null,
      lateCancellationCount: userDataBeforeDelete.lateCancellationCount || 0,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  // 4. Borra el documento de perfil y cualquier subcolección (ej. savedJobs)
  await db.recursiveDelete(db.collection("users").doc(uid));

  // 5. Por último, borra el usuario de Firebase Auth
  await admin.auth().deleteUser(uid);

  return { ok: true };
});

/**
 * Applies the late-cancellation penalty (lateCancellationCount / suspension) when a
 * worker cancels an application within 6h of the shift start.
 *
 * This can't be done from the client: firestore.rules explicitly forbids a worker
 * from touching lateCancellationCount/approvalStatus on their own users/{uid} doc
 * (a client can't be trusted to self-report its own penalty count — see the
 * "unchanged([...])" list on that rule). Admin SDK code bypasses rules entirely,
 * so this has to run server-side.
 *
 * CALLABLE, not a Firestore trigger — this used to be an onDocumentUpdated trigger
 * reacting to jobs.service.js's cancelJobApplicationWithPenalty writing
 * status:"cancelled" on the application doc. Found during manual QA (2026-09-12)
 * that the Eventarc-based trigger was unreliable in this project/region — events
 * were silently missed (no error, just never invoked), so the penalty/suspension
 * never landed. Switched to a callable the client invokes directly right after its
 * own cancel-application batch commits — no event bus in between, nothing to drop.
 *
 * Independently recomputes lateness from the job's shiftStartAt rather than
 * trusting a client-supplied flag (closes a trust gap the old trigger accepted).
 * Idempotent via applications/{appId}.latePenaltyApplied, in case the client
 * retries this call after a network hiccup.
 */
exports.applyLateCancellationPenalty = onCall(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }

  const jobId = request.data?.jobId;
  if (!jobId) {
    throw new HttpsError("invalid-argument", "Missing jobId.");
  }

  const db = admin.firestore();
  const appRef = db.collection("applications").doc(`${jobId}_${uid}`);
  const jobRef = db.collection("jobs").doc(jobId);

  const [appSnap, jobSnap] = await Promise.all([appRef.get(), jobRef.get()]);
  if (!appSnap.exists) throw new HttpsError("not-found", "Application not found.");
  if (!jobSnap.exists) throw new HttpsError("not-found", "Job not found.");

  const app = appSnap.data();
  const appWorkerUid = app?.workerUid || app?.workerId;
  if (appWorkerUid !== uid) {
    throw new HttpsError("permission-denied", "Not your application.");
  }
  if (app?.status !== "cancelled") {
    throw new HttpsError("failed-precondition", "Application is not cancelled.");
  }

  const job = jobSnap.data();
  const shiftStartAt = typeof job?.shiftStartAt?.toDate === "function"
    ? job.shiftStartAt.toDate()
    : null;
  const isLateCancellation = !!shiftStartAt &&
    (shiftStartAt.getTime() - Date.now()) < 6 * 60 * 60 * 1000;

  if (!isLateCancellation) {
    return { ok: true, isLateCancellation: false, willBeSuspended: false };
  }

  const userRef = db.collection("users").doc(uid);

  const result = await db.runTransaction(async (tx) => {
    const [userSnap, freshAppSnap] = await Promise.all([tx.get(userRef), tx.get(appRef)]);

    if (freshAppSnap.data()?.latePenaltyApplied === true) {
      return { alreadyApplied: true, suspended: freshAppSnap.data()?.approvalStatusSetTo === "suspended" };
    }
    if (!userSnap.exists) {
      logger.warn(`[latePenalty] ${jobId}_${uid}: user not found`);
      return { alreadyApplied: false, suspended: false };
    }

    const currentCount = typeof userSnap.data()?.lateCancellationCount === "number"
      ? userSnap.data().lateCancellationCount
      : 0;
    const newCount = currentCount + 1;

    const userUpdate = {
      lateCancellationCount: newCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    const suspended = newCount >= 2;
    if (suspended) {
      userUpdate.approvalStatus = "suspended";
    }

    logger.info(
      `[latePenalty] ${jobId}_${uid}: worker ${uid} ${currentCount} -> ${newCount}` +
      (suspended ? " (SUSPENDED)" : "")
    );

    tx.update(userRef, userUpdate);
    tx.update(appRef, {
      latePenaltyApplied: true,
      approvalStatusSetTo: suspended ? "suspended" : null,
    });

    return { alreadyApplied: false, suspended };
  });

  return { ok: true, isLateCancellation: true, willBeSuspended: result.suspended };
});
