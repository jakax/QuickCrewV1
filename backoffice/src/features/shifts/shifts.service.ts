import { db } from "../../firebase/client";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp,
  getDoc,
  Timestamp,
} from "firebase/firestore";

export type ShiftReviewStatus = "pending" | "reviewed" | "paid" | "rejected";

export interface ShiftRow {
  id: string;
  jobId: string;
  workerUid: string | null;
  employerUid: string | null;
  orgId: string | null;
  orgName: string | null;
  jobTitle: string | null;
  shiftDate: string | null;
  shiftTime: string | null;
  workerClockIn: any;
  workerClockOut: any;
  employerClockIn: any;
  employerClockOut: any;
  hoursSubmitted: boolean;
  reviewStatus: ShiftReviewStatus | null;
  reviewedAt: any;
  reviewedBy: string | null;
  workerFullName: string | null;
  workerEmail: string | null;
  workerNoShow: boolean;
  employerComment: string | null;
  quickCrewComment: string | null;
  // Open jobs only (no assignment yet)
  employerFullName?: string | null;
  employerEmail?: string | null;
  description?: string | null;
  primaryRoleKey?: string | null;
  requiredSkills?: string[] | null;
}

function asDateMaybe(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
  if (v instanceof Date) return v;
  return null;
}

export function fmtTime(v: any): string {
  if (!v) return "—";
  // Already a string (employer sets string values)
  if (typeof v === "string") return v;
  // Firestore Timestamp
  const d = asDateMaybe(v);
  if (!d) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function fmtDate(v: any): string {
  if (!v) return "—";
  if (typeof v === "string") return v;
  const d = asDateMaybe(v);
  if (!d) return "—";
  return d.toLocaleDateString();
}

export async function listShiftsByReviewStatus(
  status: ShiftReviewStatus
): Promise<ShiftRow[]> {
  // hoursSubmitted = true means employer submitted hours
  // reviewStatus = "pending" | "reviewed" | null (null = not yet submitted)
  const q =
    status === "pending"
      ? query(
        collection(db, "assignments"),
        where("hoursSubmitted", "==", true),
        where("reviewStatus", "in", ["pending", null])
      )
      : query(
        collection(db, "assignments"),
        where("hoursSubmitted", "==", true),
        where("reviewStatus", "==", status)
      );
  const snap = await getDocs(q);
  const rows: ShiftRow[] = [];

  for (const d of snap.docs) {
    const data = d.data();
    const workerUid = data.workerUid || null;

    let workerFullName: string | null = null;
    let workerEmail: string | null = null;

    if (workerUid) {
      try {
        const userSnap = await getDoc(doc(db, "users", workerUid));
        if (userSnap.exists()) {
          const u = userSnap.data();
          workerFullName =
            u?.fullName ||
            `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
            null;
          workerEmail = u?.email || null;
        }
      } catch {
        // ignore
      }
    }

    // Load job title and shift info
    let jobTitle: string | null = null;
    let shiftDate: string | null = null;
    let shiftTime: string | null = null;

    if (data.jobId) {
      try {
        const jobSnap = await getDoc(doc(db, "jobs", data.jobId));
        if (jobSnap.exists()) {
          const j = jobSnap.data();
          jobTitle = j?.title || null;
          shiftDate = j?.shiftDate || null;
          shiftTime = j?.shiftTime || null;
        }
      } catch {
        // ignore
      }
    }

    rows.push({
      id: d.id,
      jobId: data.jobId || null,
      workerUid,
      employerUid: data.employerUid || null,
      orgId: data.orgId || null,
      orgName: data.orgName || null,
      jobTitle,
      shiftDate,
      shiftTime,
      workerClockIn: data.workerClockIn || null,
      workerClockOut: data.workerClockOut || null,
      employerClockIn: data.employerClockIn || null,
      employerClockOut: data.employerClockOut || null,
      hoursSubmitted: data.hoursSubmitted === true,
      reviewStatus: data.reviewStatus || null,
      reviewedAt: data.reviewedAt || null,
      reviewedBy: data.reviewedBy || null,
      workerFullName,
      workerEmail,
      workerNoShow: data.workerNoShow === true,
      employerComment: data.employerComment || null,
      quickCrewComment: data.quickCrewComment || null,
    });
  }

  return rows;
}

export async function setShiftReviewStatus({
  assignmentId,
  adminUid,
  to,
  quickCrewComment,
}: {
  assignmentId: string;
  adminUid: string;
  to: ShiftReviewStatus;
  quickCrewComment?: string;
}): Promise<void> {
  const ref = doc(db, "assignments", assignmentId);
  await updateDoc(ref, {
    reviewStatus: to,
    reviewedAt: serverTimestamp(),
    reviewedBy: adminUid,
    ...(quickCrewComment ? { quickCrewComment } : {}),
  });
}

export async function listUnclosedAssignments(): Promise<ShiftRow[]> {
  const snap = await getDocs(query(
    collection(db, "assignments"),
    where("status", "in", ["assigned", "confirmed"]),
    limit(50)
  ));

  const rows: ShiftRow[] = [];

  for (const d of snap.docs.filter(d => d.data().hoursSubmitted !== true)) {
    const data = d.data();
    const workerUid = data.workerUid || null;

    let workerFullName: string | null = null;
    let workerEmail: string | null = null;

    if (workerUid) {
      try {
        const userSnap = await getDoc(doc(db, "users", workerUid));
        if (userSnap.exists()) {
          const u = userSnap.data();
          workerFullName =
            u?.fullName ||
            `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
            null;
          workerEmail = u?.email || null;
        }
      } catch {
        // ignore
      }
    }

    let jobTitle: string | null = null;
    let shiftDate: string | null = null;
    let shiftTime: string | null = null;

    if (data.jobId) {
      try {
        const jobSnap = await getDoc(doc(db, "jobs", data.jobId));
        if (jobSnap.exists()) {
          const j = jobSnap.data();
          jobTitle = j?.title || null;
          shiftDate = j?.shiftDate || null;
          shiftTime = j?.shiftTime || null;
        }
      } catch {
        // ignore
      }
    }

    rows.push({
      id: d.id,
      jobId: data.jobId || null,
      workerUid,
      employerUid: data.employerUid || null,
      orgId: data.orgId || null,
      orgName: data.orgName || null,
      jobTitle,
      shiftDate,
      shiftTime,
      workerClockIn: data.workerClockIn || null,
      workerClockOut: data.workerClockOut || null,
      employerClockIn: data.employerClockIn || null,
      employerClockOut: data.employerClockOut || null,
      hoursSubmitted: false,
      reviewStatus: data.reviewStatus || null,
      reviewedAt: data.reviewedAt || null,
      reviewedBy: data.reviewedBy || null,
      workerFullName,
      workerEmail,
      workerNoShow: data.workerNoShow === true,
      employerComment: data.employerComment || null,
      quickCrewComment: data.quickCrewComment || null,
    });
  }

  return rows;
}

// Open jobs: nobody has been assigned yet. Ordered by soonest shiftStartAt first,
// and shiftStartAt >= now doubles as the "not expired" filter.
export async function listOpenJobs(): Promise<ShiftRow[]> {
  const now = Timestamp.now();
  const q = query(
    collection(db, "jobs"),
    where("status", "==", "open"),
    where("shiftStartAt", ">=", now),
    orderBy("shiftStartAt", "asc"),
    limit(50)
  );
  const snap = await getDocs(q);
  const rows: ShiftRow[] = [];

  for (const d of snap.docs) {
    const data = d.data();
    const employerUid = data.createdBy || null;

    let employerFullName: string | null = null;
    let employerEmail: string | null = null;

    if (employerUid) {
      try {
        const userSnap = await getDoc(doc(db, "users", employerUid));
        if (userSnap.exists()) {
          const u = userSnap.data();
          employerFullName =
            u?.fullName ||
            `${u?.firstName || ""} ${u?.lastName || ""}`.trim() ||
            null;
          employerEmail = u?.email || null;
        }
      } catch {
        // ignore
      }
    }

    const shiftTime =
      [data.shiftStartTime, data.shiftEndTime].filter(Boolean).join(" - ") ||
      null;

    rows.push({
      id: d.id,
      jobId: d.id,
      workerUid: null,
      employerUid,
      orgId: null,
      orgName: data.orgName || null,
      jobTitle: data.title || null,
      shiftDate: data.shiftDate || null,
      shiftTime,
      workerClockIn: null,
      workerClockOut: null,
      employerClockIn: null,
      employerClockOut: null,
      hoursSubmitted: false,
      reviewStatus: null,
      reviewedAt: null,
      reviewedBy: null,
      workerFullName: null,
      workerEmail: null,
      workerNoShow: false,
      employerComment: null,
      quickCrewComment: null,
      employerFullName,
      employerEmail,
      description: data.description || null,
      primaryRoleKey: data.primaryRoleKey || null,
      requiredSkills: Array.isArray(data.requiredSkills) ? data.requiredSkills : null,
    });
  }

  return rows;
}