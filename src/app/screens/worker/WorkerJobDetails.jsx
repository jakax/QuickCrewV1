import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import Checkbox from "expo-checkbox";
import { LinearGradient } from "expo-linear-gradient";
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
  collection,
} from "firebase/firestore";

const HOURS_8_MS = 8 * 60 * 60 * 1000;

function asDateMaybe(tsOrDate) {
  if (!tsOrDate) return null;
  if (tsOrDate instanceof Date) return tsOrDate;
  if (tsOrDate instanceof Timestamp) return tsOrDate.toDate();
  if (typeof tsOrDate?.seconds === "number") return new Date(tsOrDate.seconds * 1000);
  return null;
}

function normalizeSkill(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

function hasAnySkillOverlap(workerSkills = [], requiredSkills = []) {
  const w = new Set((workerSkills || []).map(normalizeSkill).filter(Boolean));
  const r = (requiredSkills || []).map(normalizeSkill).filter(Boolean);
  if (r.length === 0) return true; // no requirement
  for (const skill of r) {
    if (w.has(skill)) return true;
  }
  return false;
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

  const [confirmNoCriminalRecord, setConfirmNoCriminalRecord] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptCancellationPolicies, setAcceptCancellationPolicies] = useState(false);

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

    // ✅ Skills eligibility (MVP): if job has requiredSkills, worker must match at least one
    const requiredSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
    const workerSkills = Array.isArray(userDoc.skills) ? userDoc.skills : [];

    if (!hasAnySkillOverlap(workerSkills, requiredSkills)) {
      return { canApply: false, reason: "Your skills don’t match this shift’s requirements." };
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

        // ✅ Load worker profile for eligibility checks inside the transaction
        const userRef = doc(db, "users", uid);
        const userSnap = await tx.get(userRef);
        if (!userSnap.exists()) throw new Error("User profile not found.");

        const u = userSnap.data();

        if (String(u?.role || "") !== "worker") throw new Error("Only workers can apply.");
        if (u?.isActive === false) throw new Error("Your account is inactive.");
        if (String(u?.approvalStatus || "").toUpperCase() !== "APPROVED") {
          throw new Error("Your profile is not approved yet.");
        }

        const requiredSkillsTx = Array.isArray(jobData?.requiredSkills) ? jobData.requiredSkills : [];
        const workerSkillsTx = Array.isArray(u?.skills) ? u.skills : [];

        if (!hasAnySkillOverlap(workerSkillsTx, requiredSkillsTx)) {
          throw new Error("Your skills don’t match this shift’s requirements.");
        }

        const shiftDate = String(jobData?.shiftDate || "").trim();
        if (!shiftDate) throw new Error("This shift is missing shiftDate.");

        const lockId = `${uid}_${shiftDate}`;
        const lockRef = doc(db, "workerShiftDayLocks", lockId);

        // If a lock exists, worker already has an active shift that day
        const lockSnap = await tx.get(lockRef);
        if (lockSnap.exists()) {
          throw new Error("You already have a shift on this date. You can’t apply to another one the same day.");
        }

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

        tx.set(lockRef, {
          workerUid: uid,
          shiftDate,
          jobId,
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        // 🔥 If it was saved, remove it — “Applied” replaces “Saved”
        tx.delete(savedRef);

        // Auto-assign only when business approval is NOT required
        const approvalRequired = jobData?.businessApprovalRequired === true;

        if (!approvalRequired) {
          // Create assignment record
          const assignmentRef = doc(collection(db, "assignments"));

          // Update job to assigned immediately
          tx.update(jobRef, {
            status: "assigned",
            assignedWorkerUid: uid,
            assignedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          // Also mark the application as accepted (so Applied tab can reflect it)
          tx.set(
            appRef,
            {
              status: "accepted",
              decidedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          tx.set(assignmentRef, {
            jobId,
            orgId: jobData.orgId || null,
            orgName: jobData.orgName || null,
            workerUid: uid,
            status: "assigned",
            createdAt: serverTimestamp(),
            createdBy: uid,
          });
        }
      });

      const approvalRequired = job?.businessApprovalRequired === true;
      setApplicationStatus(approvalRequired ? "pending" : "accepted");
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

  const freshnessTimestamp = job.updatedAt || job.createdAt;
  const showNew = isNewShift(freshnessTimestamp, 3);
  const dateText = formatShiftDate(job.shiftDate);
  const timeText = job.shiftTime || "";
  const postedAgo = formatPostedAgo(freshnessTimestamp);
  const rateText =
    typeof job.ratePerHour === "number" ? `$${Number(job.ratePerHour).toFixed(2)} an hour` : null;

  const confirmationsAccepted =
    confirmNoCriminalRecord && acceptTerms && acceptCancellationPolicies;

  const applyDisabled = !applyEligibility.canApply || !confirmationsAccepted || applyLoading;
  const applyButtonLabel = applyLoading ? "Applying..." : alreadyApplied ? "Applied ✅" : "Apply for shift";

  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#C2F9FF"]}
      locations={[0, 0.46, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailsCard}>
            <View style={styles.jobInfoBlock}>
              <Text style={styles.infoTitle}>{job.title || "Untitled job"}</Text>
              <Text style={styles.infoLine}>{job.orgName || "QuickCrew"}</Text>
              {job.location ? (
                <Text style={styles.infoLine}>{job.location}</Text>
              ) : null}

              {dateText || timeText ? (
                <Text style={styles.infoMeta}>
                  {dateText}
                  {dateText && timeText ? " - " : ""}
                  {timeText}
                </Text>
              ) : null}

              {rateText ? <Text style={styles.infoMeta}>{rateText}</Text> : null}
            </View>

            {!hasActiveApplication ? (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={() => toggleSaved({ jobId: job.id, orgId: job.orgId })}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={saved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color={saved ? "#FFB800" : "#FFB800"}
                />
              </TouchableOpacity>
            ) : null}

            <View style={styles.divider} />

            {!!job.description && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Company description.</Text>
                <Text style={styles.sectionBody}>{job.description}</Text>
              </View>
            )}

            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>Special requirements</Text>
              <Text style={styles.sectionBody}>
                {job?.specialRequirements ||
                  "QuickCrew is a staffing company that connects reliable talent with casual job opportunities. We specialize in providing fast, flexible, and professional staffing solutions for businesses that need dependable support."}
              </Text>
            </View>

            {postedAgo ? <Text style={styles.posted}>{postedAgo}</Text> : null}
          </View>

          <View style={styles.confirmationsWrap}>
            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationText}>
                I have confirmed I have no criminal records
              </Text>
              <Checkbox
                value={confirmNoCriminalRecord}
                onValueChange={setConfirmNoCriminalRecord}
                color={confirmNoCriminalRecord ? "#70A9DF" : undefined}
                style={styles.checkbox}
              />
            </View>

            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationText}>
                I have read and agreed terms and conditions
              </Text>
              <Checkbox
                value={acceptTerms}
                onValueChange={setAcceptTerms}
                color={acceptTerms ? "#70A9DF" : undefined}
                style={styles.checkbox}
              />
            </View>

            <View style={styles.confirmationRow}>
              <Text style={styles.confirmationText}>
                I have read and accept the cancellation policies
              </Text>
              <Checkbox
                value={acceptCancellationPolicies}
                onValueChange={setAcceptCancellationPolicies}
                color={acceptCancellationPolicies ? "#70A9DF" : undefined}
                style={styles.checkbox}
              />
            </View>
          </View>

          <View style={styles.bottomSection}>

            {applyError ? <Text style={styles.inlineError}>{applyError}</Text> : null}
            {cancelError ? <Text style={styles.inlineError}>{cancelError}</Text> : null}
            {!applyEligibility.canApply && applyEligibility.reason ? (
              <Text style={styles.applyHint}>{applyEligibility.reason}</Text>
            ) : null}

            {hasActiveApplication ? (
              <TouchableOpacity
                style={[styles.secondaryActionButton, (!canCancel || cancelLoading) && styles.applyButtonDisabled]}
                onPress={onCancelApplication}
                disabled={!canCancel || cancelLoading}
              >
                <Text style={styles.secondaryActionButtonText}>
                  {cancelLoading
                    ? "Cancelling..."
                    : canCancel
                    ? "Cancel application"
                    : "Cancel locked (under 4h)"}
                </Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={[styles.applyButton, applyDisabled && styles.applyButtonDisabled]}
              onPress={applyToJob}
              disabled={applyDisabled}
            >
              <Text style={styles.applyButtonText}>{applyButtonLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToShiftsButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backToShiftsButtonText}>Back to shifts</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalMessage}>
                {alreadyApplied
                  ? applicationStatus === "accepted"
                    ? "You’re assigned to this shift ✅ You can view it in your Applied tab."
                    : "Application submitted. Waiting for employer approval. You can view it in your Applied tab."
                  : applyEligibility.reason || "You can’t apply to this shift right now."}
              </Text>

              <View style={styles.modalButtonsRow}>
                <Pressable
                  style={[styles.modalButton, styles.okButton]}
                  onPress={() => {
                    setModalVisible(false);
                    const notApproved = String(userDoc?.approvalStatus || "").toUpperCase() !== "APPROVED";
                    const inactive = userDoc?.isActive === false;

                    if (notApproved || inactive) {
                      navigation.navigate("Profile");
                    }
                  }}
                >
                  <Text style={styles.okButtonText}>OK</Text>
                </Pressable>

                <Pressable style={[styles.modalButton, styles.modalGhost]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalGhostText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: 75,
    paddingBottom: 30,
    paddingHorizontal: 20,
    gap: 30,
  },

  topRow: {
    alignSelf: "stretch",
    marginBottom: 6,
  },

  backButton: {
    alignSelf: "flex-start",
    padding: 8,
  },

  backButtonText: {
    color: "#C4C4C4",
    fontSize: 34,
    lineHeight: 34,
    fontWeight: "600",
  },

  detailsCard: {
    alignSelf: "stretch",
    position: "relative",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.91)",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },

  jobInfoBlock: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 12,
    paddingRight: 28,
    gap: 10,
  },

  infoTitle: {
    color: "#434343",
    fontSize: 13,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "500",
  },

  infoLine: {
    color: "#434343",
    fontSize: 13,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "500",
    marginTop: 10,
  },

  infoMeta: {
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
    marginTop: 10,
  },

  saveButton: {
    position: "absolute",
    top: 15,
    right: 12,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  divider: {
    height: 1,
    backgroundColor: "#B7B7B7",
    marginHorizontal: 22,
    marginVertical: 18,
  },

  sectionBlock: {
    paddingLeft: 12,
    paddingRight: 12,
    marginBottom: 26,
  },

  sectionTitle: {
    color: "#404040",
    fontSize: 13,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "500",
    marginBottom: 14,
  },

  sectionBody: {
    color: "#434343",
    fontSize: 13,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
    lineHeight: 26,
  },

  posted: {
    marginTop: 4,
    marginLeft: 12,
    color: "#2A5FB3",
    fontSize: 12,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
  },

  confirmationsWrap: {
    alignSelf: "stretch",
    gap: 8,
    marginTop: 6,
  },

  confirmationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 8,
    minHeight: 20,
  },

  confirmationText: {
    flex: 1,
    color: "#F95050",
    fontSize: 11,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
  },

  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderColor: "#70A9DF",
  },

  bottomSection: {
    alignSelf: "stretch",
    gap: 12,
    marginTop: 10,
  },

  inlineError: {
    color: "#b91c1c",
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 8,
  },

  applyHint: {
    color: "#6B7280",
    fontWeight: "700",
    fontSize: 13,
    paddingHorizontal: 8,
  },

  applyButton: {
    alignSelf: "stretch",
    height: 40,
    backgroundColor: "#45BF79",
    borderTopLeftRadius: 59,
    borderTopRightRadius: 59,
    borderBottomRightRadius: 63,
    borderBottomLeftRadius: 63,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },

  applyButtonDisabled: {
    opacity: 0.6,
  },

  applyButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  secondaryActionButton: {
    alignSelf: "stretch",
    height: 40,
    backgroundColor: "#111827",
    borderTopLeftRadius: 59,
    borderTopRightRadius: 59,
    borderBottomRightRadius: 63,
    borderBottomLeftRadius: 63,
    justifyContent: "center",
    alignItems: "center",
  },

  secondaryActionButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  backToShiftsButton: {
    alignSelf: "stretch",
    height: 40,
    backgroundColor: "#70A9DF",
    borderTopLeftRadius: 59,
    borderTopRightRadius: 59,
    borderBottomRightRadius: 63,
    borderBottomLeftRadius: 63,
    justifyContent: "center",
    alignItems: "center",
  },

  backToShiftsButtonText: {
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  error: {
    color: "#b91c1c",
    textAlign: "center",
    fontWeight: "800",
  },

  link: {
    color: "#007AFF",
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },

  modalMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },

  modalButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },

  modalButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
  },

  okButton: {
    backgroundColor: "#2563EB",
  },

  okButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  modalGhost: {
    backgroundColor: "#F3F4F6",
  },

  modalGhostText: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
});