import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
  collection,
  limit,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase/config";
import { normalizeName } from "../utils/normalize";

/**
 * Create Worker account:
 * - Creates Firebase Auth user
 * - Creates Firestore profile users/{uid}
 * - Does NOT require workerStatus approved to browse (only to apply later)
 */
export const registerWorker = async ({ email, password, fullName }) => {
  const cred = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  const uid = cred.user.uid;

  await setDoc(doc(db, "users", uid), {
    role: "worker",
    fullName: fullName?.trim() || "",
    email: email.trim(),
    isActive: true,

    workerStatus: "pending", // pending until form + admin approval
    approvedCategories: [],

    createdAt: serverTimestamp(),
  });

  return { uid };
};

/**
 * Employer signup:
 * - Creates Firebase Auth user
 * - If business already registered: finds org by legalNameNormalized and links user
 * - If not registered: creates user doc and returns flag to navigate to org form screen
 */
export const registerEmployer = async ({
  email,
  password,
  fullName,
  legalBusinessName,
  businessAlreadyRegistered,
}) => {
  const cred = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  const uid = cred.user.uid;

  const baseUserDoc = {
    role: "employer",
    fullName: fullName?.trim() || "",
    email: email.trim(),
    isActive: true,
    createdAt: serverTimestamp(),
  };

  if (!businessAlreadyRegistered) {
    // No org yet — we’ll complete later in the OrgCreate flow
    await setDoc(doc(db, "users", uid), {
      ...baseUserDoc,
      orgIds: [],
      employerOnboardingStatus: "needs_org", // helpful flag
      legalBusinessNameDraft: legalBusinessName?.trim() || "",
    });

    return { uid, needsOrgCreation: true };
  }

  // businessAlreadyRegistered = true → verify org exists
  const normalized = normalizeName(legalBusinessName);

  const orgsRef = collection(db, "organizations");
  const q = query(orgsRef, where("legalNameNormalized", "==", normalized), limit(1));
  const snap = await getDocs(q);

  if (snap.empty) {
    // Org not found: we should not silently continue.
    // We created the Auth user already; we can still create a user profile
    // and route them to org creation or show an error screen.
    await setDoc(doc(db, "users", uid), {
      ...baseUserDoc,
      orgIds: [],
      employerOnboardingStatus: "org_not_found",
      legalBusinessNameDraft: legalBusinessName?.trim() || "",
    });

    return { uid, needsOrgCreation: true, orgNotFound: true };
  }

  const orgDoc = snap.docs[0];
  const orgId = orgDoc.id;

  // Link employer to org + create membership doc (batch keeps it consistent)
  const batch = writeBatch(db);

  batch.set(doc(db, "users", uid), {
    ...baseUserDoc,
    orgIds: [orgId],
    employerOnboardingStatus: "complete",
  });

  batch.set(doc(db, "organizations", orgId, "members", uid), {
    role: "manager",
    createdAt: serverTimestamp(),
  });

  await batch.commit();

  return { uid, needsOrgCreation: false, orgId };
};