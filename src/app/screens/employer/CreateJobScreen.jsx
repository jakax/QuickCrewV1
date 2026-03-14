import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  Pressable,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";

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
          const key = String(docSnap.id || "").trim().toLowerCase();

          const rawRate =
            data.ratePerHour != null
              ? data.ratePerHour
              : data.rate != null
              ? data.rate
              : null;

          const rate =
            typeof rawRate === "number"
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
      setLoading(true);

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
                <Text style={styles.h1}>Create shift</Text>
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
    paddingBottom: 110,
    backgroundColor: "transparent",
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
});