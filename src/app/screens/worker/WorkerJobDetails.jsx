import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TouchableOpacity, Switch, ActivityIndicator } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getJobById } from "../../../services/jobs.service";
import { formatShiftDate, formatPostedAgo, isNewShift } from "../../../utils/jobFormatters";

export default function WorkerJobDetails() {
  const route = useRoute();
  const navigation = useNavigation();
  const jobId = route?.params?.jobId;

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [saved, setSaved] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

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
  const rateText = typeof job.ratePerHour === "number" ? `$${Number(job.ratePerHour).toFixed(2)} an hour` : null;

  return (
    <View style={styles.container}>
      {/* Content */}
      <View style={{ paddingBottom: 120 }}>
        {showNew ? <Text style={styles.tag}>New shift</Text> : null}

        <Text style={styles.title}>{job.title}</Text>
        <Text style={styles.company}>{job.orgName}</Text>

        {job.location ? <Text style={styles.meta}>{job.location}</Text> : null}

        {(dateText || timeText) ? (
          <Text style={styles.meta}>
            {dateText}
            {dateText && timeText ? " - " : ""}
            {timeText}
          </Text>
        ) : null}

        {rateText ? <Text style={styles.rate}>{rateText}</Text> : null}
        {postedAgo ? <Text style={styles.posted}>{postedAgo}</Text> : null}

        {job.description ? <Text style={styles.description}>{job.description}</Text> : null}
      </View>

      {/* Bottom Apply Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.saveContainer}>
          <Text style={styles.saveText}>Save Job</Text>
          <Switch value={saved} onValueChange={setSaved} />
        </View>

        <TouchableOpacity style={styles.applyButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.applyButtonText}>Apply Now</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal transparent animationType="fade" visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalMessage}>
              Please complete your registration form before applying for this job.
            </Text>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalButton, styles.okButton]}
                onPress={() => {
                  setModalVisible(false);
                  navigation.navigate("Profile");
                }}
              >
                <Text style={styles.okButtonText}>OK</Text>
              </Pressable>

              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
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

  applyButton: { backgroundColor: "#2563EB", paddingVertical: 15, borderRadius: 12 },
  applyButtonText: { textAlign: "center", color: "#fff", fontSize: 18, fontWeight: "900" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalBox: { width: "80%", backgroundColor: "#fff", padding: 20, borderRadius: 12, alignItems: "center" },
  modalMessage: { fontSize: 16, marginBottom: 20, textAlign: "center" },
  modalButtonsRow: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  modalButton: { flex: 1, paddingVertical: 10, marginHorizontal: 5, borderRadius: 8, alignItems: "center" },
  cancelButton: { backgroundColor: "#ddd" },
  okButton: { backgroundColor: "#2563EB" },
  cancelButtonText: { color: "#333", fontSize: 16, fontWeight: "700" },
  okButtonText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});