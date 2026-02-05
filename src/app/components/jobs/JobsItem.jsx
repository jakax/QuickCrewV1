import React, { useEffect, useMemo, useState } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import StyledText from "../../../styles/styledText";
import { isNewShift, formatShiftDate, formatPostedAgo } from "../../../utils/jobFormatters";
import { useSession } from "../../providers/SessionProvider";
import { useSavedJobs } from "../../hooks/useSavedJobs";
import { Ionicons } from "@expo/vector-icons";

import { db } from "../../../services/firebase/config";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  limit
} from "firebase/firestore";

const JobsItem = ({ job, forceBookmarked, onBookmarkPress, onPressOverride }) => {
  const navigation = useNavigation();

  const { isSaved, toggleSaved } = useSavedJobs();
  const savedFromStore = isSaved(job.id);
  const saved = typeof forceBookmarked === "boolean" ? forceBookmarked : savedFromStore;

  const { isEmployer, isWorker, uid } = useSession();

  const showNew = useMemo(() => isNewShift(job?.createdAt, 3), [job?.createdAt]);

  const dateText = formatShiftDate(job?.shiftDate);
  const timeText = job?.shiftTime || "";
  const postedAgo = formatPostedAgo(job?.createdAt);

  const hasRate = typeof job?.ratePerHour === "number" && !Number.isNaN(job.ratePerHour);
  const rateText = hasRate ? `$${Number(job.ratePerHour).toFixed(2)} an hour` : "";

  // ✅ detect if current worker already applied to this job
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  // ✅ detect if this job has pending applications (employer view)
  const [hasPendingApplicants, setHasPendingApplicants] = useState(false);

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      try {
        if (!isWorker || !uid || !job?.id) {
          if (mounted) setAlreadyApplied(false);
          return;
        }
        const applicationId = `${job.id}_${uid}`;
        const snap = await getDoc(doc(db, "applications", applicationId));
        if (mounted) setAlreadyApplied(snap.exists());
      } catch {
        if (mounted) setAlreadyApplied(false);
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [isWorker, uid, job?.id]);

  useEffect(() => {
    let mounted = true;

    const checkPendingApplicants = async () => {
      try {
        if (!isEmployer || !job?.id) {
          if (mounted) setHasPendingApplicants(false);
          return;
        }

        // Check if there is at least 1 pending application for this job
        const q = query(
          collection(db, "applications"),
          where("jobId", "==", job.id),
          where("status", "==", "APPLIED"),
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

    return () => {
      mounted = false;
    };
  }, [isEmployer, job?.id]);

  const jobStatusRaw = String(job?.status || "").toLowerCase();

  const employerStatusLabel = useMemo(() => {
    if (!isEmployer) return null;

    if (jobStatusRaw === "cancel" || jobStatusRaw === "cancelled") return "Cancelled";
    if (jobStatusRaw === "filled") return "Filled";

    // If job is open (status = pending approval) and has pending applicants -> approval needed
    if (jobStatusRaw === "pending" && hasPendingApplicants) return "Applied (approval needed)";

    // Default
    return "Open";
  }, [isEmployer, jobStatusRaw, hasPendingApplicants]);

  const onPress = () => {
    if (onPressOverride) return onPressOverride(job);

    if (isEmployer) {
      navigation.navigate("EmployerEditJob", { jobId: job.id });
    } else {
      navigation.navigate("WorkerJobDetails", { jobId: job.id });
    }
  };

  const onReviewApplicantsPress = (e) => {
    e.stopPropagation();
    navigation.navigate("EmployerJobApplicants", { jobId: job.id });
  };

  const handleBookmarkPress = (e) => {
    e.stopPropagation();

    if (onBookmarkPress) {
      return onBookmarkPress(job);
    }

    toggleSaved({ jobId: job.id, orgId: job.orgId });
  };

  // ✅ Only allow bookmark when:
  // - worker
  // - NOT already applied
  // - job still open (defensive)
  const canShowBookmark =
    isWorker && !alreadyApplied && String(job?.status || "").toLowerCase() === "open";

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={styles.topRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {showNew ? <StyledText style={styles.tag}>New shift</StyledText> : null}

          {isEmployer && employerStatusLabel ? 
            console.log("Employer status label:", employerStatusLabel) || (
            <StyledText style={styles.statusBadge}>{employerStatusLabel}</StyledText>
          ) : null}
        </View>
      </View>

      {canShowBookmark ? (
        <Pressable onPress={handleBookmarkPress} hitSlop={10} style={styles.saveBtn}>
          <Ionicons
            name={saved ? "bookmark" : "bookmark-outline"}
            size={20}
            color={saved ? "#111" : "#6B7280"}
          />
        </Pressable>
      ) : null}

      <StyledText fontSize="heading" fontWeight="bold" style={styles.title}>
        {job?.title || "Untitled job"}
      </StyledText>

      <StyledText fontSize="subheading" style={styles.company}>
        {job?.orgName || "Company"}
      </StyledText>

      {job?.location ? <StyledText style={styles.location}>{job.location}</StyledText> : null}

      {dateText || timeText ? (
        <StyledText style={styles.shiftLine}>
          {dateText}
          {dateText && timeText ? " - " : ""}
          {timeText}
        </StyledText>
      ) : null}

      {rateText ? <StyledText style={styles.rate}>{rateText}</StyledText> : null}

      {postedAgo ? <StyledText style={styles.posted}>{postedAgo}</StyledText> : null}

      {isEmployer && jobStatusRaw === "pending" && hasPendingApplicants ? (
        <Pressable onPress={onReviewApplicantsPress} style={styles.reviewBtn}>
          <StyledText style={styles.reviewBtnText}>Review applicants</StyledText>
        </Pressable>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    position: "relative",
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },

  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    alignSelf: "flex-start",
  },

  posted: { color: "#9CA3AF" },

  title: { color: "#111827" },
  company: { marginTop: 6, color: "#111827" },
  location: { marginTop: 4, color: "#6B7280" },
  shiftLine: { marginTop: 8, color: "#374151" },

  rate: {
    marginTop: 8,
    marginBottom: 8,
    color: "#111827",
    fontWeight: "800",
  },

  saveBtn: {
    position: "absolute",
    top: 18,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    zIndex: 5,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    color: "#111827",
    alignSelf: "flex-start",
  },

  reviewBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },

  reviewBtnText: {
    color: "#111827",
    fontWeight: "700",
  },
});

export default JobsItem;