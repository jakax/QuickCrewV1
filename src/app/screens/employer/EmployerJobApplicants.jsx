import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useRoute } from "@react-navigation/native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { Image } from "react-native";
import WorkerProfileModal from "../../components/modals/WorkerProfileModal";

import { db } from "../../../services/firebase/config";
import { useSession } from "../../providers/SessionProvider";
import { useConfirm } from "../../providers/ConfirmProvider";
import { asDateMaybe } from "../../../utils/dateUtils";

export default function EmployerJobApplicants() {
  const route = useRoute();
  const { uid: employerUid } = useSession();
  const confirm = useConfirm();

  const { jobId } = route.params || {};

  const [job, setJob] = useState(null);
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [error, setError] = useState(null);

  const [selectedWorker, setSelectedWorker] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      if (!jobId) throw new Error("Missing jobId.");

      // Load job
      const jobSnap = await getDoc(doc(db, "jobs", jobId));
      if (!jobSnap.exists()) throw new Error("Job not found.");
      const jobData = { id: jobSnap.id, ...jobSnap.data() };
      setJob(jobData);

      // Load pending applications for this job
      const qApps = query(
        collection(db, "applications"),
        where("jobId", "==", jobId),
        where("status", "==", "pending")
      );

      const snap = await getDocs(qApps);
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Enrich with worker profile (MVP join)
      const enriched = await Promise.all(
        rows.map(async (a) => {
          const workerUid = a.workerUid || a.uid || a.userId || a.workerId;

          // First try snapshot fields (if you later add them)
          const snapshotName =
            a.workerFullName || a.fullName || a.workerName || a.name || a.displayName;

          const snapshotPhone =
            a.workerPhone || a.phone || a.workerPhoneNumber || a.phoneNumber;

          try {
            if (!workerUid) {
              return {
                ...a,
                workerUid: workerUid || null,
                workerFullName: snapshotName || "Unknown name",
                workerPhone: snapshotPhone || "",
              };
            }

            // Try both collection names: "users" and "user"
            const u1 = await getDoc(doc(db, "users", workerUid));
            const u2 = !u1.exists() ? await getDoc(doc(db, "user", workerUid)) : null;

            const data = u1.exists() ? u1.data() : u2?.exists() ? u2.data() : null;

            const fullName =
              snapshotName ||
              data?.fullName ||
              data?.displayName ||
              data?.name ||
              data?.full_name ||
              "Unknown name";

            const phone =
              snapshotPhone ||
              data?.phone ||
              data?.phoneNumber ||
              "";

            return {
              ...a,
              workerUid,
              workerFullName: fullName,
              workerPhone: phone,
              about: data?.about || null,
              cv: data?.cv || null,
              references: data?.references || [],
              rightToWorkNz: data?.rightToWorkNz || null,
              visaExpiryDate: data?.visaExpiryDate || null,
            };
          } catch {
            return {
              ...a,
              workerUid: workerUid || null,
              workerFullName: snapshotName || "Unknown name",
              workerPhone: snapshotPhone || "",
            };
          }
        })
      );

      setApps(enriched);
    } catch (e) {
      setError(e?.message || "Could not load applicants.");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    load();
  }, [load]);

  const jobStatusRaw = useMemo(() => String(job?.status || "").toLowerCase(), [job?.status]);
  const isFilled = jobStatusRaw === "filled";
  const isCancelled = jobStatusRaw === "cancel" || jobStatusRaw === "cancelled";
  const isActive = jobStatusRaw === "active";

  const isExpired = useMemo(() => {
    const shiftStart = asDateMaybe(job?.shiftStartAt);
    return !!shiftStart && shiftStart < new Date();
  }, [job?.shiftStartAt]);

  const hoursUntilShift = useMemo(() => {
    if (!job?.shiftStartAt) return null;
    const startAt = asDateMaybe(job.shiftStartAt);
    if (!startAt) return null;
    return (startAt.getTime() - Date.now()) / (1000 * 60 * 60);
  }, [job?.shiftStartAt]);

  const shiftExpired = hoursUntilShift !== null && hoursUntilShift < 0;
  const showExpiryBanner = shiftExpired && !isFilled && !isCancelled && !isActive;
  const approvalLocked = !shiftExpired && hoursUntilShift !== null && hoursUntilShift <= 2;
  const showApprovalWarning = !shiftExpired && hoursUntilShift !== null && hoursUntilShift <= 4;

  const onReject = async (app) => {
    if (!app?.id) return;

    try {
      setActingId(app.id);

      const batch = writeBatch(db);
      batch.update(doc(db, "applications", app.id), { status: "rejected" });

      await batch.commit();
      await load();
    } catch (e) {
      await confirm({
        title: "Error",
        message: e?.message || "Could not reject applicant.",
        confirmText: "OK",
        cancelText: "Close",
        destructive: true,
      });
    } finally {
      setActingId(null);
    }
  };

  const onApprove = async (app) => {
    if (!app?.id || !app.workerUid) return;

    if (isCancelled) {
      await confirm({
        title: "Job cancelled",
        message: "You cannot approve applicants for a cancelled job.",
        confirmText: "OK",
        cancelText: "Close",
      });
      return;
    }

    if (isFilled) {
      await confirm({
        title: "Job filled",
        message: "This job is already filled.",
        confirmText: "OK",
        cancelText: "Close",
      });
      return;
    }

    const ok = await confirm({
      title: "Approve worker",
      message: `Approve ${app.workerFullName || "this worker"} for this shift?`,
      confirmText: "Approve",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      setActingId(app.id);

      const batch = writeBatch(db);

      // 1) Create assignment
      const assignmentId = `${jobId}_${app.workerUid}`;
      batch.set(doc(db, "assignments", assignmentId), {
        jobId,
        orgId: job?.orgId || null,
        workerUid: app.workerUid,
        employerUid: employerUid || null,
        status: "confirmed",
        confirmedAt: new Date(),
      });

      // 2) Update job state
      batch.update(doc(db, "jobs", jobId), {
        status: "filled",
        filledByUid: app.workerUid,
        assignmentId,
      });

      // 3) Mark chosen application accepted
      batch.update(doc(db, "applications", app.id), { status: "accepted" });

      // 4) Reject all other pending applications
      const qOthers = query(
        collection(db, "applications"),
        where("jobId", "==", jobId),
        where("status", "==", "pending"),
        limit(50)
      );
      const othersSnap = await getDocs(qOthers);

      othersSnap.docs.forEach((d) => {
        if (d.id !== app.id) batch.update(doc(db, "applications", d.id), { status: "rejected" });
      });

      await batch.commit();

      await load();

      await confirm({
        title: "Approved",
        message: "Worker approved and shift is now filled.",
        confirmText: "OK",
        cancelText: "Close",
      });
    } catch (e) {
      await confirm({
        title: "Error",
        message: e?.message || "Could not approve worker.",
        confirmText: "OK",
        cancelText: "Close",
        destructive: true,
      });
    } finally {
      setActingId(null);
    }
  };

  const renderItem = ({ item }) => {
    const busy = actingId === item.id;
    console.log("worker item", item);

    return (
      <View style={styles.card}>
        <Text style={styles.name}>{item.workerFullName || "Unnamed worker"}</Text>
        {item.workerPhone ? <Text style={styles.sub}>{item.workerPhone}</Text> : null}

        <Pressable
          onPress={() => setSelectedWorker(item)}
          style={styles.viewProfileBtn}
        >
          <Text style={styles.viewProfileBtnText}>View full profile</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={() => onReject(item)}
            disabled={busy}
            style={[styles.btn, styles.btnSecondary, busy && styles.btnDisabled]}
          >
            <Text style={styles.btnTextSecondary}>{busy ? "..." : "Reject"}</Text>
          </Pressable>

          <Pressable
            onPress={() => onApprove(item)}
            disabled={busy || isFilled || isCancelled || isExpired || approvalLocked}
            style={[
              styles.btn,
              styles.btnPrimary,
              (busy || isFilled || isCancelled || isExpired || approvalLocked) && styles.btnDisabled,
            ]}
          >
            <Text style={styles.btnTextPrimary}>
              {isFilled
                ? "Filled"
                : isCancelled
                  ? "Cancelled"
                  : isExpired
                    ? "Expired"
                    : approvalLocked
                      ? "Locked"
                      : busy
                        ? "..."
                        : "Approve"}
            </Text>
          </Pressable>
        </View>
        <WorkerProfileModal
          visible={!!selectedWorker}
          worker={selectedWorker}
          onClose={() => setSelectedWorker(null)}
        />
      </View>
    );
  };

  return (
    <View style={styles.root}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.muted}>Loading applicants…</Text>
        </View>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.title}>{job?.title || "Shift"}</Text>
            <Text style={styles.subtitle}>
              {apps.length} pending applicant{apps.length === 1 ? "" : "s"}
            </Text>
          </View>

          {showExpiryBanner ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>
                ⚠️ This shift has already passed. Please reject any pending applicants and cancel the shift.
              </Text>
            </View>
          ) : approvalLocked ? (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>
                🔒 Approvals are closed. This shift starts in less than 2 hours.
              </Text>
            </View>
          ) : showApprovalWarning ? (
            <View style={styles.warningBanner}>
              <Text style={styles.warningBannerText}>
                ⚠️ This shift starts in less than 4 hours. You have until 2 hours before the shift to approve applicants.
              </Text>
            </View>
          ) : null}

          <FlatList
            data={apps}
            keyExtractor={(i) => i.id}
            contentContainerStyle={{ paddingBottom: 24 }}
            ListEmptyComponent={<Text style={styles.muted}>No pending applications yet.</Text>}
            renderItem={renderItem}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff", padding: 16 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  muted: { color: "#6B7280" },

  header: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "900", color: "#111827" },
  subtitle: { marginTop: 6, color: "#6B7280" },

  error: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    fontSize: 13,
  },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  name: { fontSize: 16, fontWeight: "800", color: "#111827" },
  sub: { marginTop: 6, color: "#6B7280" },

  actions: { marginTop: 12, flexDirection: "row", gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimary: { backgroundColor: "#111827" },
  btnSecondary: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  btnDisabled: { opacity: 0.5 },

  btnTextPrimary: { color: "#fff", fontWeight: "800" },
  btnTextSecondary: { color: "#111827", fontWeight: "800" },

  viewProfileBtn: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignSelf: "flex-start",
  },
  viewProfileBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },

  warningBanner: {
    backgroundColor: "#FFF3CD",
    borderWidth: 1,
    borderColor: "#FFE083",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  warningBannerText: {
    color: "#856404",
    fontSize: 13,
    fontFamily: "Inter",
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  errorBannerText: {
    color: "#B91C1C",
    fontSize: 13,
    fontFamily: "Inter",
    lineHeight: 18,
  },
});