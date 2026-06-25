import React, { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { Animated, FlatList, View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedHeader from "../../components/jobs/AnimatedHeader.jsx";
import JobsItem from "../../components/jobs/JobsItem.jsx";
import { getShiftStartMs } from "../../../utils/jobFormatters";

import { useSession } from "../../providers/SessionProvider";

import { db } from "../../../services/firebase/config";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where, limit } from "firebase/firestore";

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

function normalizeSkill(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

function hasAnySkillOverlap(workerSkills = [], requiredSkills = []) {
  const w = new Set((workerSkills || []).map(normalizeSkill).filter(Boolean));
  const r = (requiredSkills || []).map(normalizeSkill).filter(Boolean);
  if (r.length === 0) return true; // no requirement → open to all
  for (const skill of r) {
    if (w.has(skill)) return true;
  }
  return false;
}

const JobsList = () => {
  const scrollY = useRef(new Animated.Value(0)).current;
  const { uid } = useSession();

  const [jobs, setJobs] = useState([]);

  const [userDoc, setUserDoc] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState(null);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      try {
        setUserError(null);
        setUserLoading(true);

        if (!uid) throw new Error("Missing session.");

        const ref = doc(db, "users", uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("User profile not found.");

        if (mounted) setUserDoc({ id: snap.id, ...snap.data() });
      } catch (e) {
        if (mounted) setUserError(e?.message || "Could not load user profile.");
      } finally {
        if (mounted) setUserLoading(false);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, [uid]);

  const [appliedJobIds, setAppliedJobIds] = useState(new Set());

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "applications"),
      where("workerUid", "==", uid),
      where("status", "in", ["pending", "accepted"])
    );

    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set(snap.docs.map((d) => d.data().jobId).filter(Boolean));
      console.log("appliedJobIds", [...ids]);
      setAppliedJobIds(ids);
    });

    return () => unsub();
  }, [uid]);

  useEffect(() => {
    // Only show jobs that are truly available in the pool
    const q = query(
      collection(db, "jobs"),
      where("status", "==", "open"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setJobs(next);
      },
      (err) => {
        console.error("Error subscribing jobs:", err);
      }
    );

    return () => unsub();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (!uid) return;
      const ref = doc(db, "users", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setUserDoc({ id: snap.id, ...snap.data() });
    } catch (e) {
      setUserError(e?.message || "Could not refresh.");
    } finally {
      setRefreshing(false);
    }
  }, [uid]);

  const filteredJobs = useMemo(() => {
    if (!jobs || jobs.length === 0) return [];
    if (userLoading || userError || !userDoc) return jobs;

    const now = new Date();
    const workerSkills = Array.isArray(userDoc.skills) ? userDoc.skills : [];

    return jobs.filter((job) => {
      // 1. Already applied
      if (appliedJobIds.has(job.id)) return false;

      // 2. Shift already started or no date → hide
      const shiftStart = job.shiftStartAt?.toDate?.();
      if (!shiftStart || shiftStart < now) return false;

      // 3. Skill overlap
      const requiredSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills : [];
      return hasAnySkillOverlap(workerSkills, requiredSkills);
    }).sort((a, b) => getShiftStartMs(a) - getShiftStartMs(b));
  }, [jobs, userLoading, userError, userDoc, appliedJobIds]);

  const showInactiveBanner = userDoc?.isActive === false;
  const showNotApprovedBanner =
    !showInactiveBanner && String(userDoc?.approvalStatus || "").toUpperCase() !== "APPROVED";

  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#8BE8F1"]}
      locations={[0, 0.45, 1]}
      style={styles.screen}
    >
      <AnimatedHeader scrollY={scrollY} />

      {userLoading ? (
        <View style={styles.banner}>
          <ActivityIndicator />
        </View>
      ) : userError ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{userError}</Text>
        </View>
      ) : showInactiveBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Your account is inactive.</Text>
          <Text style={styles.bannerText}>
            For joining shifts your profile must be approved by QuickCrew. Please make sure you have submitted all your documentation.
          </Text>
        </View>
      ) : showNotApprovedBanner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Profile not approved yet.</Text>
          <Text style={styles.bannerText}>
            Your profile is under review. Once approved, you will be able to join shifts
          </Text>
        </View>
      ) : null}

      <AnimatedFlatList
        data={filteredJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <JobsItem job={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
    </LinearGradient>
  );
};

export default JobsList;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  banner: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },

  bannerTitle: {
    fontWeight: "900",
    fontSize: 14,
    marginBottom: 4,
    color: "#2F2F2F",
  },

  bannerText: {
    fontWeight: "700",
    fontSize: 13,
    color: "#4F4F4F",
  },

  listContent: {
    paddingBottom: 110,
    paddingHorizontal: 10,
    paddingTop: 4,
  },
});