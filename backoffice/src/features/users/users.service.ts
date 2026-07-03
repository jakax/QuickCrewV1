import {
  arrayUnion,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  or,
} from "firebase/firestore";
import { db } from "../../firebase/client";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";
export type ProfileStatus = "incomplete" | "ready_for_review";

export type UserRow = {
  id: string;
  fullName?: string;
  legalBusinessNameDraft?: string;
  phone?: string;
  email?: string;
  role?: string;
  approvalStatus?: ApprovalStatus | string;
  profileStatus?: ProfileStatus | string; // NEW — set by worker when profile is complete
  profileSubmittedAt?: any;               // NEW — timestamp when worker submitted for review
  createdAt?: any;
  updatedAt?: any;
  skills?: string[];

  statusReason?: string;
  statusUpdatedAt?: any;
  statusUpdatedBy?: string;

  statusHistory?: Array<{
    at?: any;
    by?: string;
    from?: string | null;
    to?: string;
    reason?: string | null;
  }>;
};

export async function listWorkersByStatus(status: ApprovalStatus): Promise<UserRow[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "worker"),
    where("approvalStatus", "==", status),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listEmployersByStatus(status: ApprovalStatus): Promise<UserRow[]> {
  const q = query(
    collection(db, "users"),
    where("role", "==", "employer"),
    where("approvalStatus", "==", status),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

// Backward compatible
export async function listPendingWorkers(): Promise<UserRow[]> {
  return listWorkersByStatus("pending");
}

/**
 * Lists all users that need attention in Backoffice:
 * - Workers/employers with approvalStatus "pending" (regardless of profileStatus)
 * - Workers with profileStatus "ready_for_review" (profile complete, waiting for approval)
 *
 * Workers with incomplete profiles (no profileStatus or "incomplete") are NOT shown
 * until they explicitly submit for review.
 */
export async function listPendingUsers(): Promise<UserRow[]> {
  // Fetch pending employers (no profileStatus concept for employers)
  const pendingEmployers = await listEmployersByStatus("pending");

  // Fetch workers with profileStatus = "ready_for_review"
  // These are the ones that actually need attention from Backoffice
  const readyWorkersQ = query(
    collection(db, "users"),
    where("role", "==", "worker"),
    where("approvalStatus", "==", "pending"),
    where("profileStatus", "==", "ready_for_review"),
    orderBy("profileSubmittedAt", "desc")
  );

  const readyWorkersSnap = await getDocs(readyWorkersQ);
  const readyWorkers = readyWorkersSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

  // Also keep pending workers that haven't submitted yet
  // (existing workers in DB before this feature was added)
  const pendingWorkers = await listWorkersByStatus("pending");

  // Merge: ready_for_review first (they took action), then pending without profileStatus
  const pendingWithoutSubmit = pendingWorkers.filter(
    (w) => !w.profileStatus || w.profileStatus === "incomplete"
  );

  // Deduplicate by id (a worker could appear in both queries)
  const seen = new Set<string>();
  const merged: UserRow[] = [];

  for (const u of [...readyWorkers, ...pendingWithoutSubmit, ...pendingEmployers]) {
    if (!seen.has(u.id)) {
      seen.add(u.id);
      merged.push(u);
    }
  }

  return merged;
}

type SetWorkerStatusArgs = {
  userId: string;
  adminUid: string;
  to: ApprovalStatus;
  skills?: string[];
  reason?: string | null;
  from?: string | null;
};

export async function setWorkerStatus({
  userId,
  adminUid,
  to,
  skills = [],
  reason = null,
  from = null,
}: SetWorkerStatusArgs) {
  if (!userId) throw new Error("Missing userId");
  if (!adminUid) throw new Error("Missing admin uid");
  if (!to) throw new Error("Missing next status");

  const cleanReason = typeof reason === "string" ? reason.trim() : "";

  if ((to === "rejected" || to === "suspended") && !cleanReason) {
    throw new Error("Reason is required for rejected/suspended.");
  }

  const ref = doc(db, "users", userId);

  await updateDoc(ref, {
    approvalStatus: to,
    skills: Array.isArray(skills) ? skills : [],

    statusReason: cleanReason || null,
    statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: adminUid,

    ...(to === "approved" ? { approvedAt: serverTimestamp(), approvedBy: adminUid } : {}),
    ...(to === "rejected" ? { rejectedAt: serverTimestamp(), rejectedBy: adminUid } : {}),
    ...(to === "suspended" ? { suspendedAt: serverTimestamp(), suspendedBy: adminUid } : {}),
    ...(to === "pending" ? { movedToPendingAt: serverTimestamp(), movedToPendingBy: adminUid } : {}),

    statusHistory: arrayUnion({
      at: new Date(),
      by: adminUid,
      from: from || null,
      to,
      reason: cleanReason || null,
    }),

    updatedAt: serverTimestamp(),
  });

  return { ok: true };
}

export async function approveWorker({
  userId,
  adminUid,
  skills,
}: {
  userId: string;
  adminUid: string;
  skills: string[];
}) {
  return setWorkerStatus({
    userId,
    adminUid,
    to: "approved",
    skills: skills || [],
    reason: null,
    from: null,
  });
}

export async function rejectWorker({
  userId,
  adminUid,
  skills,
  reason,
}: {
  userId: string;
  adminUid: string;
  skills: string[];
  reason?: string;
}) {
  return setWorkerStatus({
    userId,
    adminUid,
    to: "rejected",
    skills: skills || [],
    reason: reason || "",
    from: null,
  });
}