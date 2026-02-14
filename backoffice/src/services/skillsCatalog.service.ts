import { db } from "../firebase/client";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

export type SkillCatalogItem = {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
};

function normalizeSkillKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export async function listSkillsCatalog(): Promise<SkillCatalogItem[]> {
  const q = query(collection(db, "skillsCatalog"), orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function createSkillCatalogItem(name: string) {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("Skill name is required.");

  const key = normalizeSkillKey(cleanName);
  if (!key) throw new Error("Skill name is invalid.");

  await addDoc(collection(db, "skillsCatalog"), {
    name: cleanName,
    key,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return { ok: true };
}

export async function updateSkillCatalogItem(skillId: string, updates: { name?: string; isActive?: boolean }) {
  if (!skillId) throw new Error("Missing skillId.");

  const next: any = { ...updates, updatedAt: serverTimestamp() };

  if (typeof updates.name === "string") {
    const cleanName = updates.name.trim();
    if (!cleanName) throw new Error("Skill name is required.");
    next.name = cleanName;
    next.key = normalizeSkillKey(cleanName);
  }

  await updateDoc(doc(db, "skillsCatalog", skillId), next);
  return { ok: true };
}