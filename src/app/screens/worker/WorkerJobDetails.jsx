import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getJobById, cancelJobApplication } from "../../../services/jobs.service";
import { formatShiftDate, formatPostedAgo, isNewShift, canCancelApplication } from "../../../utils/jobFormatters";
import { useSavedJobs } from "../../hooks/useSavedJobs";
import { useSession } from "../../providers/SessionProvider";
import { useConfirm } from "../../providers/ConfirmProvider";

import { db } from "../../../services/firebase/config";
import {
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  runTransaction,
} from "firebase/firestore";

const HOURS_8_MS = 8 * 60 * 60 * 1000;

function asDateMaybe(tsOrDate) {
  if (!tsOrDate) return null;
  if (tsOrDate instanceof Date) return tsOrDate;
  if (tsOrDate instanceof Timestamp) return tsOrDate.toDate();
  if (typeof tsOrDate?.seconds === "number") return new Date(tsOrDate.seconds * 1000);
  return null;
}

export default function WorkerJobDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const jobId = route?.params?.jobId;

  const { uid } = useSession();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [userDoc, setUserDoc] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyError, setApplyError] = useState(null);

  const confirm = useConfirm();

  const [applicationStatus, setApplicationStatus] = useState(null); // "pending" | "cancelled" | ...
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState(null);

  const { isSaved, toggleSaved } = useSavedJobs();
  const saved = isSaved(jobId);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoadError(null);
        setLoading(true);
        const data = await getJobById(jobId);
        if (mounted) setJob(data);
      } catch (e) {
        if (mounted) setLoadError(e?.message || "Could not load job.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (jobId) load();
    else {
      setLoading(false);
      setLoadError("Missing job id.");
    }

    return () => {
      mounted = false;
    };
  }, [jobId]);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        setUserError(null);
        setUserLoading(true);

        if (!uid) throw new Error("Missing uid (session).");

        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("User profile not found.");

        if (mounted) setUserDoc({ id: snap.id, ...snap.data() });
      } catch (e) {
        if (mounted) setUserError(e?.message || "Could not load user.");
      } finally {
        if (mounted) setUserLoading(false);
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, [uid]);

  useEffect(() => {
    let mounted = true;

    const checkApplied = async () => {
      try {
        if (!uid || !jobId) return;

        const applicationId = `${jobId}_${uid}`;
        const ref = doc(db, "applications", applicationId);
        const snap = await getDoc(ref);

        if (!mounted) return;

        if (!snap.exists()) {
          setApplicationStatus(null);
          return;
        }

        const st = String(snap.data()?.status || "").toLowerCase();
        setApplicationStatus(st || "pending");
      } catch {
        // ignore
      }
    };

    checkApplied();
    return () => {
      mounted = false;
    };
  }, [uid, jobId]);

  const hasActiveApplication = useMemo(() => {
    const st = String(applicationStatus || "").toLowerCase();
    return st === "pending" || st === "accepted";
  }, [applicationStatus]);

  const alreadyApplied = hasActiveApplication;

  const applyEligibility = useMemo(() => {
    if (!job) return { canApply: false, reason: "Job not loaded." };
    if (!uid) return { canApply: false, reason: "Missing session." };
    if (userLoading) return { canApply: false, reason: "Checking eligibility..." };
    if (userError) return { canApply: false, reason: "Could not verify your profile." };
    if (!userDoc) return { canApply: false, reason: "Could not verify your profile." };

    if (userDoc.role !== "worker") return { canApply: false, reason: "Only workers can apply." };
    if (userDoc.isActive === false) return { canApply: false, reason: "Your account is inactive." };
    if (String(userDoc.approvalStatus || "").toUpperCase() !== "APPROVED") {
      return { canApply: false, reason: "Your profile is not approved yet." };
    }

    const status = String(job.status || "").toLowerCase();
    if (status !== "open") return { canApply: false, reason: "This shift is no longer available." };

    const startAt = asDateMaybe(job.shiftStartAt);
    if (!startAt) return { canApply: false, reason: "This shift is missing start time. Please contact support." };

    const diff = startAt.getTime() - Date.now();
    if (diff <= 0) return { canApply: false, reason: "This shift has already started." };
    if (diff < HOURS_8_MS) return { canApply: false, reason: "Applications close 8 hours before the shift starts." };

    if (alreadyApplied) return { canApply: false, reason: "Applied ✅" };

    return { canApply: true, reason: null };
  }, [job, uid, userLoading, userError, userDoc, alreadyApplied]);

  const canCancel = useMemo(() => {
    if (!job) return false;
    if (!hasActiveApplication) return false;
    return canCancelApplication(job, 4);
  }, [job, hasActiveApplication]);

  const onCancelApplication = async () => {
    try {
      setCancelError(null);

      if (!uid || !jobId) throw new Error("Missing session/job.");

      if (!canCancel) {
        setCancelError("You can only cancel 4+ hours before the shift starts.");
        return;
      }

      const ok = await confirm({
        title: "Cancel application?",
        message: "This will withdraw your application and the shift will be available for other workers.",
        confirmText: "Cancel application",
        cancelText: "Keep it",
        destructive: true,
      });

      if (!ok) return;

      setCancelLoading(true);

      await cancelJobApplication({
        jobId,
        workerUid: uid,
        minHoursBeforeStart: 4,
      });

      setApplicationStatus("cancelled");
    } catch (e) {
      setCancelError(e?.message || "Could not cancel application.");
    } finally {
      setCancelLoading(false);
    }
  };

  const applyToJob = async () => {
    try {
      setApplyError(null);

      if (!applyEligibility.canApply) {
        setModalVisible(true);
        return;
      }

      setApplyLoading(true);

      const applicationId = `${jobId}_${uid}`;
      const appRef = doc(db, "applications", applicationId);
      const jobRef = doc(db, "jobs", jobId);
      const savedRef = doc(db, "users", uid, "savedJobs", jobId); // <-- remove bookmark if it exists

      await runTransaction(db, async (tx) => {
        const jobSnap = await tx.get(jobRef);
        if (!jobSnap.exists()) throw new Error("Job not found.");

        const jobData = jobSnap.data();
        const status = String(jobData?.status || "").toLowerCase();
        if (status !== "open") throw new Error("This shift is no longer available.");

        const startAt = asDateMaybe(jobData?.shiftStartAt);
        if (!startAt) throw new Error("This shift is missing start time.");

        const diff = startAt.getTime() - Date.now();
        if (diff <= 0) throw new Error("This shift has already started.");
        if (diff < HOURS_8_MS) throw new Error("Applications close 8 hours before the shift starts.");

        const existing = await tx.get(appRef);
        if (existing.exists()) {
          const ex = existing.data();
          const st = String(ex?.status || "").toLowerCase();

          // If already active, stop
          if (st === "pending" || st === "accepted") return;

          // Cooldown after cancel (e.g. 10 minutes)
          if (st === "cancelled") {
            const cancelledAt =
              ex?.cancelledAt && typeof ex.cancelledAt.toDate === "function"
                ? ex.cancelledAt.toDate()
                : null;

            const COOLDOWN_MS = 10 * 60 * 1000;
            if (cancelledAt && Date.now() - cancelledAt.getTime() < COOLDOWN_MS) {
              throw new Error("Please wait a few minutes before applying again.");
            }
          }

          // If rejected/cancelled and cooldown passed → allow overwrite (continue)
        }

        tx.set(appRef, {
          jobId,
          workerId: uid,
          workerUid: uid,
          orgId: jobData.orgId || null,
          orgName: jobData.orgName || null,

          status: "pending",
          createdAt: serverTimestamp(),

          jobTitle: jobData.title || null,
          location: jobData.location || null,
          ratePerHour: typeof jobData.ratePerHour === "number" ? jobData.ratePerHour : null,
          shiftDate: jobData.shiftDate || null,
          shiftTime: jobData.shiftTime || null,
          shiftStartAt: jobData.shiftStartAt || null,
          updatedAt: serverTimestamp(),
        });

        // 🔥 If it was saved, remove it — “Applied” replaces “Saved”
        tx.delete(savedRef);

        // Auto-assign lock only when business approval is NOT required
        const approvalRequired = jobData?.businessApprovalRequired === true;
        if (!approvalRequired) {
          tx.update(jobRef, {
            status: "pending",
            updatedAt: serverTimestamp(),
          });
        }
      });

      setApplicationStatus("pending");
      setModalVisible(true);
    } catch (e) {
      setApplyError(e?.message || "Could not apply.");
    } finally {
      setApplyLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (loadError || !job) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{loadError || "Job not found."}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12 }}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showNew = isNewShift(job.createdAt, 3);
  const dateText = formatShiftDate(job.shiftDate);
  const timeText = job.shiftTime || "";
  const postedAgo = formatPostedAgo(job.createdAt);
  const rateText =
    typeof job.ratePerHour === "number" ? `$${Number(job.ratePerHour).toFixed(2)} an hour` : null;

  const applyDisabled = !applyEligibility.canApply || applyLoading;
  const applyButtonLabel = applyLoading ? "Applying..." : alreadyApplied ? "Applied ✅" : "Apply Now";

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {showNew ? <Text style={styles.tag}>New shift</Text> : null}

        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.orgName}</Text>

        {job.location ? <Text style={styles.meta}>{job.location}</Text> : null}

        {dateText || timeText ? (
          <Text style={styles.meta}>
            {dateText}
            {dateText && timeText ? " - " : ""}
            {timeText}
          </Text>
        ) : null}

        {rateText ? <Text style={styles.rate}>{rateText}</Text> : null}

        {job.description ? <Text style={styles.description}>{job.description}</Text> : null}
        {postedAgo ? <Text style={styles.posted}>{postedAgo}</Text> : null}

        {applyError ? <Text style={[styles.error, { marginTop: 14 }]}>{applyError}</Text> : null}
      </ScrollView>

      <View style={styles.bottomBar}>
        {/* ✅ Hide bookmark once applied */}
        {!hasActiveApplication ? (
          <View style={styles.saveContainer}>
            <Text style={styles.saveText}>Save Job</Text>
            <Switch value={saved} onValueChange={() => toggleSaved({ jobId: job.id, orgId: job.orgId })} />
          </View>
        ) : null}

        {cancelError ? <Text style={styles.applyHint}>{cancelError}</Text> : null}

        {hasActiveApplication ? (
          <TouchableOpacity
            style={[styles.cancelButton, (!canCancel || cancelLoading) && styles.applyButtonDisabled]}
            onPress={onCancelApplication}
            disabled={!canCancel || cancelLoading}
          >
            <Text style={styles.cancelButtonText}>
              {cancelLoading ? "Cancelling..." : canCancel ? "Cancel application" : "Cancel locked (under 4h)"}
            </Text>
          </TouchableOpacity>
        ) : null}

        {!applyEligibility.canApply && applyEligibility.reason ? (
          <Text style={styles.applyHint}>{applyEligibility.reason}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.applyButton, applyDisabled && styles.applyButtonDisabled]}
          onPress={applyToJob}
          disabled={applyDisabled}
        >
          <Text style={styles.applyButtonText}>{applyButtonLabel}</Text>
        </TouchableOpacity>
      </View>

      <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMessage}>
              {alreadyApplied
                ? "Application submitted. You can view it in your Applied tab."
                : applyEligibility.reason || "You can’t apply to this shift right now."}
            </Text>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalButton, styles.okButton]}
                onPress={() => {
                  setModalVisible(false);
                  if (String(userDoc?.approvalStatus || "").toUpperCase() !== "APPROVED") {
                    navigation.navigate("Profile");
                  }
                }}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </Pressable>

              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 20 },

  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12,
  },

  title: { fontSize: 26, fontWeight: "900", color: "#111827" },
  company: { fontSize: 18, marginTop: 8, fontWeight: "700", color: "#111827" },
  meta: { marginTop: 8, fontSize: 15, color: "#374151", fontWeight: "600" },
  rate: { marginTop: 10, fontSize: 16, fontWeight: "900", color: "#111827" },
  posted: { marginTop: 10, fontSize: 13, color: "#9CA3AF", fontWeight: "700" },
  description: { marginTop: 16, fontSize: 16, color: "#111827", lineHeight: 22 },

  error: { color: "#b91c1c", textAlign: "center", fontWeight: "800" },
  link: { color: "#007AFF", fontWeight: "700" },

  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#E5E7EB",
  },

  saveContainer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  saveText: { fontSize: 16, fontWeight: "600" },

  applyHint: { marginBottom: 10, color: "#6B7280", fontWeight: "700" },

  applyButton: { backgroundColor: "#2563EB", paddingVertical: 15, borderRadius: 12 },
  applyButtonDisabled: { opacity: 0.6 },
  applyButtonText: { textAlign: "center", color: "#fff", fontSize: 18, fontWeight: "900" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "80%", backgroundColor: "#fff", padding: 20, borderRadius: 12, alignItems: "center" },
  modalMessage: { fontSize: 16, marginBottom: 20, textAlign: "center" },
  modalButtonsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalButton: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, alignItems: "center" },
  okButton: { backgroundColor: "#2563EB" },
  okButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 140 },

  cancelButton: {
    backgroundColor: "#111827",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  cancelButtonText: {
    textAlign: "center",
    color: "#fff",
    fontSize: 16,
    fontWeight: "900",
  },
});