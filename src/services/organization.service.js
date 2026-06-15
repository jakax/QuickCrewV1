import { db } from "../services/firebase/config"; // adjust if your config path differs
import {
  doc,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  orderBy,
  collection,
  writeBatch,
  updateDoc,
  serverTimestamp,
  runTransaction,
} from "firebase/firestore";
import { normalizeName } from "../utils/normalize";

export async function createOrganizationOrJoinExisting({ uid, org, memberRole }) {
  if (!uid) throw new Error("Missing uid");
  if (!org?.name?.trim()) throw new Error("Organization name is required");
  if (!memberRole) throw new Error("Member role is required");

  const orgName = org.name.trim();
  const orgKey = normalizeName(orgName); // deterministic

  const orgKeyRef = doc(db, "orgKeys", orgKey);

  return await runTransaction(db, async (tx) => {
    const keySnap = await tx.get(orgKeyRef);

    // ✅ ORG EXISTS → friendly join as pending
    if (keySnap.exists()) {
      const { orgId } = keySnap.data();
      if (!orgId) throw new Error("Organization key is invalid. Please contact support.");

      // Link user as pending approval
      const userRef = doc(db, "users", uid);
      tx.set(
        userRef,
        {
          role: "employer",
          orgId,
          orgName: orgName,
          orgIds: [orgId],
          memberRole,
          approvalStatus: "pending",
          employerOnboardingStatus: "pending_approval",
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Membership pending
      const memberRef = doc(db, "organizations", orgId, "members", uid);
      tx.set(
        memberRef,
        {
          uid,
          memberRole,
          status: "pending",
          joinedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return { created: false, orgId };
    }

    // ✅ ORG DOES NOT EXIST → create it + lock + link user (owner is usually approved)
    const orgRef = doc(collection(db, "organizations"));

    tx.set(orgRef, {
      name: orgName,
      nameLower: orgName.toLowerCase(), // important for future typeahead
      legalName: (org.legalName || "").trim(),
      industry: (org.industry || "").trim(),
      country: (org.country || "").trim(),
      city: (org.city || "").trim(),
      address: (org.address || "").trim(),
      description: (org.description || "").trim(),
      createdAt: serverTimestamp(),
      createdBy: uid,
    });

    // Unique lock
    tx.set(orgKeyRef, {
      orgId: orgRef.id,
      name: orgName,
      createdAt: serverTimestamp(),
    });

    // Link user (owner creating org: approved is reasonable)
    const userRef = doc(db, "users", uid);
    tx.set(
      userRef,
      {
        role: "employer",
        orgId: orgRef.id,
        orgName: orgName,
        orgIds: [orgRef.id],
        memberRole,
        approvalStatus: "pending",
        employerOnboardingStatus: "completed",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Membership approved
    const memberRef = doc(db, "organizations", orgRef.id, "members", uid);
    tx.set(memberRef, {
      uid,
      memberRole,
      status: "approved",
      joinedAt: serverTimestamp(),
    });

    return { created: true, orgId: orgRef.id };
  });
}

export async function findOrganizationByName(orgName) {
  const name = (orgName || "").trim();
  if (!name) throw new Error("Organization name is required");

  // NOTE: This is MVP and can match multiple orgs.
  // Later: use a normalizedName field + indexes.
  const q = query(
    collection(db, "organizations"),
    where("name", "==", name),
    limit(5)
  );

  const snap = await getDocs(q);
  const results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (results.length === 0) return null;
  if (results.length > 1) {
    // For now: pick the first OR throw so you can handle ambiguity in UI
    // I recommend throwing so you don't link to wrong org.
    throw new Error("Multiple organizations found with that name. Please contact support.");
  }

  return results[0];
}

export async function linkEmployerToExistingOrganization({
  uid,
  orgId,
  orgName,
  memberRole,
}) {
  if (!uid) throw new Error("Missing uid");
  if (!orgId) throw new Error("Missing orgId");
  if (!orgName) throw new Error("Missing orgName");
  if (!memberRole) throw new Error("Member role is required");

  const batch = writeBatch(db);

  // 1) Update user doc: link + pending approval
  const userRef = doc(db, "users", uid);
  batch.set(
    userRef,
    {
      role: "employer",
      orgId,
      orgName,
      memberRole,
      approvalStatus: "pending",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 2) Add membership record under org
  const memberRef = doc(db, "organizations", orgId, "members", uid);
  batch.set(
    memberRef,
    {
      uid,
      memberRole,
      status: "pending", // mirrors approvalStatus
      joinedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

export async function searchOrganizationsByNamePrefix(text, { limitCount = 8 } = {}) {
  const qText = (text || "").trim().toLowerCase();
  if (qText.length < 2) return [];

  const orgsRef = collection(db, "organizations");

  // Prefix search on nameLower
  const q = query(
    orgsRef,
    orderBy("nameLower"),
    where("nameLower", ">=", qText),
    where("nameLower", "<=", qText + "\uf8ff"),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getOrgById(orgId) {
  if (!orgId) throw new Error("Missing orgId");
  const snap = await getDoc(doc(db, "organizations", orgId));
  if (!snap.exists()) throw new Error("Organization not found.");
  return { id: snap.id, ...snap.data() };
}

export async function updateOrganization(orgId, fields) {
  if (!orgId) throw new Error("Missing orgId");
  if (!fields || typeof fields !== "object") throw new Error("No fields to update");

  const orgRef = doc(db, "organizations", orgId);
  await updateDoc(orgRef, {
    ...fields,
    updatedAt: serverTimestamp(),
  });
}