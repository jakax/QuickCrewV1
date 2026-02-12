import { db } from "./firebase/config";
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

export async function createJob({ orgId, orgName, uid, job }) {
  if (!orgId) throw new Error("Missing orgId");
  if (!orgName) throw new Error("Missing orgName");
  if (!uid) throw new Error("Missing user id");
  if (!job?.title?.trim()) throw new Error("Job title is required");
  if (!job?.shiftDate) throw new Error("Shift date is required");

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

    ratePerHour: rateNum,

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
  return { id: snap.id, ...snap.data() };
}

export async function updateJob(jobId, updates) {
  if (!jobId) throw new Error("Missing jobId");

  // If editing a job and it includes the new split time fields, re-derive timestamps.
  // Backward compatible: if only `shiftTime` is provided, attempt to parse it.
  const next = { ...(updates || {}) };

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