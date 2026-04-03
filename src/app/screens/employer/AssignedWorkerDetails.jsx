import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../services/firebase/config";
import { useSession } from "../../providers/SessionProvider";
import { useConfirm } from "../../providers/ConfirmProvider";
import ShiftTimeModal from "../../components/modals/ShiftTimeModal";

function formatTimestamp(ts) {
  if (!ts) return null;
  const date = typeof ts.toDate === "function" ? ts.toDate() : new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseTimeParts(raw) {
  if (!raw || typeof raw !== "string") return null;
  const t = raw.trim().toLowerCase().replace(/\s+/g, " ");
  const m1 = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/);
  if (m1) {
    return { hour: String(Number(m1[1])), minute: m1[2], meridiem: m1[3].toUpperCase() };
  }
  const m2 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m2) {
    let hh = Number(m2[1]);
    const mm = m2[2];
    const ap = hh >= 12 ? "PM" : "AM";
    if (hh === 0) hh = 12;
    else if (hh > 12) hh -= 12;
    return { hour: String(hh), minute: mm, meridiem: ap };
  }
  return null;
}

function composeTime({ hour, minute, meridiem }) {
  if (!hour || !minute || !meridiem) return null;
  return `${hour}:${minute} ${meridiem.toLowerCase()}`;
}

