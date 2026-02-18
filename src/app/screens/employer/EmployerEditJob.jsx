import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useSession } from "../../providers/SessionProvider";
import { getJobById, updateJob } from "../../../services/jobs.service";
import JobForm from "../../components/jobs/JobForm";

import { db } from "../../../services/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";

function parseShiftTimeLegacy(shiftTimeRaw) {
  if (!shiftTimeRaw || typeof shiftTimeRaw !== "string") return { start: "", end: "" };
  const normalized = shiftTimeRaw.replace(/\s+/g, " ").trim();
  const parts = normalized.split(/ to /i);
  if (parts.length !== 2) return { start: "", end: "" };
  return { start: parts[0].trim(), end: parts[1].trim() };
}

function normKey(v) {
  return String(v || "").trim().toLowerCase();
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

  const [roleRates, setRoleRates] = useState({});
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(null);

  // Load job
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

  // Load org roleRates (from subcollection)
  useEffect(() => {
    let mounted = true;

    const loadRoleRates = async () => {
      try {
        setOrgError(null);
        setOrgLoading(true);

        if (!orgId) throw new Error("Missing orgId (session).");

        const q = query(
          collection(db, "organizations", orgId, "roleRates"),
          where("isActive", "==", true)
        );

        const snap = await getDocs(q);

        const cleaned = {};
        snap.forEach((d) => {
          const data = d.data() || {};
          const key = normKey(data.roleKey || d.id);
          const rate = data.ratePerHour;

          if (key && typeof rate === "number" && Number.isFinite(rate)) {
            cleaned[key] = rate;
          }
        });

        if (mounted) setRoleRates(cleaned);
      } catch (e) {
        if (mounted) setOrgError(e?.message || "Could not load company rates.");
        if (mounted) setRoleRates({});
      } finally {
        if (mounted) setOrgLoading(false);
      }
    };

    loadRoleRates();
    return () => {
      mounted = false;
    };
  }, [orgId]);

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
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.h1}>Edit shift</Text>

        {orgLoading ? (
          <Text style={styles.hint}>Loading company rates…</Text>
        ) : orgError ? (
          <Text style={styles.hintError}>{orgError}</Text>
        ) : null}

        <JobForm
          mode="edit"
          initialValues={{
            title: job.title || "",
            location: job.location || "",
            shiftDate: job.shiftDate || "",

            shiftStartTime: job.shiftStartTime || legacy.start,
            shiftEndTime: job.shiftEndTime || legacy.end,
            shiftTime: job.shiftTime || "",

            // Rate will be forced by JobForm from roleRates + primaryRoleKey,
            // but we keep this for display fallback.
            ratePerHour: typeof job.ratePerHour === "number" ? job.ratePerHour : null,

            showRate: job?.showRate !== false,

            primaryRoleKey: normKey(job?.primaryRoleKey || ""),
            requiredSkills: Array.isArray(job?.requiredSkills) ? job.requiredSkills.map(normKey) : [],

            description: job.description || "",
            businessApprovalRequired: job?.businessApprovalRequired !== false,
          }}
          orgName={job.orgName || orgName}
          roleRates={roleRates}
          submitLabel="Save changes"
          loading={saving}
          error={error}
          onSubmit={onSubmit}
          onCancel={() => navigation.goBack()}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: {
    paddingBottom: 40,
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

  hint: {
    paddingHorizontal: 16,
    paddingTop: 8,
    color: "#6B7280",
    fontWeight: "700",
  },
  hintError: {
    paddingHorizontal: 16,
    paddingTop: 8,
    color: "#b91c1c",
    fontWeight: "800",
  },
});