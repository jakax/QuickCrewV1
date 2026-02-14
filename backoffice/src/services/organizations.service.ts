import { db } from "../firebase/client";
import { collection, doc, getDoc, getDocs, orderBy, query } from "firebase/firestore";

export type OrgRow = {
  id: string;
  name?: string;
  legalName?: string;
  industry?: string;
  city?: string;
  country?: string;
  createdAt?: any;
};

export async function listOrganizations(): Promise<OrgRow[]> {
  const q = query(collection(db, "organizations"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getOrganizationById(orgId: string): Promise<OrgRow> {
  if (!orgId) throw new Error("Missing orgId");
  const ref = doc(db, "organizations", orgId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Organization not found");
  return { id: snap.id, ...(snap.data() as any) };
}