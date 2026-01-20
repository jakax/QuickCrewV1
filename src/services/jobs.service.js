import { db } from "./firebase/config";
import {
  addDoc,
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  limit,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

export async function createJob({ orgId, orgName, uid, job }) {
  if (!orgId) throw new Error("Missing orgId");
  if (!orgName) throw new Error("Missing orgName");
  if (!uid) throw new Error("Missing user id");
  if (!job?.title?.trim()) throw new Error("Job title is required");
  if (!job?.shiftDate) throw new Error("Shift date is required");
  if (!job?.shiftTime?.trim()) throw new Error("Shift time is required");

  const rateNum =
    job.ratePerHour === "" || job.ratePerHour == null
      ? null
      : Number(job.ratePerHour);

  if (rateNum != null && Number.isNaN(rateNum)) {
    throw new Error("Rate per hour must be a number");
  }

  const payload = {
    orgId,
    orgName,
    createdBy: uid,
    title: job.title.trim(),
    location: (job.location || "").trim(),
    description: (job.description || "").trim(),
    shiftDate: job.shiftDate, // "YYYY-MM-DD"
    shiftTime: job.shiftTime.trim(), // "9:00 am to 5:00 pm"
    ratePerHour: rateNum,
    status: "open",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "jobs"), payload);
  return { jobId: ref.id };
}

export async function listJobsByOrg({ orgId }) {
  if (!orgId) throw new Error("Missing orgId");

  const q = query(
    collection(db, "jobs"),
    where("orgId", "==", orgId),
    orderBy("createdAt", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function listPublicJobs({ limitCount = 50 } = {}) {
  const q = query(
    collection(db, "jobs"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}


export async function getJobById(jobId) {
  if (!jobId) throw new Error("Missing jobId");
  const ref = doc(db, "jobs", jobId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Job not found");
  return { id: snap.id, ...snap.data() };
}

export async function updateJob(jobId, updates) {
  if (!jobId) throw new Error("Missing jobId");
  const ref = doc(db, "jobs", jobId);

  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}