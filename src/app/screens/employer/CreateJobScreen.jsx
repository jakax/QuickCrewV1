import React, { useEffect, useState } from "react";
import { 
  Text, 
  StyleSheet, 
  ScrollView, 
  ActivityIndicator, 
  View,
  KeyboardAvoidingView,
  Platform 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSession } from "../../providers/SessionProvider";
import { createJob } from "../../../services/jobs.service";
import JobForm from "../../components/jobs/JobForm";
import { db } from "../../../services/firebase/config";
import { collection, getDocs, query, where } from "firebase/firestore";

export default function CreateJobScreen() {
  const navigation = useNavigation();
  const { uid, orgId, orgName } = useSession();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [roleRates, setRoleRates] = useState({});
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(null);

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
          const key = String(data.roleKey || d.id || "").trim().toLowerCase();
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
      setLoading(true);

      // NOTE:
      // We are intentionally not deriving shiftTime/shiftStartAt here yet,
      // because we need to update JobForm + createJob() service in a controlled way.
      // This screen simply forwards whatever JobForm returns.
      await createJob({
        orgId,
        orgName,
        uid,
        job: values,
      });

      navigation.goBack();
    } catch (e) {
      setError(e?.message || "Could not create job.");
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.h1}>Create shift</Text>
        {orgLoading ? (
          <View style={styles.orgLoadingRow}>
            <ActivityIndicator />
            <Text style={styles.orgLoadingText}>Loading company rates…</Text>
          </View>
        ) : orgError ? (
          <Text style={styles.orgErrorText}>{orgError}</Text>
        ) : null}
        <JobForm
          mode="create"
          initialValues={{
            title: "",
            location: "",
            shiftDate: "",

            // NEW (Sprint 1 prep): split time inputs
            shiftStartTime: "",
            shiftEndTime: "",

            // Keep existing for backward compatibility
            // (we’ll generate it from start/end later in JobForm or the service)
            shiftTime: "",

            businessApprovalRequired: true,

            ratePerHour: null,
            description: "",
          }}
          orgName={orgName}
          roleRates={roleRates}
          submitLabel="Create shift"
          loading={loading}
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

  orgLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  orgLoadingText: {
    color: "#6B7280",
    fontWeight: "700",
  },
  orgErrorText: {
    paddingHorizontal: 16,
    paddingTop: 10,
    color: "#b91c1c",
    fontWeight: "800",
  },
});