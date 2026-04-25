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
} from "firebase/firestore";
import { db } from "../../firebase/client";

export type ApprovalStatus = "pending" | "approved" | "rejected" | "suspended";

export type UserRow = {
  id: string;
  fullName?: string;
  email?: string;
  role?: string;
  approvalStatus?: ApprovalStatus | string;
  createdAt?: any;
  updatedAt?: any;
  skills?: string[];

  // lightweight moderation metadata (optional)
  statusReason?: string;
  statusUpdatedAt?: any;
  statusUpdatedBy?: string;

  // ✅ status change audit trail (optional)
  statusHistory?: Array<{
    at?: any;                 // Date or Firestore Timestamp
    by?: string;              // admin uid
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

// Backward compatible: approvals screen currently calls this
export async function listPendingWorkers(): Promise<UserRow[]> {
  return listWorkersByStatus("pending");
}

type SetWorkerStatusArgs = {
  userId: string;
  adminUid: string;
  to: ApprovalStatus;
  skills?: string[];
  reason?: string | null;
  from?: string | null;
};

// Single “source of truth” for status changes.
// Keeps MVP simple but auditable.
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

  // Require reason only for reject/suspend
  if ((to === "rejected" || to === "suspended") && !cleanReason) {
    throw new Error("Reason is required for rejected/suspended.");
  }

  const ref = doc(db, "users", userId);

  await updateDoc(ref, {
    approvalStatus: to,
    skills: Array.isArray(skills) ? skills : [],

    // generic moderation metadata
    statusReason: cleanReason || null,
    statusUpdatedAt: serverTimestamp(),
    statusUpdatedBy: adminUid,

    // keep per-status fields (useful for debugging / analytics later)
    ...(to === "approved" ? { approvedAt: serverTimestamp(), approvedBy: adminUid } : {}),
    ...(to === "rejected" ? { rejectedAt: serverTimestamp(), rejectedBy: adminUid } : {}),
    ...(to === "suspended" ? { suspendedAt: serverTimestamp(), suspendedBy: adminUid } : {}),
    ...(to === "pending" ? { movedToPendingAt: serverTimestamp(), movedToPendingBy: adminUid } : {}),

    // lightweight history
    statusHistory: arrayUnion({
      // NOTE: Date() uses client time — acceptable for MVP audit trail
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

// Existing API used by UsersApprovalsScreen
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

export async function listPendingUsers(): Promise<UserRow[]> {
  const [workers, employers] = await Promise.all([
    listWorkersByStatus("pending"),
    listEmployersByStatus("pending"),
  ]);
  return [...workers, ...employers];
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