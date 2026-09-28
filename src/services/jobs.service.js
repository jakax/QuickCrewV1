import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "./firebase/config";
import { getShiftStartMs } from "../utils/jobFormatters";
import {
  addDoc,
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  collection,
  getDocs,
  limit,
  query,
  where,
  orderBy,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";

/**
 * Parses a time string into { hours, minutes } in 24h.
 * Accepts:
 *  - "9:00 am", "9 am", "09:00", "17:30", "5:15 pm"
 */
function parseTimeTo24h(timeRaw) {
  if (!timeRaw || typeof timeRaw !== "string") return null;

  const t = timeRaw.trim().toLowerCase().replace(/\s+/g, " ");
  // Patterns:
  // 1) HH:MM (24h)
  // 2) H(:MM)? am|pm
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const min = Number(m24[2]);
    if (h < 0 || h > 23 || min < 0 || min > 59) return null;
    return { hours: h, minutes: min };
  }

  const mampm = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (mampm) {
    let h = Number(mampm[1]);
    const min = mampm[2] ? Number(mampm[2]) : 0;
    const ap = mampm[3];

    if (h < 1 || h > 12 || min < 0 || min > 59) return null;

    // Convert to 24h
    if (ap === "am") {
      if (h === 12) h = 0;
    } else {
      if (h !== 12) h += 12;
    }
    return { hours: h, minutes: min };
  }

  return null;
}

/**
 * Build Date objects for shiftStartAt/shiftEndAt from:
 *  - shiftDate "YYYY-MM-DD"
 *  - shiftStartTime string
 *  - shiftEndTime string
 * If end is earlier than start, it assumes the shift ends the next day.
 */
function buildShiftDateTimes({ shiftDate, shiftStartTime, shiftEndTime }) {
  if (!shiftDate) throw new Error("Shift date is required");

  const isoOk = /^\d{4}-\d{2}-\d{2}$/.test(String(shiftDate).trim());
  if (!isoOk) throw new Error("Shift date must be YYYY-MM-DD (for now).");

  const [yStr, mStr, dStr] = shiftDate.split("-");
  const year = Number(yStr);
  const month = Number(mStr);
  const day = Number(dStr);

  const start = parseTimeTo24h(shiftStartTime);
  if (!start) throw new Error("Shift start time is invalid (e.g. 9:00 am).");

  const end = parseTimeTo24h(shiftEndTime);
  if (!end) throw new Error("Shift end time is invalid (e.g. 5:00 pm).");

  // Local timezone Date (good enough for MVP; later we can add org/job timezone)
  const startAt = new Date(year, month - 1, day, start.hours, start.minutes, 0, 0);
  let endAt = new Date(year, month - 1, day, end.hours, end.minutes, 0, 0);

  // If end time is <= start time, assume overnight shift
  if (endAt.getTime() <= startAt.getTime()) {
    endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
  }

  return { shiftStartAt: startAt, shiftEndAt: endAt };
}

/**
 * Legacy parser for old `shiftTime` format: "X to Y"
 */
function parseLegacyShiftTime(shiftTimeRaw) {
  if (!shiftTimeRaw || typeof shiftTimeRaw !== "string") return null;
  const normalized = shiftTimeRaw.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/ to /i);
  if (parts.length !== 2) return null;
  return { shiftStartTime: parts[0].trim(), shiftEndTime: parts[1].trim() };
}