export default function AssignedWorkerDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const { uid: employerUid } = useSession();
  const confirm = useConfirm();

  const { jobId } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [job, setJob] = useState(null);
  const [worker, setWorker] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Employer time modal state
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [empClockInHour, setEmpClockInHour] = useState("9");
  const [empClockInMinute, setEmpClockInMinute] = useState("00");
  const [empClockInMeridiem, setEmpClockInMeridiem] = useState("AM");
  const [empClockOutHour, setEmpClockOutHour] = useState("5");
  const [empClockOutMinute, setEmpClockOutMinute] = useState("00");
  const [empClockOutMeridiem, setEmpClockOutMeridiem] = useState("PM");

  const hoursSubmitted = assignment?.hoursSubmitted === true;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setError(null);
        setLoading(true);

        if (!jobId) throw new Error("Missing jobId.");

        // Load job
        const jobSnap = await getDoc(doc(db, "jobs", jobId));
        if (!jobSnap.exists()) throw new Error("Job not found.");
        const jobData = { id: jobSnap.id, ...jobSnap.data() };
        setJob(jobData);

        const workerUid = jobData.filledByUid || jobData.assignedWorkerUid;
        if (!workerUid) throw new Error("No assigned worker found.");

        // Load assignment
        const assignmentId = `${jobId}_${workerUid}`;
        const assignmentSnap = await getDoc(doc(db, "assignments", assignmentId));
        if (assignmentSnap.exists()) {
          const aData = { id: assignmentSnap.id, ...assignmentSnap.data() };
          if (mounted) setAssignment(aData);

          // Pre-fill employer times if already set
          if (aData.employerClockIn) {
            const parts = parseTimeParts(formatTimestamp(aData.employerClockIn));
            if (parts) {
              setEmpClockInHour(parts.hour);
              setEmpClockInMinute(parts.minute);
              setEmpClockInMeridiem(parts.meridiem);
            }
          }
          if (aData.employerClockOut) {
            const parts = parseTimeParts(formatTimestamp(aData.employerClockOut));
            if (parts) {
              setEmpClockOutHour(parts.hour);
              setEmpClockOutMinute(parts.minute);
              setEmpClockOutMeridiem(parts.meridiem);
            }
          }
        }

        // Load worker profile
        const workerSnap = await getDoc(doc(db, "users", workerUid));
        if (workerSnap.exists()) {
          if (mounted) setWorker({ id: workerSnap.id, ...workerSnap.data() });
        }

      } catch (e) {
        if (mounted) setError(e?.message || "Could not load shift details.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => { mounted = false; };
  }, [jobId]);

  const openUrl = async (url) => {
    try {
      if (!url) return;
      const ok = await Linking.canOpenURL(url);
      if (!ok) throw new Error("Cannot open this link.");
      await Linking.openURL(url);
    } catch {
      // fail silently
    }
  };

  const onSubmitHours = async () => {
    const clockIn = composeTime({
      hour: empClockInHour,
      minute: empClockInMinute,
      meridiem: empClockInMeridiem,
    });
    const clockOut = composeTime({
      hour: empClockOutHour,
      minute: empClockOutMinute,
      meridiem: empClockOutMeridiem,
    });

    if (!clockIn || !clockOut) {
      await confirm({
        title: "Missing times",
        message: "Please set both clock in and clock out times before submitting.",
        confirmText: "OK",
        cancelText: "Close",
      });
      return;
    }

    const ok = await confirm({
      title: "Submit hours?",
      message: "QuickCrew will review the submitted hours. Once submitted, these times cannot be modified.",
      confirmText: "Submit",
      cancelText: "Cancel",
    });

    if (!ok) return;

    try {
      setSubmitting(true);

      const workerUid = job?.filledByUid || job?.assignedWorkerUid;
      const assignmentId = `${jobId}_${workerUid}`;
      const assignmentRef = doc(db, "assignments", assignmentId);

      await updateDoc(assignmentRef, {
        employerClockIn: clockIn,
        employerClockOut: clockOut,
        hoursSubmitted: true,
        hoursSubmittedAt: serverTimestamp(),
        hoursSubmittedBy: employerUid,
        updatedAt: serverTimestamp(),
        reviewStatus: "pending",
      });

      setAssignment((prev) => ({
        ...prev,
        employerClockIn: clockIn,
        employerClockOut: clockOut,
        hoursSubmitted: true,
      }));

      await confirm({
        title: "Hours submitted ✅",
        message: "QuickCrew has been notified and will review the submitted hours.",
        confirmText: "OK",
        cancelText: "Close",
      });

    } catch (e) {
      await confirm({
        title: "Error",
        message: e?.message || "Could not submit hours.",
        confirmText: "OK",
        cancelText: "Close",
        destructive: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error || "Could not load shift."}</Text>
      </View>
    );
  }

  const workerClockInTime = formatTimestamp(assignment?.workerClockIn);
  const workerClockOutTime = formatTimestamp(assignment?.workerClockOut);
  const workerDidNotClock = !assignment?.workerClockIn && !assignment?.workerClockOut;

  const employerClockInDisplay = composeTime({
    hour: empClockInHour,
    minute: empClockInMinute,
    meridiem: empClockInMeridiem,
  });
  const employerClockOutDisplay = composeTime({
    hour: empClockOutHour,
    minute: empClockOutMinute,
    meridiem: empClockOutMeridiem,
  });

  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#81E6F0"]}
      locations={[0, 0.45, 1]}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Shift info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Shift</Text>
          <Text style={styles.sectionValue}>{job.title || "—"}</Text>
          {job.shiftDate ? (
            <Text style={styles.sectionSub}>{job.shiftDate} · {job.shiftTime || ""}</Text>
          ) : null}
        </View>

        {/* Worker info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Worker</Text>
          <Text style={styles.sectionValue}>
            {worker?.fullName || worker?.firstName
              ? `${worker?.firstName || ""} ${worker?.lastName || ""}`.trim()
              : "Unknown worker"}
          </Text>
          {worker?.phone ? (
            <Text style={styles.sectionSub}>{worker.phone}</Text>
          ) : null}
          {worker?.email ? (
            <Text style={styles.sectionSub}>{worker.email}</Text>
          ) : null}
          {worker?.rightToWorkNz ? (
            <Text style={styles.sectionSub}>Right to work: {worker.rightToWorkNz}</Text>
          ) : null}
          {worker?.about ? (
            <Text style={styles.sectionBody}>{worker.about}</Text>
          ) : null}
          {worker?.cv?.url ? (
            <Pressable onPress={() => openUrl(worker.cv.url)} style={styles.cvButton}>
              <Text style={styles.cvButtonText}>📄 {worker.cv?.fileName || "View CV"}</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Worker clock in/out */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Worker time tracking</Text>
          {workerDidNotClock ? (
            <View style={styles.noClockBanner}>
              <Text style={styles.noClockText}>
                Worker did not clock in or clock out for this shift.
              </Text>
            </View>
          ) : (
            <View style={styles.timeRow}>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Clock in</Text>
                <Text style={styles.timeValue}>{workerClockInTime || "—"}</Text>
              </View>
              <View style={styles.timeBox}>
                <Text style={styles.timeLabel}>Clock out</Text>
                <Text style={styles.timeValue}>{workerClockOutTime || "—"}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Employer clock in/out */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Your time record</Text>
          <Text style={styles.sectionHint}>
            Enter the actual hours worked as confirmed by you.
          </Text>

          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Clock in</Text>
              <Text style={styles.timeValue}>
                {hoursSubmitted
                  ? assignment?.employerClockIn || "—"
                  : employerClockInDisplay || "—"}
              </Text>
            </View>
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>Clock out</Text>
              <Text style={styles.timeValue}>
                {hoursSubmitted
                  ? assignment?.employerClockOut || "—"
                  : employerClockOutDisplay || "—"}
              </Text>
            </View>
          </View>

          {!hoursSubmitted ? (
            <Pressable
              onPress={() => setTimeModalOpen(true)}
              style={styles.editTimesButton}
            >
              <Text style={styles.editTimesButtonText}>Edit times</Text>
            </Pressable>
          ) : (
            <View style={styles.submittedBanner}>
              <Text style={styles.submittedBannerText}>
                ✅ Hours submitted. QuickCrew will review this information.
              </Text>
            </View>
          )}
        </View>

        {/* Submit button */}
        {!hoursSubmitted ? (
          <Pressable
            onPress={onSubmitHours}
            disabled={submitting}
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          >
            <Text style={styles.submitButtonText}>
              {submitting ? "Submitting..." : "Submit hours to QuickCrew"}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <ShiftTimeModal
        visible={timeModalOpen}
        initialStart={{ hour: empClockInHour, minute: empClockInMinute, meridiem: empClockInMeridiem }}
        initialEnd={{ hour: empClockOutHour, minute: empClockOutMinute, meridiem: empClockOutMeridiem }}
        onClose={() => setTimeModalOpen(false)}
        onConfirm={({ start, end }) => {
          setEmpClockInHour(start.hour);
          setEmpClockInMinute(start.minute);
          setEmpClockInMeridiem(start.meridiem);
          setEmpClockOutHour(end.hour);
          setEmpClockOutMinute(end.minute);
          setEmpClockOutMeridiem(end.meridiem);
        }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 60,
    gap: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  errorText: {
    color: "#B91C1C",
    fontWeight: "800",
    textAlign: "center",
  },
  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSub: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  sectionBody: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 20,
    marginTop: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  cvButton: {
    marginTop: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignSelf: "flex-start",
  },
  cvButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  noClockBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 10,
    padding: 10,
  },
  noClockText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    gap: 10,
  },
  timeBox: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    alignItems: "center",
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  editTimesButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
  },
  editTimesButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  submittedBanner: {
    marginTop: 10,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 10,
  },
  submittedBannerText: {
    color: "#065F46",
    fontSize: 13,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: "#45BF79",
    borderRadius: 63,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});