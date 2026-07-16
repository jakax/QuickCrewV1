import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import StyledText from "../../../styles/styledText";
import { isNewShift, formatShiftDate, formatPostedAgo } from "../../../utils/jobFormatters";
import { useSession } from "../../providers/SessionProvider";
import { useSavedJobs } from "../../hooks/useSavedJobs";
import { Ionicons } from "@expo/vector-icons";
import { asDateMaybe } from "../../../utils/dateUtils";
import { deriveEmployerStatus, deriveWorkerStatus, STATUS_STYLE_MAP } from "./deriveJobStatus";

import { db } from "../../../services/firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";

// Ticks every 60 s so time-based status transitions fire automatically.
// Replaces the broken Date.now() inside useMemo that never updated on its own.
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const JobsItem = ({
  job,
  forceBookmarked,
  onBookmarkPress,
  onPressOverride,
  hasPendingApplicantsOverride,
}) => {
  const navigation = useNavigation();
  const now = useNow();

  const { isSaved, toggleSaved } = useSavedJobs();
  const savedFromStore = isSaved(job.id);
  const saved =
    typeof forceBookmarked === "boolean" ? forceBookmarked : savedFromStore;

  const { isEmployer, isWorker, uid } = useSession();

  const freshnessTimestamp = job?.updatedAt || job?.createdAt;

  const showNew = useMemo(() => {
    const isOpen = String(job?.status || "").toLowerCase() === "open";
    if (!isOpen) return false;
    if (!isNewShift(freshnessTimestamp, 1)) return false;
    const shiftStart = asDateMaybe(job?.shiftStartAt);
    if (!shiftStart || shiftStart < new Date()) return false;
    return true;
  }, [freshnessTimestamp, job?.status, job?.shiftStartAt]);

  const dateText = formatShiftDate(job?.shiftDate);
  const timeText = job?.shiftTime || "";
  const postedAgo = formatPostedAgo(freshnessTimestamp);

  const hasRate =
    typeof job?.ratePerHour === "number" && !Number.isNaN(job.ratePerHour);
  const rateText = hasRate ? `$${Number(job.ratePerHour).toFixed(2)} per hour` : "";

  // ── Firestore side-data ───────────────────────────────────────────────────

  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [hasPendingApplicants, setHasPendingApplicants] = useState(
    typeof hasPendingApplicantsOverride === "boolean"
      ? hasPendingApplicantsOverride
      : false
  );
  const [assignmentDoc, setAssignmentDoc] = useState(null);

  // Fetch assignment document — needed by both employer and worker for clock in/out times.
  // Employer uses job.assignedWorkerUid; worker uses their own uid.
  useEffect(() => {
    let mounted = true;
    const checkAssignment = async () => {
      try {
        // Determine which uid to use to build the assignment document id
        const workerUid = isEmployer ? job?.assignedWorkerUid : uid;
        if (!job?.id || !workerUid) {
          if (mounted) setAssignmentDoc(null);
          return;
        }
        const snap = await getDoc(
          doc(db, "assignments", `${job.id}_${workerUid}`)
        );
        if (mounted) setAssignmentDoc(snap.exists() ? snap.data() : null);
      } catch {
        if (mounted) setAssignmentDoc(null);
      }
    };
    checkAssignment();
    return () => { mounted = false; };
  }, [isEmployer, uid, job?.id, job?.assignedWorkerUid]);

  // Worker: check if already applied to this job
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try {
        if (!isWorker || !uid || !job?.id) {
          if (mounted) setAlreadyApplied(false);
          return;
        }
        const snap = await getDoc(
          doc(db, "applications", `${job.id}_${uid}`)
        );
        if (mounted) setAlreadyApplied(snap.exists());
      } catch {
        if (mounted) setAlreadyApplied(false);
      }
    };
    check();
    return () => { mounted = false; };
  }, [isWorker, uid, job?.id]);

  // Employer: check if there are pending applicants
  useEffect(() => {
    let mounted = true;
    const checkPendingApplicants = async () => {
      try {
        if (typeof hasPendingApplicantsOverride === "boolean") {
          if (mounted) setHasPendingApplicants(hasPendingApplicantsOverride);
          return;
        }
        if (!isEmployer || !job?.id) {
          if (mounted) setHasPendingApplicants(false);
          return;
        }
        const q = query(
          collection(db, "applications"),
          where("jobId", "==", job.id),
          where("status", "==", "pending"),
          limit(1)
        );
        const snap = await getDocs(q);
        if (mounted) setHasPendingApplicants(!snap.empty);
      } catch (e) {
        console.log("Error checking pending applicants:", e);
        if (mounted) setHasPendingApplicants(false);
      }
    };
    checkPendingApplicants();
    return () => { mounted = false; };
  }, [isEmployer, job?.id, hasPendingApplicantsOverride]);

  // ── Derived status ────────────────────────────────────────────────────────
  // One label per session type. now ticks every 60s so transitions are automatic.

  const statusLabel = useMemo(() => {
    if (isEmployer) return deriveEmployerStatus(job, assignmentDoc, now);
    if (isWorker) return deriveWorkerStatus(job, assignmentDoc, now);
    return null;
  }, [isEmployer, isWorker, job, assignmentDoc, now]);

  const statusStyle = useMemo(() => {
    if (!statusLabel) return null;
    const key = STATUS_STYLE_MAP[statusLabel];
    return key ? styles[key] : styles.statusOpen;
  }, [statusLabel]);

  // ── Navigation helpers ────────────────────────────────────────────────────

  const jobStatusRaw = String(job?.status || "").toLowerCase();

  const canReviewApplicants =
    isEmployer &&
    (hasPendingApplicants ||
      jobStatusRaw === "filled" ||
      jobStatusRaw === "assigned" ||
      jobStatusRaw === "finished") &&
    jobStatusRaw !== "cancelled" &&
    jobStatusRaw !== "cancel";

  const onPress = () => {
    if (onPressOverride) return onPressOverride(job);
    if (isEmployer) {
      navigation.navigate("EmployerEditJob", {
        jobId: job.id,
        readOnly: hasPendingApplicants,
      });
    } else {
      navigation.navigate("WorkerJobDetails", { jobId: job.id });
    }
  };

  const onReviewApplicantsPress = (e) => {
    e.stopPropagation();
    if (
      jobStatusRaw === "filled" ||
      jobStatusRaw === "assigned" ||
      jobStatusRaw === "finished"
    ) {
      navigation.navigate("AssignedWorkerDetails", { jobId: job.id });
    } else {
      navigation.navigate("EmployerJobApplicants", { jobId: job.id });
    }
  };

  const handleBookmarkPress = (e) => {
    e.stopPropagation();
    if (onBookmarkPress) return onBookmarkPress(job);
    toggleSaved({ jobId: job.id, orgId: job.orgId });
  };

  const canShowBookmark = isWorker;
  const canToggleBookmark =
    isWorker && !alreadyApplied && jobStatusRaw === "open";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.badgesRow}>
          {showNew ? (
            <StyledText style={styles.tag}>New shift</StyledText>
          ) : null}

          {statusLabel ? (
            <StyledText style={[styles.statusBadge, statusStyle]}>
              {statusLabel}
            </StyledText>
          ) : null}
        </View>
      </View>

      {canShowBookmark ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (!canToggleBookmark) return;
            handleBookmarkPress(e);
          }}
          hitSlop={10}
          style={styles.saveBtn}
        >
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={20}
            color="#FFD66D"
          />
        </Pressable>
      ) : null}

      <StyledText fontSize="heading" fontWeight="bold" style={styles.title}>
        {job?.title || "Untitled job"}
      </StyledText>

      <StyledText fontSize="subheading" style={styles.company}>
        {job?.orgName || "Company"}
      </StyledText>

      {job?.location ? (
        <StyledText style={styles.location}>{job.location}</StyledText>
      ) : null}

      {dateText || timeText ? (
        <StyledText style={styles.shiftLine}>
          {dateText}
          {dateText && timeText ? " - " : ""}
          {timeText}
        </StyledText>
      ) : null}

      {rateText ? (
        <StyledText style={styles.rate}>{rateText}</StyledText>
      ) : null}

      {postedAgo ? (
        <StyledText style={styles.posted}>{postedAgo}</StyledText>
      ) : null}

      {canReviewApplicants ? (
        <Pressable onPress={onReviewApplicantsPress} style={styles.reviewBtn}>
          <StyledText style={styles.reviewBtnText}>
            {jobStatusRaw === "filled" ||
            jobStatusRaw === "assigned" ||
            jobStatusRaw === "finished"
              ? "View assigned worker"
              : "Review applicants"}
          </StyledText>
        </Pressable>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E3E1E1",
    paddingTop: 12,
    paddingBottom: 12,
    paddingHorizontal: 12,
    marginBottom: 15,
    position: "relative",
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#FFB800",
    color: "#FFFFFF",
    alignSelf: "flex-start",
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: "500",
  },
  posted: {
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "300",
    paddingRight: 30,
  },
  title: {
    color: "#000000",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "500",
    marginTop: 6,
  },
  company: {
    marginTop: 12,
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "500",
  },
  location: {
    marginTop: 12,
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "300",
    fontStyle: "italic",
  },
  shiftLine: {
    marginTop: 12,
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "300",
    fontStyle: "italic",
  },
  rate: {
    marginTop: 12,
    marginBottom: 12,
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "300",
    fontStyle: "italic",
  },
  saveBtn: {
    position: "absolute",
    top: 15,
    right: 12,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    zIndex: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: "hidden",
    alignSelf: "flex-start",
    fontSize: 12,
    fontFamily: "Inter",
    fontWeight: "500",
  },
  statusOpen: {
    backgroundColor: "#F3F4F6",
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusPending: {
    backgroundColor: "#FFF4CC",
    color: "#8A5A00",
    borderWidth: 1,
    borderColor: "#F5D36A",
  },
  statusFilled: {
    backgroundColor: "#ECFDF5",
    color: "#065F46",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusOngoing: {
    backgroundColor: "#FFF3CD",
    color: "#856404",
    borderWidth: 1,
    borderColor: "#FFE083",
  },
  statusFinished: {
    backgroundColor: "#E6FAFB",
    color: "#0BCAD5",
    borderWidth: 1,
    borderColor: "#0BCAD5",
  },
  statusCancelled: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  statusExpired: {
    backgroundColor: "#111827",
    color: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#374151",
  },
  reviewBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E3E1E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  reviewBtnText: {
    color: "#111827",
    fontFamily: "Inter",
    fontWeight: "700",
  },
});

export default JobsItem;