function normalizeSkillKey(key) {
  return String(key || "").trim().toLowerCase();
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

export async function createJob({ orgId, orgName, uid, job }) {
  if (!orgId) throw new Error("Missing orgId");
  if (!orgName) throw new Error("Missing orgName");
  if (!uid) throw new Error("Missing user id");
  if (!job?.title?.trim()) throw new Error("Job title is required");
  if (!job?.shiftDate) throw new Error("Shift date is required");

  const showRate = job?.showRate !== false; // default true

  const primaryRoleKey = normalizeSkillKey(job?.primaryRoleKey);
  if (!primaryRoleKey) throw new Error("Primary role is required");

  const requiredSkillsRaw = Array.isArray(job?.requiredSkills) ? job.requiredSkills : [];
  const requiredSkills = uniq([primaryRoleKey, ...requiredSkillsRaw.map(normalizeSkillKey)]);

  // We prefer the new split time inputs.
  // Backward compatible: if not present, try to infer from legacy `shiftTime`.
  let shiftStartTime = job?.shiftStartTime?.trim() || "";
  let shiftEndTime = job?.shiftEndTime?.trim() || "";

  if (!shiftStartTime || !shiftEndTime) {
    const legacy = parseLegacyShiftTime(job?.shiftTime);
    if (legacy?.shiftStartTime && legacy?.shiftEndTime) {
      shiftStartTime = legacy.shiftStartTime;
      shiftEndTime = legacy.shiftEndTime;
    }
  }

  if (!shiftStartTime) throw new Error("Shift start time is required");
  if (!shiftEndTime) throw new Error("Shift end time is required");

  // Keep legacy shiftTime string for display/backward compatibility
  const shiftTime = `${shiftStartTime} to ${shiftEndTime}`;

  const rateNum =
    job.ratePerHour === "" || job.ratePerHour == null ? null : Number(job.ratePerHour);

  if (rateNum != null && Number.isNaN(rateNum)) {
    throw new Error("Rate per hour must be a number");
  }

  const { shiftStartAt, shiftEndAt } = buildShiftDateTimes({
    shiftDate: job.shiftDate,
    shiftStartTime,
    shiftEndTime,
  });

  const payload = {
    orgId,
    orgName,
    createdBy: uid,
    title: job.title.trim(),
    location: (job.location || "").trim(),
    description: (job.description || "").trim(),

    shiftDate: job.shiftDate, // "YYYY-MM-DD"
    shiftStartTime, // NEW (string for UI/debugging)
    shiftEndTime, // NEW (string for UI/debugging)
    shiftTime, // legacy display string

    // NEW source of truth timestamps (Date -> Firestore Timestamp)
    shiftStartAt,
    shiftEndAt,

    // Skills / matching
    primaryRoleKey,
    requiredSkills,

    // Rate
    ratePerHour: rateNum,
    showRate,

    // Keep your current status string to avoid breaking other screens.
    // (We can standardize later.)
    status: "open",

    // Approval required by default; employer can disable it in the UI
    businessApprovalRequired: job?.businessApprovalRequired !== false,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "jobs"), payload);
  return { jobId: ref.id };
}

