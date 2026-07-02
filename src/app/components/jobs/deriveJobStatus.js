import { asDateMaybe } from "../../../utils/dateUtils";

const MINUTES_45 = 45 * 60 * 1000;

// ── Shared helpers ────────────────────────────────────────────────────────────

function getTimeValues(job, assignment) {
  const shiftStart = asDateMaybe(job?.shiftStartAt);
  const shiftEnd = asDateMaybe(job?.shiftEndAt);

  const shiftStartMs = shiftStart ? shiftStart.getTime() : null;
  const shiftEndMs = shiftEnd ? shiftEnd.getTime() : null;

  // Firestore Timestamps have .toDate(); if field is missing → null
  const clockInTs = assignment?.workerClockIn;
  const clockOutTs = assignment?.workerClockOut;
  const clockInMs = clockInTs?.toDate ? clockInTs.toDate().getTime() : null;
  const clockOutMs = clockOutTs?.toDate ? clockOutTs.toDate().getTime() : null;

  return { shiftStartMs, shiftEndMs, clockInMs, clockOutMs };
}

// ── Employer ──────────────────────────────────────────────────────────────────

/**
 * Derives the display label for a job from the employer's perspective.
 *
 * open            → Expired at (shiftStartAt - 45 min), otherwise Open
 * pending_approval→ Expired at shiftStartAt, otherwise Pending Approval
 * filled/assigned → Finished at shiftEndAt or clockOut
 *                   Ongoing  at shiftStartAt or clockIn
 *                   Filled   before any of the above
 * cancelled/finished/rejected → straight from backend
 *
 * @param {object}      job        - Firestore job document data
 * @param {object|null} assignment - Firestore assignment document (may be null)
 * @param {number}      now        - Date.now()
 * @returns {string}
 */
export function deriveEmployerStatus(job, assignment, now) {
  const status = String(job?.status || "").toLowerCase();

  // Backend-authoritative — return immediately
  if (status === "cancelled" || status === "cancel") return "Cancelled";
  if (status === "finished") return "Finished";
  if (status === "rejected") return "Rejected";

  const { shiftStartMs, shiftEndMs, clockInMs, clockOutMs } =
    getTimeValues(job, assignment);

  if (status === "open") {
    if (shiftStartMs && now >= shiftStartMs - MINUTES_45) return "Expired";
    return "Open";
  }

  if (status === "pending_approval") {
    if (shiftStartMs && now >= shiftStartMs) return "Expired";
    return "Pending Approval";
  }

  if (status === "filled" || status === "assigned") {
    const finishedByClockOut = clockOutMs !== null && now >= clockOutMs;
    const finishedByTime = shiftEndMs !== null && now >= shiftEndMs;
    if (finishedByClockOut || finishedByTime) return "Finished";

    const ongoingByClockIn = clockInMs !== null && now >= clockInMs;
    const ongoingByTime = shiftStartMs !== null && now >= shiftStartMs;
    if (ongoingByClockIn || ongoingByTime) return "Ongoing";

    return "Filled";
  }

  return status;
}

// ── Worker ────────────────────────────────────────────────────────────────────

/**
 * Derives the display label for a job from the worker's perspective.
 *
 * open            → Expired at (shiftStartAt - 45 min), otherwise Open
 * pending_approval→ Expired at shiftStartAt, otherwise Pending Approval
 * filled/assigned → Completed at shiftEndAt or clockOut
 *                   Ongoing  at shiftStartAt or clockIn
 *                   Upcoming before any of the above
 * cancelled/finished/rejected → straight from backend
 *                               (finished → Completed from worker POV)
 *
 * @param {object}      job        - Firestore job document data
 * @param {object|null} assignment - Firestore assignment document (may be null)
 * @param {number}      now        - Date.now()
 * @returns {string}
 */
export function deriveWorkerStatus(job, assignment, now) {
  const status = String(job?.status || "").toLowerCase();

  // Backend-authoritative — return immediately
  if (status === "cancelled" || status === "cancel") return "Cancelled";
  if (status === "finished") return "Completed";
  if (status === "rejected") return "Rejected";

  const { shiftStartMs, shiftEndMs, clockInMs, clockOutMs } =
    getTimeValues(job, assignment);

  if (status === "open") {
    if (shiftStartMs && now >= shiftStartMs - MINUTES_45) return "Expired";
    return "Open";
  }

  if (status === "pending_approval") {
    if (shiftStartMs && now >= shiftStartMs) return "Expired";
    return "Pending Approval";
  }

  if (status === "filled" || status === "assigned") {
    const completedByClockOut = clockOutMs !== null && now >= clockOutMs;
    const completedByTime = shiftEndMs !== null && now >= shiftEndMs;
    if (completedByClockOut || completedByTime) return "Completed";

    const ongoingByClockIn = clockInMs !== null && now >= clockInMs;
    const ongoingByTime = shiftStartMs !== null && now >= shiftStartMs;
    if (ongoingByClockIn || ongoingByTime) return "Ongoing";

    return "Upcoming";
  }

  return status;
}

// ── Style map ─────────────────────────────────────────────────────────────────

/**
 * Maps a derived status label to its StyleSheet key.
 * Shared between employer and worker — same visual language, different labels.
 */
export const STATUS_STYLE_MAP = {
  // Employer
  Open: "statusOpen",
  "Pending Approval": "statusPending",
  Filled: "statusFilled",
  Ongoing: "statusOngoing",
  Finished: "statusFinished",
  // Worker
  Upcoming: "statusFilled",   // same visual as Filled
  Completed: "statusFinished", // same visual as Finished
  // Shared
  Cancelled: "statusCancelled",
  Rejected: "statusCancelled",
  Expired: "statusExpired",
};