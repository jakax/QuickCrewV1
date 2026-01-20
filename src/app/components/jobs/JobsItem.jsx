import React, { useMemo } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import StyledText from "../../../styles/styledText";
import { isNewShift, formatShiftDate, formatPostedAgo } from "../../../utils/jobFormatters";
import { useSession } from "../../providers/SessionProvider"; 
// adjust path if your utils live elsewhere

const JobsItem = ({ job }) => {
  const navigation = useNavigation();
  const { isEmployer } = useSession();

  const showNew = useMemo(() => isNewShift(job?.createdAt, 3), [job?.createdAt]);

  const dateText = formatShiftDate(job?.shiftDate);
  const timeText = job?.shiftTime || "";
  const postedAgo = formatPostedAgo(job?.createdAt);

  const hasRate = typeof job?.ratePerHour === "number" && !Number.isNaN(job.ratePerHour);
  const rateText = hasRate ? `$${Number(job.ratePerHour).toFixed(2)} an hour` : "";

  const onPress = () => {
    if (isEmployer) {
      navigation.navigate("EmployerEditJob", { jobId: job.id });
    } else {
      navigation.navigate("WorkerJobDetails", { jobId: job.id });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
    >
      {/* Tag + Posted */}
      <View style={styles.topRow}>
        {showNew ? (
          <StyledText style={styles.tag}>New shift</StyledText>
        ) : (
          <View />
        )}
        {postedAgo ? <StyledText style={styles.posted}>{postedAgo}</StyledText> : null}
      </View>

      {/* Title */}
      <StyledText fontSize="heading" fontWeight="bold" style={styles.title}>
        {job?.title || "Untitled job"}
      </StyledText>

      {/* Company */}
      <StyledText fontSize="subheading" style={styles.company}>
        {job?.orgName || "Company"}
      </StyledText>

      {/* Location */}
      {job?.location ? (
        <StyledText style={styles.location}>{job.location}</StyledText>
      ) : null}

      {/* Date + Time */}
      {(dateText || timeText) ? (
        <StyledText style={styles.shiftLine}>
          {dateText}
          {dateText && timeText ? " - " : ""}
          {timeText}
        </StyledText>
      ) : null}

      {/* Rate */}
      {rateText ? (
        <StyledText style={styles.rate}>{rateText}</StyledText>
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

  rate: { marginTop: 8, color: "#111827", fontWeight: "800" },
});

export default JobsItem;