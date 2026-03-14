import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

import { useSession } from "../../providers/SessionProvider";
import { getJobById, updateJob, deleteJobIfAllowed } from "../../../services/jobs.service";
import JobForm from "../../components/jobs/JobForm";
import { useConfirm } from "../../providers/ConfirmProvider";

import { db } from "../../../services/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";

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
  const confirm = useConfirm();

  const jobId = route?.params?.jobId;

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  const [roleRates, setRoleRates] = useState({});
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setError(null);
        setLoadingJob(true);

        const data = await getJobById(jobId);

        if (!data) throw new Error("Job not found.");

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

  useEffect(() => {
    let mounted = true;

    const loadRoleRates = async () => {
      try {
        setOrgError(null);
        setOrgLoading(true);

        if (!orgId) throw new Error("Missing orgId (session).");

        const ref = collection(db, "organizations", orgId, "roleRates");
        const snap = await getDocs(ref);

        const cleaned = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const key = normKey(docSnap.id || "");

          const rawRate =
            data.ratePerHour != null ? data.ratePerHour :
            data.rate != null ? data.rate :
            null;

          const rate = typeof rawRate === "number"
            ? rawRate
            : Number(String(rawRate ?? "").replace(",", "."));

          if (data.isActive === false) return;

          if (key && Number.isFinite(rate)) {
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

  const onDelete = async () => {
    const ok = await confirm({
      title: "Delete shift?",
      message:
        "This action cannot be undone. You can only delete a shift that has no worker applications.",
      confirmText: "Delete",
    });

    if (!ok) return;

    try {
      setError(null);
      setDeleting(true);

      await deleteJobIfAllowed({
        jobId,
        expectedOrgId: orgId,
      });

      navigation.goBack();
    } catch (e) {
      setError(e?.message || "Could not delete shift.");
    } finally {
      setDeleting(false);
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
    <OuterWrapper style={styles.screen}>
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF", "#81E6F0"]}
        locations={[0, 0.45, 1]}
        style={styles.screen}
      >
        <InnerWrapper contentContainerStyle={styles.content}>
          <>
            <View style={styles.headerBlock}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={styles.backArrow}>‹</Text>
              </Pressable>

              <View style={styles.headerTitleWrap}>
                <Text style={styles.h1}>Edit shift</Text>
              </View>
            </View>

            {orgLoading ? (
              <View style={styles.infoBanner}>
                <ActivityIndicator />
                <Text style={styles.infoBannerText}>Loading company rates…</Text>
              </View>
            ) : orgError ? (
              <Text style={styles.orgErrorText}>{orgError}</Text>
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
                ratePerHour: typeof job.ratePerHour === "number" ? job.ratePerHour : null,
                showRate: job?.showRate !== false,
                primaryRoleKey: normKey(
                  job?.primaryRoleKey || job?.roleKey || job?.requiredSkills?.[0] || ""
                ),
                requiredSkills: Array.isArray(job?.requiredSkills)
                  ? job.requiredSkills.map(normKey)
                  : [],
                description: job.description || "",
                businessApprovalRequired: job?.businessApprovalRequired !== false,
              }}
              orgName={job.orgName || orgName}
              roleRates={roleRates}
              submitLabel="Save changes"
              loading={saving}
              disabled={orgLoading}
              error={error}
              onSubmit={onSubmit}
              onCancel={() => navigation.goBack()}
            />

            <View style={styles.deleteBlock}>
              <Pressable
                onPress={onDelete}
                disabled={deleting || saving || loadingJob}
                style={({ pressed }) => [
                  styles.deleteButton,
                  (deleting || saving || loadingJob) && styles.deleteButtonDisabled,
                  pressed && !(deleting || saving || loadingJob) && styles.deleteButtonPressed,
                ]}
              >
                <Text style={styles.deleteButtonText}>
                  {deleting ? "Deleting..." : "Delete shift"}
                </Text>
              </Pressable>
            </View>
          </>
        </InnerWrapper>
      </LinearGradient>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingTop: 58,
    paddingBottom: 80,
    backgroundColor: "transparent",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
  },

  error: {
    color: "#B91C1C",
    fontWeight: "800",
    textAlign: "center",
  },

  headerBlock: {
    paddingHorizontal: 12,
    marginBottom: 18,
  },

  backButton: {
    width: 36,
    height: 36,
    alignItems: "flex-start",
    justifyContent: "center",
    marginBottom: 8,
  },

  backArrow: {
    fontSize: 34,
    lineHeight: 34,
    color: "#A7A4A4",
    fontWeight: "400",
  },

  headerTitleWrap: {
    paddingHorizontal: 10,
  },

  h1: {
    fontSize: 24,
    fontWeight: "600",
    color: "#2A5FB3",
  },

  infoBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#FFFFFFCC",
    borderWidth: 1,
    borderColor: "#DCEAF4",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  infoBannerText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "600",
  },

  orgErrorText: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
  },

  deleteBlock: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 26,
    marginTop: -30,
  },

  deleteButton: {
    minHeight: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  deleteButtonPressed: {
    opacity: 0.9,
  },

  deleteButtonDisabled: {
    opacity: 0.6,
  },

  deleteButtonText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 15,
  },
});