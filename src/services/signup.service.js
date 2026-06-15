import { createUserWithEmailAndPassword } from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
  collection,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebase/config";

/**
 * Employer signup (scalable):
 * - Creates Firebase Auth user
 * - If businessAlreadyRegistered:
 *    - requires selectedOrgId (picked from typeahead)
 *    - links user to org
 *    - sets approvalStatus = "pending"
 *    - creates membership doc with status "pending"
 * - Else:
 *    - creates user doc in onboarding state and returns needsOrgCreation
 */
export const registerEmployer = async ({
  email,
  password,
  fullName,
  legalBusinessName,
  businessAlreadyRegistered,
  selectedOrgId,
  memberRole, // Owner/Admin/Manager/Supervisor
}) => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = cred.user.uid;

  const baseUserDoc = {
    role: "employer",
    fullName: fullName?.trim() || "",
    email: email.trim(),
    isActive: true,
    createdAt: serverTimestamp(),
  };

  // Not registered -> send to create org flow
  if (!businessAlreadyRegistered) {
    await setDoc(doc(db, "users", uid), {
      ...baseUserDoc,
      orgIds: [],
      employerOnboardingStatus: "needs_org_creation",
      legalBusinessNameDraft: legalBusinessName?.trim() || "",
      approvalStatus: "pending",
      updatedAt: serverTimestamp(),
    });

    return { uid, needsOrgCreation: true };
  }

  // Registered -> must have selected org
  if (!selectedOrgId) {
    // Important: Auth user exists already. We should still write a profile for consistency.
    await setDoc(doc(db, "users", uid), {
      ...baseUserDoc,
      orgIds: [],
      employerOnboardingStatus: "org_not_selected",
      legalBusinessNameDraft: legalBusinessName?.trim() || "",
      approvalStatus: "pending",
    });

    // Throw so UI can show a real error
    throw new Error("Please select your organization from the list.");
  }

  if (!memberRole) {
    await setDoc(doc(db, "users", uid), {
      ...baseUserDoc,
      orgIds: [],
      employerOnboardingStatus: "missing_member_role",
      approvalStatus: "pending",
    });

    throw new Error("Please select your member role (Owner/Admin/Manager/Supervisor).");
  }

  // Verify org exists
  const orgRef = doc(db, "organizations", selectedOrgId);
  const orgSnap = await getDoc(orgRef);

  if (!orgSnap.exists()) {
    await setDoc(doc(db, "users", uid), {
      ...baseUserDoc,
      orgIds: [],
      employerOnboardingStatus: "org_not_found",
      legalBusinessNameDraft: legalBusinessName?.trim() || "",
      approvalStatus: "pending",
    });

    return { uid, needsOrgCreation: true, orgNotFound: true };
  }

  const org = orgSnap.data();
  const orgName = org?.name || legalBusinessName?.trim() || "";

  // Link user + membership atomically
  const batch = writeBatch(db);

  batch.set(doc(db, "users", uid), {
    ...baseUserDoc,
    orgIds: [selectedOrgId],
    orgId: selectedOrgId, // convenient single-org pointer (optional but VERY useful)
    orgName,
    memberRole,
    approvalStatus: "pending",
    employerOnboardingStatus: "pending_approval",
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, "organizations", selectedOrgId, "members", uid), {
    uid,
    memberRole,
    status: "pending",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(), // keep if you already use it elsewhere
  });

  await batch.commit();

  return {
    uid,
    needsOrgCreation: false,
    orgId: selectedOrgId,
    approvalStatus: "pending",
  };
};

/**
 * Worker signup:
 * - Creates Firebase Auth user
 * - Creates users/{uid} profile
 */
export const registerWorker = async ({ email, password, firstName, lastName, phone }) => {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const uid = cred.user.uid;
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

  await setDoc(doc(db, "users", uid), {
    role: "worker",
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    fullName,
    email: email.trim(),
    phone: phone?.trim?.() || "",
    isActive: true,
    approvalStatus: "pending", // change to "pending" if you want admin approval for workers too
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { uid };
};

/**
 * Cancels an in-progress employer registration.
 * Deletes the Firestore user doc and the Firebase Auth user.
 * Called from CreateOrganizationScreen when the user opts out.
 */
export const cancelEmployerRegistration = async (uid) => {
  if (!uid) throw new Error("Missing uid");

  const batch = writeBatch(db);
  batch.delete(doc(db, "users", uid));
  await batch.commit();

  // Auth user must be deleted last (requires recent auth, which is guaranteed
  // since they just registered seconds/minutes ago)
  const currentUser = auth.currentUser;
  if (currentUser && currentUser.uid === uid) {
    await currentUser.delete();
  }
};