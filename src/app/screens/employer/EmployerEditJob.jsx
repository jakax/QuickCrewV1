import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSession } from "../../providers/SessionProvider";
import { getJobById, updateJob } from "../../../services/jobs.service";
import JobForm from "../../components/jobs/JobForm";

function parseShiftTimeLegacy(shiftTimeRaw) {
  if (!shiftTimeRaw || typeof shiftTimeRaw !== "string") return { start: "", end: "" };
  const normalized = shiftTimeRaw.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/ to /i);
  if (parts.length !== 2) return { start: "", end: "" };
  return { start: parts[0].trim(), end: parts[1].trim() };
}

export default function EmployerEditJob() {
  const route = useRoute();
  const navigation = useNavigation();
  const { orgId, orgName } = useSession();

  const jobId = route?.params?.jobId;

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setError(null);
        setLoadingJob(true);

        const data = await getJobById(jobId);

        if (orgId && data.orgId !== orgId) {
          throw new Error("You don’t have permission to edit this job.");
        }

        if (mounted) setJob(data);
      } catch (e) {
        if (mounted) setError(e?.message || "Could not load job.");
      } finally {
        if (mounted) setLoadingJob(false);
      }
    };

    if (jobId) load();
    else {
      setLoadingJob(false);
      setError("Missing job id.");
    }

    return () => {
      mounted = false;
    };
  }, [jobId, orgId]);

  const onSubmit = async (values) => {
    try {
      setError(null);
      setSaving(true);
      await updateJob(jobId, values);
      navigation.goBack();
    } catch (e) {
      setError(e?.message || "Could not update job.");
    } finally {
      setSaving(false);
    }
  };

  if (loadingJob) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || "Job not found."}</Text>
      </View>
    );
  }

  const legacy = parseShiftTimeLegacy(job.shiftTime || "");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.h1}>Edit shift</Text>

      <JobForm
        mode="edit"
        initialValues={{
          title: job.title || "",
          location: job.location || "",
          shiftDate: job.shiftDate || "",

          // NEW: prefill split times if present, otherwise fallback to legacy shiftTime parsing
          shiftStartTime: job.shiftStartTime || legacy.start,
          shiftEndTime: job.shiftEndTime || legacy.end,

          // Keep legacy too (JobForm will re-compose it on submit)
          shiftTime: job.shiftTime || "",

          ratePerHour: typeof job.ratePerHour === "number" ? job.ratePerHour : null,
          description: job.description || "",
        }}
        orgName={job.orgName || orgName}
        submitLabel="Save changes"
        loading={saving}
        error={error}
        onSubmit={onSubmit}
        onCancel={() => navigation.goBack()}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: {
    paddingBottom: 40, // breathing room for smaller screens
    backgroundColor: "#fff",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  error: { color: "#b91c1c", fontWeight: "800", textAlign: "center" },
  h1: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "#fff",
  },
});