export async function listJobsByOrg({ orgId }) {
  if (!orgId) throw new Error("Missing orgId");

  const q = query(
    collection(db, "jobs"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listPublicJobs({ limitCount = 50 } = {}) {
  const q = query(collection(db, "jobs"), orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getJobById(jobId) {
  if (!jobId) throw new Error("Missing jobId");
  const ref = doc(db, "jobs", jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Job not found");

  const jobData = { id: snap.id, ...snap.data() };

  // Fetch org description if orgId exists
  if (jobData.orgId) {
    try {
      const orgRef = doc(db, "organizations", jobData.orgId);
      const orgSnap = await getDoc(orgRef);
      if (orgSnap.exists()) {
        jobData.orgDescription = orgSnap.data()?.description || null;
      }
    } catch {
      // non-blocking, worst case orgDescription is undefined
    }
  }

  return jobData;
}

export async function updateJob(jobId, updates) {
  if (!updates || typeof updates !== "object" || Array.isArray(updates)) {
    throw new Error("Invalid update payload for job.");
  }

  if (!jobId) throw new Error("Missing jobId");

  // If editing a job and it includes the new split time fields, re-derive timestamps.
  // Backward compatible: if only `shiftTime` is provided, attempt to parse it.
  const next = { ...(updates || {}) };

  // Normalize skills fields if provided
  if (typeof next.primaryRoleKey === "string") {
    next.primaryRoleKey = normalizeSkillKey(next.primaryRoleKey);
  }

  if (Array.isArray(next.requiredSkills)) {
    const primary = typeof next.primaryRoleKey === "string" ? next.primaryRoleKey : "";
    const norm = next.requiredSkills.map(normalizeSkillKey);
    next.requiredSkills = uniq(primary ? [primary, ...norm] : norm);
  }

  if (typeof next.showRate === "undefined") {
    // If not provided, don't touch it on update
    // (so existing jobs keep their value)
  } else {
    next.showRate = next.showRate !== false;
  }

  const hasSplitTimes =
    typeof next.shiftDate === "string" &&
    typeof next.shiftStartTime === "string" &&
    typeof next.shiftEndTime === "string";

  if (hasSplitTimes) {
    const { shiftStartAt, shiftEndAt } = buildShiftDateTimes({
      shiftDate: next.shiftDate,
      shiftStartTime: next.shiftStartTime,
      shiftEndTime: next.shiftEndTime,
    });

    next.shiftStartAt = shiftStartAt;
    next.shiftEndAt = shiftEndAt;

    // Keep legacy shiftTime consistent
    next.shiftTime = `${next.shiftStartTime.trim()} to ${next.shiftEndTime.trim()}`;
  } else if (typeof next.shiftDate === "string" && typeof next.shiftTime === "string") {
    const legacy = parseLegacyShiftTime(next.shiftTime);
    if (legacy?.shiftStartTime && legacy?.shiftEndTime) {
      const { shiftStartAt, shiftEndAt } = buildShiftDateTimes({
        shiftDate: next.shiftDate,
        shiftStartTime: legacy.shiftStartTime,
        shiftEndTime: legacy.shiftEndTime,
      });

      next.shiftStartTime = legacy.shiftStartTime;
      next.shiftEndTime = legacy.shiftEndTime;
      next.shiftStartAt = shiftStartAt;
      next.shiftEndAt = shiftEndAt;
      next.shiftTime = `${legacy.shiftStartTime} to ${legacy.shiftEndTime}`;
    }
  }

  const ref = doc(db, "jobs", jobId);
  await updateDoc(ref, {
    ...next,
    updatedAt: serverTimestamp(),
  });

  // Si cambiaron los timestamps del shift, propagar a las applications activas
  if (next.shiftStartAt || next.shiftEndAt) {
    // orgId must be part of the query filters (not just the security rule) so
    // Firestore can prove the query is safe without evaluating per-document — see
    // firestore.rules. `updates` doesn't carry orgId (it's never editable), so fetch it.
    const orgId = next.orgId || (await getDoc(ref)).data()?.orgId;

    const appsSnap = await getDocs(
      query(
        collection(db, "applications"),
        where("jobId", "==", jobId),
        where("orgId", "==", orgId),
        where("status", "in", ["pending", "accepted"])
      )
    );

    const updatePromises = appsSnap.docs.map((appDoc) =>
      updateDoc(appDoc.ref, {
        ...(next.shiftStartAt && { shiftStartAt: next.shiftStartAt }),
        ...(next.shiftEndAt && { shiftEndAt: next.shiftEndAt }),
        updatedAt: serverTimestamp(),
      })
    );

    await Promise.all(updatePromises);
  }
}

export async function deleteJobIfAllowed({ jobId, expectedOrgId }) {
  if (!jobId) throw new Error("Missing jobId");

  const jobRef = doc(db, "jobs", jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) throw new Error("Job not found.");

  const job = jobSnap.data();

  if (expectedOrgId && job?.orgId !== expectedOrgId) {
    throw new Error("You don’t have permission to delete this job.");
  }

  // Safe MVP rule:
  // if any application exists for this job, do not allow delete. orgId must be part of
  // the query filters (not just the security rule) so Firestore can prove the query is
  // safe without evaluating per-document — see firestore.rules.
  const appsQ = query(
    collection(db, "applications"),
    where("jobId", "==", jobId),
    where("orgId", "==", job.orgId),
    limit(1)
  );

  const appsSnap = await getDocs(appsQ);

  if (!appsSnap.empty) {
    throw new Error(
      "This shift cannot be deleted because it already has worker applications or assignments."
    );
  }

  await deleteDoc(jobRef);

  return { ok: true };
}

/**
 * Worker cancels their application for a job.
 * Rules enforced here (service-level):
 * - application must exist
 * - only the same worker can cancel their own application
 * - only allowed if shift starts in >= minHoursBeforeStart hours
 * - allowed if application is pending OR accepted (auto-assign)
 *
 * Note:
 * - If accepted (auto-assign), we reopen the job.
 * - We also release the worker day-lock (if you implemented it).
 */
export async function cancelJobApplication({
  jobId,
  workerUid,
  minHoursBeforeStart = 4,
}) {
  if (!jobId) throw new Error("Missing jobId");
  if (!workerUid) throw new Error("Missing workerUid");

  const applicationId = `${jobId}_${workerUid}`;

  const jobRef = doc(db, "jobs", jobId);
  const appRef = doc(db, "applications", applicationId);

  // Read both docs
  const [jobSnap, appSnap] = await Promise.all([getDoc(jobRef), getDoc(appRef)]);

  if (!jobSnap.exists()) throw new Error("Job not found");
  if (!appSnap.exists()) throw new Error("Application not found");

  const job = jobSnap.data();
  const app = appSnap.data();

  // Basic ownership safety
  const appWorker = app?.workerUid || app?.workerId;
  if (appWorker && appWorker !== workerUid) {
    throw new Error("You can only cancel your own application.");
  }

  const status = String(app?.status || "").toLowerCase();
  const wasAccepted = status === "accepted";

  if (status !== "pending" && status !== "accepted") {
    throw new Error("Only pending or accepted applications can be cancelled.");
  }

  // Prefer shiftStartAt as source of truth
  const shiftStartAt = job?.shiftStartAt;
  const startMs =
    shiftStartAt && typeof shiftStartAt.toDate === "function"
      ? shiftStartAt.toDate().getTime()
      : shiftStartAt instanceof Date
        ? shiftStartAt.getTime()
        : Number.POSITIVE_INFINITY;

  if (!Number.isFinite(startMs)) {
    throw new Error("Shift start time is missing. Cannot cancel safely.");
  }

  const diffMs = startMs - Date.now();
  const minMs = minHoursBeforeStart * 60 * 60 * 1000;

  if (diffMs < minMs) {
    throw new Error(`You can only cancel ${minHoursBeforeStart}+ hours before the shift starts.`);
  }

  const batch = writeBatch(db);

  // Update application (keep history)
  batch.update(appRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // If this was an auto-assigned shift, reopen the job
  if (wasAccepted) {
    batch.update(jobRef, {
      status: "open",
      assignedWorkerUid: null,
      assignedAt: null,
      updatedAt: serverTimestamp(),
    });

    // OPTIONAL (recommended) — delete deterministic assignment doc if you used this id:
    // assignments/{jobId}_{workerUid}
    const assignmentRef = doc(db, "assignments", `${jobId}_${workerUid}`);
    batch.delete(assignmentRef);
  }

  // Release the worker "one shift per day" lock (for BOTH pending + accepted)
  const shiftDate = String(job?.shiftDate || "").trim();
  if (shiftDate) {
    const lockId = `${workerUid}_${shiftDate}`;
    const lockRef = doc(db, "workerShiftDayLocks", lockId);
    batch.delete(lockRef);
  }

  await batch.commit();
  return { ok: true };
}

export async function cancelJobApplicationWithPenalty({
  jobId,
  workerUid,
  isLateCancellation = false,
}) {
  if (!jobId) throw new Error("Missing jobId");
  if (!workerUid) throw new Error("Missing workerUid");

  const applicationId = `${jobId}_${workerUid}`;

  const jobRef = doc(db, "jobs", jobId);
  const appRef = doc(db, "applications", applicationId);
  const userRef = doc(db, "users", workerUid);

  const [jobSnap, appSnap, userSnap] = await Promise.all([
    getDoc(jobRef),
    getDoc(appRef),
    getDoc(userRef),
  ]);

  if (!jobSnap.exists()) throw new Error("Job not found");
  if (!appSnap.exists()) throw new Error("Application not found");
  if (!userSnap.exists()) throw new Error("User profile not found");

  const job = jobSnap.data();
  const app = appSnap.data();

  const appWorker = app?.workerUid || app?.workerId;
  if (appWorker && appWorker !== workerUid) {
    throw new Error("You can only cancel your own application.");
  }

  const status = String(app?.status || "").toLowerCase();
  const wasAccepted = status === "accepted";

  if (status !== "pending" && status !== "accepted") {
    throw new Error("Only pending or accepted applications can be cancelled.");
  }

  const batch = writeBatch(db);

  // Update application
  batch.update(appRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    isLateCancellation: isLateCancellation,
    updatedAt: serverTimestamp(),
  });

  // If auto-assigned, reopen the job
  if (wasAccepted) {
    batch.update(jobRef, {
      status: "open",
      assignedWorkerUid: null,
      assignedAt: null,
      updatedAt: serverTimestamp(),
    });

    // Close the assignment instead of deleting it — same reasoning as the
    // employer-cancel path (jobs.service.js's cancelJob) and firestore.rules only
    // ever allowed delete to admins anyway, so this delete always failed and took
    // the whole batch down with it (that's this bug). Keeping a closed record also
    // means a worker-cancelled shift doesn't vanish from anywhere QC might look.
    const assignmentRef = doc(db, "assignments", `${jobId}_${workerUid}`);
    batch.set(
      assignmentRef,
      {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelReason: "worker_cancelled",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  // Release day lock
  const shiftDate = String(job?.shiftDate || "").trim();
  if (shiftDate) {
    const lockId = `${workerUid}_${shiftDate}`;
    const lockRef = doc(db, "workerShiftDayLocks", lockId);
    batch.delete(lockRef);
  }

  await batch.commit();

  // Late cancellation penalty (lateCancellationCount / approvalStatus) is NOT
  // written here — firestore.rules forbids a worker from touching those fields on
  // their own users/{uid} doc (by design: a client can't be trusted to self-report
  // its own penalty count). Applied server-side via a callable Cloud Function,
  // invoked directly right after the cancel above commits.
  //
  // This used to be an onDocumentUpdated Firestore trigger reacting to this same
  // write, but manual QA (2026-09-12) found that trigger unreliable — Eventarc
  // silently missed events in this project, so the penalty/suspension never
  // landed. A callable removes the event bus entirely: nothing to drop. The
  // function re-verifies lateness itself from the job's shiftStartAt, so
  // isLateCancellation above only drives which confirmation dialog the worker
  // saw — it's not trusted for the actual penalty decision.
  let willBeSuspended = false;
  if (isLateCancellation) {
    try {
      const applyPenalty = httpsCallable(getFunctions(), "applyLateCancellationPenalty");
      const { data } = await applyPenalty({ jobId });
      willBeSuspended = !!data?.willBeSuspended;
    } catch (e) {
      // The cancellation itself already succeeded above — don't fail the whole
      // action just because the penalty call had an issue (e.g. network drop).
      // Worst case: this one late cancellation isn't counted; not silently
      // failing the user's cancel request is more important.
      console.warn("applyLateCancellationPenalty call failed:", e?.message || e);
    }
  }

  return { ok: true, willBeSuspended };
}

export async function cancelJob({ jobId, expectedOrgId, acknowledgeLateCancellation = false }) {
  if (!jobId) throw new Error("Missing jobId");

  const jobRef = doc(db, "jobs", jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) throw new Error("Job not found.");

  const job = jobSnap.data();

  if (expectedOrgId && job?.orgId !== expectedOrgId) {
    throw new Error("You don't have permission to cancel this job.");
  }

  // The only job.status values this app ever writes: "open" (created, or reopened
  // after a worker cancels their application), "assigned" (worker self-assigned,
  // no-approval-required path), "filled" (employer approved an applicant),
  // "finished" (hours submitted), "cancelled"/legacy "cancel" (this function).
  const status = String(job?.status || "").toLowerCase();
  if (status === "cancelled" || status === "cancel") {
    throw new Error("This shift is already cancelled.");
  }
  if (status === "finished") {
    throw new Error("This shift has already finished and can no longer be cancelled.");
  }

  // The 4h cutoff only applies once a worker is actually attached to the shift
  // ("assigned" or "filled"). A shift still "open" — no worker assigned yet,
  // whether or not it has pending applications awaiting approval — can be
  // cancelled at any time, no acknowledgement needed. Once a worker IS attached,
  // cancelling under 4h is still allowed but must be explicitly acknowledged
  // (EmployerEditJob shows a warning first) — QuickCrew charges the business 50%
  // of the shift for this per policy, so it's tagged on the assignment below
  // (lateCancellationByEmployer) for QC to find manually; there's no automated
  // billing to trigger.
  let isLateCancellationWithWorker = false;
  if (status !== "open") {
    const startMs = getShiftStartMs(job);
    if (!Number.isFinite(startMs)) {
      throw new Error("This shift is missing its start time. Cannot cancel safely.");
    }
    if (startMs - Date.now() < 4 * 60 * 60 * 1000) {
      if (!acknowledgeLateCancellation) {
        throw new Error("This shift starts in less than 4 hours and can no longer be cancelled.");
      }
      isLateCancellationWithWorker = true;
    }
  }

  // Cancel any pending/accepted applications along with the job. orgId must be part of
  // the query filters (not just the security rule) so Firestore can prove the query is
  // safe without evaluating per-document — see firestore.rules.
  const appsSnap = await getDocs(
    query(
      collection(db, "applications"),
      where("jobId", "==", jobId),
      where("orgId", "==", job.orgId),
      where("status", "in", ["pending", "accepted"])
    )
  );

  const batch = writeBatch(db);

  batch.update(jobRef, {
    status: "cancelled",
    cancelledAt: serverTimestamp(),
    cancelReason: "employer_cancelled",
    updatedAt: serverTimestamp(),
  });

  // If a worker was attached (assigned/filled), close out their assignment too —
  // otherwise it's left pointing at a now-cancelled job with status
  // "assigned"/"confirmed", which would keep showing up in the backoffice's
  // "Unclosed" tab indistinguishable from a genuine no-show/forgotten-clockout.
  const attachedWorkerUid = job?.assignedWorkerUid || job?.filledByUid;
  if (attachedWorkerUid) {
    const assignmentRef = doc(db, "assignments", `${jobId}_${attachedWorkerUid}`);
    batch.set(
      assignmentRef,
      {
        status: "cancelled",
        cancelledAt: serverTimestamp(),
        cancelReason: "employer_cancelled",
        ...(isLateCancellationWithWorker ? { lateCancellationByEmployer: true } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  appsSnap.docs.forEach((appDoc) => {
    const app = appDoc.data();
    batch.update(appDoc.ref, {
      status: "job_cancelled",
      cancelledAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Release each applicant's day lock too — otherwise they're stuck unable to
    // apply to anything else that day even though this application is no longer
    // active (mirrors the release done by the worker's own cancelJobApplication[WithPenalty]
    // and by EmployerJobApplicants.onReject's single-reject path).
    const appWorkerUid = app?.workerUid || app?.workerId;
    const appShiftDate = String(app?.shiftDate || "").trim();
    if (appWorkerUid && appShiftDate) {
      const lockRef = doc(db, "workerShiftDayLocks", `${appWorkerUid}_${appShiftDate}`);
      batch.delete(lockRef);
    }
  });

  await batch.commit();

  return { ok: true, isLateCancellationWithWorker };
}

/**
 * KNOWN RISK (accepted per request, documented rather than solved — see
 * WorkerJobDetails.jsx's canClockIn): a worker who misses the original clock-in
 * window (1h before shift start through 4h after) can still clock in/out any time
 * afterward, even once the shift is "finished". This has NO audit trail — the
 * written timestamp is always serverTimestamp() (when the button was pressed, not
 * when the worker actually arrived), and nothing here distinguishes a normal
 * on-time clock-in from a backfilled one, or flags/limits how far after the fact
 * it happens. It's also not reconciled against an employer-reported no-show
 * (workerNoShow:true + hoursSubmitted:true on this same assignment) — a worker
 * could still clock in after the employer already closed the shift out as a
 * no-show, leaving a contradictory record with no resolution mechanism. Properly
 * closing this would mean tracking a change history (who/when) for both worker and
 * employer clock edits — out of scope as a new feature; not built here.
 */
export async function workerClockIn({ jobId, workerUid }) {
  if (!jobId) throw new Error("Missing jobId");
  if (!workerUid) throw new Error("Missing workerUid");

  const assignmentId = `${jobId}_${workerUid}`;
  const assignmentRef = doc(db, "assignments", assignmentId);
  const snap = await getDoc(assignmentRef);

  if (!snap.exists()) throw new Error("Assignment not found.");

  const data = snap.data();
  if (data?.workerClockIn) throw new Error("You have already clocked in.");

  await updateDoc(assignmentRef, {
    workerClockIn: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const applicationRef = doc(db, "applications", assignmentId);
  await updateDoc(applicationRef, {
    workerClockIn: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { ok: true };
}

export async function workerClockOut({ jobId, workerUid }) {
  if (!jobId) throw new Error("Missing jobId");
  if (!workerUid) throw new Error("Missing workerUid");

  const assignmentId = `${jobId}_${workerUid}`;
  const assignmentRef = doc(db, "assignments", assignmentId);
  const snap = await getDoc(assignmentRef);

  if (!snap.exists()) throw new Error("Assignment not found.");

  const data = snap.data();
  if (!data?.workerClockIn) throw new Error("You need to clock in first.");
  if (data?.workerClockOut) throw new Error("You have already clocked out.");

  await updateDoc(assignmentRef, {
    workerClockOut: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const applicationRef = doc(db, "applications", assignmentId);
  await updateDoc(applicationRef, {
    workerClockOut: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { ok: true };
}