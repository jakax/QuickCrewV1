import { db } from "../firebase/client";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type OrgRoleRate = {
  id: string; // roleKey (doc id)
  roleKey: string;
  roleName: string;
  ratePerHour: number | null;
  currency?: string; // optional
  isActive: boolean;
  updatedAt?: any;
  createdAt?: any;
};

export async function listOrgRoleRates(orgId: string): Promise<OrgRoleRate[]> {
  if (!orgId) throw new Error("Missing orgId");
  const q = query(collection(db, "organizations", orgId, "roleRates"), orderBy("roleName", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      roleKey: data.roleKey || d.id,
      roleName: data.roleName || d.id,
      ratePerHour: typeof data.ratePerHour === "number" ? data.ratePerHour : null,
      currency: data.currency || "NZD",
      isActive: data.isActive !== false,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  });
}

function normalizeRoleKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function upsertOrgRoleRate(params: {
  orgId: string;
  roleName: string;
  ratePerHour: number | null;
  currency?: string;
  isActive?: boolean;
}) {
  const { orgId, roleName } = params;
  if (!orgId) throw new Error("Missing orgId");
  const cleanName = String(roleName || "").trim();
  if (!cleanName) throw new Error("Role name is required.");

  const roleKey = normalizeRoleKey(cleanName);
  if (!roleKey) throw new Error("Role name is invalid.");

  const ref = doc(db, "organizations", orgId, "roleRates", roleKey);

  await setDoc(
    ref,
    {
      roleKey,
      roleName: cleanName,
      ratePerHour: params.ratePerHour,
      currency: params.currency || "NZD",
      isActive: params.isActive !== false,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { ok: true, roleKey };
}

export async function updateOrgRoleRate(
  orgId: string,
  roleKey: string,
  updates: Partial<Pick<OrgRoleRate, "roleName" | "ratePerHour" | "currency" | "isActive">>
) {
  if (!orgId) throw new Error("Missing orgId");
  if (!roleKey) throw new Error("Missing roleKey");

  const ref = doc(db, "organizations", orgId, "roleRates", roleKey);

  const next: any = {
    ...updates,
    updatedAt: serverTimestamp(),
  };

  // NOTE: we do NOT rename the doc id here (roleKey) to keep it simple.
  // If roleName changes, roleKey stays stable. (We can add “rename role” later if needed.)
  if (typeof next.roleName === "string") next.roleName = next.roleName.trim();

  await updateDoc(ref, next);
  return { ok: true };
}