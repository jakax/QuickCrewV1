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
  firstName?: string;
  lastName?: string;
  legalBusinessNameDraft?: string;
  phone?: string;
  email?: string;
  role?: string;
  approvalStatus?: ApprovalStatus | string;
  profileStatus?: ProfileStatus | string; // set by worker when they tap "Submit for review"
  profileSubmittedAt?: any;               // timestamp when worker submitted for review
  createdAt?: any;
  updatedAt?: any;
  skills?: string[];

  dateOfBirth?: string;
  nationality?: string;
  passportNumber?: string;
  passportExpiryDate?: string;
  passportIssuingCountry?: string;
  address?: { street?: string; suburb?: string; city?: string; postcode?: string };
  rightToWorkNz?: string;
  idDocument?: { url?: string };
  visaDocument?: { url?: string };
  cv?: { url?: string };
  references?: Array<{ name?: string; company?: string; role?: string; phone?: string; email?: string }>;
  criminalCheckConsent?: boolean;
  termsAccepted?: boolean;

  // Computed client-side by isWorkerProfileComplete() — not stored in Firestore.
  // This is the source of truth Backoffice uses for "ready to review," independent
  // of the mobile app's (now non-blocking) profileStatus flag — see CLAUDE.md.
  profileComplete?: boolean;
  missingProfileFields?: string[];

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

// Kept in sync with REQUIRES_VISA_DOC_OPTIONS in
// src/app/screens/tabs/Profile.jsx (mobile app).
const REQUIRES_VISA_DOC_OPTIONS = [
  "Working Holiday Visa",
  "Work Visa",
  "Open Work Visa",
  "Partner Visa",
  "Student Visa",
  "Other",
];

/**
 * Objectively checks whether a worker's profile has every field QuickCrew needs
 * before approving them — computed here in Backoffice rather than trusted from the
 * mobile app's profileStatus flag. The mobile app no longer blocks its "Submit for
 * review" button on completeness (Apple App Review guideline 5.1.1 — apps can't
 * require personal info that isn't needed to use the app's core features), so this
 * is now the single source of truth for the "ready to review" signal.
 */
export function isWorkerProfileComplete(u: UserRow): { complete: boolean; missing: string[] } {
  const missing: string[] = [];

  if (!u.firstName?.trim() || !u.lastName?.trim()) missing.push("Full name");
  if (!u.phone?.trim()) missing.push("Phone number");
  if (!u.dateOfBirth?.trim()) missing.push("Date of birth");
  if (!u.nationality?.trim()) missing.push("Nationality");
  if (!u.passportNumber?.trim()) missing.push("Passport number");
  if (!u.passportExpiryDate?.trim()) missing.push("Passport expiry date");
  if (!u.passportIssuingCountry?.trim()) missing.push("Passport issuing country");
  if (!u.address?.street?.trim()) missing.push("Street address");
  if (!u.address?.city?.trim()) missing.push("City");
  if (!u.rightToWorkNz?.trim()) missing.push("Right to work in NZ");
  if (!u.idDocument?.url) missing.push("ID document");
  if (REQUIRES_VISA_DOC_OPTIONS.includes(u.rightToWorkNz || "") && !u.visaDocument?.url) {
    missing.push("Visa document");
  }
  if (!u.cv?.url) missing.push("Resume / CV");
  if (!Array.isArray(u.references) || u.references.length < 2) {
    missing.push(`Work experience (${u.references?.length || 0}/2 references)`);
  }
  if (!u.criminalCheckConsent) missing.push("Criminal check consent");
  if (!u.termsAccepted) missing.push("Terms and conditions");

  return { complete: missing.length === 0, missing };
}

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
 * Lists all users that need attention in Backoffice: every worker/employer with
 * approvalStatus "pending". Readiness ("ready to review") is computed here via
 * isWorkerProfileComplete() by checking the worker's actual field values, rather
 * than trusting the mobile app to have gated its "Submit for review" button on
 * completeness — the app no longer does that (see CLAUDE.md, Apple guideline 5.1.1).
 * Complete profiles are sorted first so reviewers see the actionable ones up top;
 * incomplete ones still show, so nothing worker-side stays invisible to QuickCrew.
 */
export async function listPendingUsers(): Promise<UserRow[]> {
  const pendingEmployers = await listEmployersByStatus("pending");
  const pendingWorkers = await listWorkersByStatus("pending");

  const workersWithCompleteness = pendingWorkers.map((w) => {
    const { complete, missing } = isWorkerProfileComplete(w);
    return { ...w, profileComplete: complete, missingProfileFields: missing };
  });

  workersWithCompleteness.sort((a, b) => {
    if (a.profileComplete !== b.profileComplete) return a.profileComplete ? -1 : 1;
    // Within the same completeness bucket, most recently submitted/updated first.
    const aTime = a.profileSubmittedAt?.toMillis?.() ?? a.updatedAt?.toMillis?.() ?? 0;
    const bTime = b.profileSubmittedAt?.toMillis?.() ?? b.updatedAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return [...workersWithCompleteness, ...pendingEmployers];
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