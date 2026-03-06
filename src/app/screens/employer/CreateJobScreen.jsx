import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSession } from "../../providers/SessionProvider";
import { createJob } from "../../../services/jobs.service";
import JobForm from "../../components/jobs/JobForm";
import { db } from "../../../services/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { OuterWrapper, InnerWrapper } from "../../components/layout/ScreenScrollKeyboard";

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

        const ref = collection(db, "organizations", orgId, "roleRates");
        const snap = await getDocs(ref);

        const cleaned = {};
        snap.forEach((docSnap) => {
          const data = docSnap.data() || {};

          // source of truth: doc id is the skill name (barista/bartender/...)
          const key = String(docSnap.id || "").trim().toLowerCase();

          // support both shapes to avoid breaking existing data
          const rawRate =
            data.ratePerHour != null ? data.ratePerHour :
            data.rate != null ? data.rate :
            null;

          const rate = typeof rawRate === "number"
            ? rawRate
            : Number(String(rawRate ?? "").replace(",", "."));

          // optional isActive gate (only if field exists)
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
    <OuterWrapper style={styles.screen}>
      <InnerWrapper contentContainerStyle={styles.content}>
        <>
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
              shiftStartTime: "",
              shiftEndTime: "",
              shiftTime: "",
              businessApprovalRequired: true,
              ratePerHour: null,
              description: "",
            }}
            orgName={orgName}
            roleRates={roleRates}
            submitLabel="Create shift"
            loading={loading}
            disabled={orgLoading}
            error={error}
            onSubmit={onSubmit}
            onCancel={() => navigation.goBack()}
          />
        </>
      </InnerWrapper>
    </OuterWrapper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  content: {
    paddingBottom: 40, // breathing room for smaller screens
    backgroundColor: "#fff",
  },

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