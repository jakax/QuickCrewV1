import { db } from "../services/firebase/config"; // adjust if your config path differs
import {
  doc,
  collection,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

export async function createOrganizationAndLinkUser({
  uid,
  org,
  memberRole,
}) {
  if (!uid) throw new Error("Missing uid");
  if (!org?.name?.trim()) throw new Error("Organization name is required");
  if (!memberRole) throw new Error("Member role is required");

  const batch = writeBatch(db);

  // Create org doc with auto ID
  const orgRef = doc(collection(db, "organizations"));
  batch.set(orgRef, {
    name: org.name.trim(),
    legalName: (org.legalName || "").trim(),
    industry: (org.industry || "").trim(),
    country: (org.country || "").trim(),
    city: (org.city || "").trim(),
    address: (org.address || "").trim(),
    createdAt: serverTimestamp(),
    createdBy: uid,
  });

  // Update user doc with org link + role inside org
  const userRef = doc(db, "users", uid);
  batch.set(
    userRef,
    {
      orgId: orgRef.id,
      orgName: org.name.trim(),
      memberRole,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // Add membership doc (future-proof)
  const memberRef = doc(db, "organizations", orgRef.id, "members", uid);
  batch.set(memberRef, {
    uid,
    orgId: orgRef.id,
    memberRole,
    joinedAt: serverTimestamp(),
  });

  await batch.commit();

  return { orgId: orgRef.id };
}