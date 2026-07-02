import React, { useCallback, useRef, useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";

import AnimatedHeader from "../../components/jobs/AnimatedHeader.jsx";
import JobsItem from "../../components/jobs/JobsItem";
import { useSession } from "../../providers/SessionProvider";
import { listJobsByOrg } from "../../../services/jobs.service";
import { db } from "../../../services/firebase/config";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getShiftStartMs } from "../../../utils/jobFormatters";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

export default function EmployerJobsHome({ navigation }) {
  const scrollY = useRef(new Animated.Value(0)).current;
  const { orgId, approvalStatus, profile } = useSession();

  const [jobs, setJobs] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isApproved = approvalStatus === "approved";

  const isBlocked = approvalStatus === "suspended" || approvalStatus === "rejected";

  const lastStatusReason = useMemo(() => {
    const history = Array.isArray(profile?.statusHistory) ? profile.statusHistory : [];
    const last = [...history].reverse().find(
      (h) => h?.to === approvalStatus && h?.reason
    );
    return last?.reason || null;
  }, [profile?.statusHistory, approvalStatus]);

  const hasPendingForJob = async (jobId) => {
    const q = query(
      collection(db, "applications"),
      where("jobId", "==", jobId),
      where("status", "==", "pending"),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  };

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);

      const data = await listJobsByOrg({ orgId });

      const enriched = await Promise.all(
        (data || []).map(async (j) => {
          try {
            const status = String(j?.status || "").toLowerCase();
            const cancelled = status === "cancel" || status === "cancelled";
            const filled = status === "filled";

            if (filled || cancelled) return { ...j, hasPendingApplicants: false };

            const pending = await hasPendingForJob(j.id);
            return { ...j, hasPendingApplicants: pending };
          } catch (e) {
            console.log("hasPendingForJob error:", e);
            return { ...j, hasPendingApplicants: false };
          }
        })
      );

      enriched.sort((a, b) => {
        const aStatus = String(a?.status || "").toLowerCase();
        const bStatus = String(b?.status || "").toLowerCase();

        const isInactive = (s) =>
          s === "cancel" || s === "cancelled" || s === "finished" || s === "complete" || s === "completed";

        const isExpired = (job) => {
          const startMs = getShiftStartMs(job);
          return Number.isFinite(startMs) && startMs < Date.now();
        };

        const getGroup = (job, status) => {
          if (isInactive(status)) return 3;
          if (isExpired(job)) return 2;
          return 1;
        };

        const aGroup = getGroup(a, aStatus);
        const bGroup = getGroup(b, bStatus);

        if (aGroup !== bGroup) return aGroup - bGroup;

        const aStart = getShiftStartMs(a);
        const bStart = getShiftStartMs(b);

        if (aGroup === 1) return aStart - bStart;
        return bStart - aStart;
      });

      setJobs(enriched);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setError(e?.message || "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useFocusEffect(
    useCallback(() => {
      if (!orgId) return;
      if (!isApproved) return;
      load();
    }, [orgId, load, isApproved])
  );

  const onCreateJob = () => navigation.navigate("CreateJob");

  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#8BE8F1"]}
      locations={[0, 0.45, 1]}
      style={styles.screen}
    >
      <AnimatedHeader scrollY={scrollY} />

      {approvalStatus === "pending" ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Pending Approval</Text>
          <Text style={styles.bannerText}>
            Your account is pending approval by QuickCrew.
          </Text>
        </View>
      ) : null}

      {approvalStatus === "suspended" ? (
        <View style={styles.bannerDanger}>
          <Text style={styles.bannerDangerTitle}>Account suspended</Text>
          <Text style={styles.bannerDangerText}>
            Your account has been suspended. Please contact QuickCrew to resolve this situation.
          </Text>
          {lastStatusReason ? (
            <Text style={styles.bannerDangerReason}>Reason: {lastStatusReason}</Text>
          ) : null}
        </View>
      ) : null}

      {approvalStatus === "rejected" ? (
        <View style={styles.bannerDanger}>
          <Text style={styles.bannerDangerTitle}>Account rejected</Text>
          <Text style={styles.bannerDangerText}>
            Your account has been rejected. Please contact QuickCrew to resolve this situation.
          </Text>
          {lastStatusReason ? (
            <Text style={styles.bannerDangerReason}>Reason: {lastStatusReason}</Text>
          ) : null}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <AnimatedFlatList
        data={isApproved ? jobs : []}
        extraData={refreshKey}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : (
            <Text style={styles.muted}>No jobs yet. Tap + to create your first job.</Text>
          )
        }
        renderItem={({ item }) => (
          <JobsItem job={item} hasPendingApplicantsOverride={item.hasPendingApplicants} />
        )}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      />

      <Pressable
        style={[styles.fab, !isApproved && styles.fabDisabled]}
        onPress={isApproved ? onCreateJob : undefined}
        disabled={!isApproved}
      >
        <View style={styles.plusH} />
        <View style={styles.plusV} />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  banner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
  },

  bannerTitle: {
    fontWeight: "900",
    color: "#92400E",
    marginBottom: 4,
  },

  bannerText: {
    color: "#92400E",
    fontWeight: "600",
    lineHeight: 18,
  },

  error: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginHorizontal: 16,
    marginTop: 8,
    fontSize: 13,
  },

  muted: {
    color: "#6B7280",
    marginTop: 18,
    textAlign: "center",
    paddingHorizontal: 24,
  },

  listContent: {
    paddingTop: 4,
    paddingBottom: 150,
    paddingHorizontal: 10,
  },

  fab: {
    position: "absolute",
    right: 22,
    bottom: Platform.OS === "ios" ? 120 : 110,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#45BF79",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  plusH: {
    position: "absolute",
    width: 22,
    height: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  plusV: {
    position: "absolute",
    width: 3,
    height: 22,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
  },

  fabDisabled: {
    backgroundColor: "#B0B0B0",
  },

  bannerDanger: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },

  bannerDangerTitle: {
    fontWeight: "900",
    color: "#B91C1C",
    marginBottom: 4,
  },

  bannerDangerText: {
    color: "#B91C1C",
    fontWeight: "600",
    lineHeight: 18,
  },

  bannerDangerReason: {
    marginTop: 8,
    color: "#B91C1C",
    fontWeight: "800",
    fontStyle: "italic",
    fontSize: 13,
  },
});