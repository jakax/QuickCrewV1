import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../../services/firebase/config";
import { useSession } from "../../providers/SessionProvider";
import { useConfirm } from "../../providers/ConfirmProvider";

const HOURS_8_MS = 8 * 60 * 60 * 1000;
const MINUTES_45 = 45 * 60 * 1000;

const STATUS_PRIORITY = {
  "Upcoming": 0,
  "Ongoing": 1,
  "Pending approval": 2,
  "Completed": 3,
  "Cancelled": 3,
  "Cancelled by employer": 3,
  "Rejected": 3,
  "Expired": 4,
};

// ── Date helpers ──────────────────────────────────────────────────────────────

function asDateMaybe(tsOrDate) {
  if (!tsOrDate) return null;
  if (tsOrDate instanceof Date) return tsOrDate;
  if (tsOrDate instanceof Timestamp) return tsOrDate.toDate();
  if (typeof tsOrDate?.seconds === "number") return new Date(tsOrDate.seconds * 1000);
  return null;
}

function formatDateTime(value) {
  const d = asDateMaybe(value);
  if (!d) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

// ── Status derivation ─────────────────────────────────────────────────────────

/**
 * Derives the display label for an application from the worker's perspective.
 *
 * Status values that come from the BD (applications collection):
 *   pending      → waiting for employer approval
 *   accepted     → employer approved — time-based transitions apply
 *   rejected     → employer rejected
 *   cancelled    → worker cancelled
 *   job_cancelled→ employer cancelled the shift
 *   completed / finished → shift done
 *
 * Transitions for "accepted":
 *   before shiftStartAt - 45min  → Upcoming
 *   at shiftStartAt OR clockIn   → Ongoing
 *   at shiftEndAt   OR clockOut  → Completed
 *
 * @param {object} app - Application document data from Firestore
 * @param {number} now - Date.now()
 * @returns {string}
 */
function deriveApplicationStatus(app, now) {
  const raw = String(app?.status || "").toLowerCase();

  // ── Backend-authoritative ─────────────────────────────────────────────────
  if (raw === "job_cancelled") return "Cancelled by employer";
  if (raw === "cancelled") return "Cancelled";
  if (raw === "rejected") return "Rejected";
  if (raw === "completed" || raw === "complete" || raw === "finished") {
    return "Completed";
  }

  const shiftStart = asDateMaybe(app?.shiftStartAt);
  const shiftEnd = asDateMaybe(app?.shiftEndAt);
  const shiftStartMs = shiftStart ? shiftStart.getTime() : null;
  const shiftEndMs = shiftEnd ? shiftEnd.getTime() : null;

  // clockIn / clockOut are Firestore Timestamps in the application doc
  const clockInTs = app?.workerClockIn;
  const clockOutTs = app?.workerClockOut;
  const clockInMs = clockInTs?.toDate ? clockInTs.toDate().getTime() : null;
  const clockOutMs = clockOutTs?.toDate ? clockOutTs.toDate().getTime() : null;

  // ── Pending ───────────────────────────────────────────────────────────────
  if (raw === "pending") {
    // Window to approve closes at shift start
    if (shiftStartMs && now >= shiftStartMs) return "Expired";
    return "Pending approval";
  }

  // ── Accepted ──────────────────────────────────────────────────────────────
  if (raw === "accepted") {
    // Completed: clockOut event OR shift end time passed
    const completedByClockOut = clockOutMs !== null && now >= clockOutMs;
    const completedByTime = shiftEndMs !== null && now >= shiftEndMs;
    if (completedByClockOut || completedByTime) return "Completed";

    // Ongoing: clockIn event OR shift start time passed
    const ongoingByClockIn = clockInMs !== null && now >= clockInMs;
    const ongoingByTime = shiftStartMs !== null && now >= shiftStartMs;
    if (ongoingByClockIn || ongoingByTime) return "Ongoing";

    // Upcoming: shift hasn't started yet
    return "Upcoming";
  }

  // Fallback
  return "Pending approval";
}

function getStatusStyle(label) {
  if (label === "Cancelled by employer") return styles.statusCancelled;
  if (label === "Cancelled") return styles.statusCancelled;
  if (label === "Rejected") return styles.statusRejected;
  if (label === "Expired") return styles.statusExpired;
  if (label === "Pending approval") return styles.statusPending;
  if (label === "Upcoming") return styles.statusUpcoming;
  if (label === "Ongoing") return styles.statusOngoing;
  if (label === "Completed") return styles.statusCompleted;
  return styles.statusPending;
}

// ── useNow ────────────────────────────────────────────────────────────────────

// Ticks every 60s so time-based status transitions fire automatically
function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Applied() {
  const navigation = useNavigation();
  const { uid } = useSession();
  const confirm = useConfirm();
  const now = useNow();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [cancelLoadingId, setCancelLoadingId] = useState(null);

  const canLoad = useMemo(() => !!uid, [uid]);

  useEffect(() => {
    if (!canLoad) {
      setLoading(false);
      setLoadError("Missing session (uid).");
      return;
    }

    setLoading(true);
    setLoadError(null);

    const q = query(
      collection(db, "applications"),
      // workerUid (not workerId) — must match the exact field name firestore.rules
      // checks (resource.data.workerUid), so Firestore can prove the query is safe.
      where("workerUid", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((item) => item?.hiddenByWorker !== true);
        setItems(next);
        setLoading(false);
      },
      (e) => {
        setLoadError(e?.message || "Could not load applied jobs.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [uid, canLoad]);

  const onRefresh = async () => {
    if (!uid) return;
    try {
      setRefreshing(true);
      setLoadError(null);
      const q = query(
        collection(db, "applications"),
        // workerUid (not workerId) — must match the exact field name firestore.rules
      // checks (resource.data.workerUid), so Firestore can prove the query is safe.
      where("workerUid", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      const next = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((item) => item?.hiddenByWorker !== true);
      setItems(next);
    } catch (e) {
      setLoadError(e?.message || "Could not refresh.");
    } finally {
      setRefreshing(false);
    }
  };

  const openJob = (jobId) => {
    if (!jobId) return;
    navigation.navigate("WorkerJobDetails", { jobId });
  };

  const isCancellableUI = (app) => {
    const appStatus = String(app?.status || "").toLowerCase();
    if (appStatus !== "pending") return false;
    const startAt = asDateMaybe(app?.shiftStartAt);
    if (!startAt) return false;
    return startAt.getTime() - Date.now() >= HOURS_8_MS;
  };

  const cancelApplication = async (app) => {
    const jobId = app?.jobId;
    if (!uid || !jobId) return;

    const ok = await confirm({
      title: "Cancel shift?",
      message:
        "This will cancel your application and return the shift to the jobs pool (only if business approval is NOT required).",
      confirmText: "Yes, cancel",
      cancelText: "No",
      destructive: true,
    });

    if (!ok) return;

    try {
      setCancelLoadingId(app.id);

      const applicationId = `${jobId}_${uid}`;
      const appRef = doc(db, "applications", applicationId);
      const jobRef = doc(db, "jobs", jobId);

      await runTransaction(db, async (tx) => {
        const appSnap = await tx.get(appRef);
        if (!appSnap.exists()) throw new Error("Application not found.");

        const appData = appSnap.data();
        if (appData.workerId !== uid) throw new Error("Not allowed.");

        const appStatus = String(appData.status || "").toLowerCase();
        if (appStatus !== "pending")
          throw new Error("You can only cancel an active application.");

        const jobSnap = await tx.get(jobRef);
        if (!jobSnap.exists()) throw new Error("Job not found.");

        const jobData = jobSnap.data();
        if (jobData?.businessApprovalRequired === true) {
          throw new Error(
            "This shift requires business approval and can't be cancelled in this flow."
          );
        }

        const startAt = asDateMaybe(jobData?.shiftStartAt);
        if (!startAt) throw new Error("Shift start time missing.");

        if (startAt.getTime() - Date.now() < HOURS_8_MS) {
          throw new Error(
            "You can only cancel at least 8 hours before the shift starts."
          );
        }

        tx.delete(appRef);

        const jobStatus = String(jobData?.status || "").toLowerCase();
        if (jobStatus === "pending") {
          tx.update(jobRef, { status: "open", updatedAt: serverTimestamp() });
        }
      });
    } catch (e) {
      await confirm({
        title: "Could not cancel",
        message: e?.message || "Something went wrong.",
        confirmText: "OK",
        cancelText: "",
        destructive: false,
      });
    } finally {
      setCancelLoadingId(null);
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const statusA = deriveApplicationStatus(a, now);
      const statusB = deriveApplicationStatus(b, now);

      const priorityA = STATUS_PRIORITY[statusA] ?? 3;
      const priorityB = STATUS_PRIORITY[statusB] ?? 3;

      // Ordenar por prioridad de estado primero
      if (priorityA !== priorityB) return priorityA - priorityB;

      // Dentro del mismo grupo, ordenar por shiftStartAt más próximo primero
      const dateA = asDateMaybe(a?.shiftStartAt)?.getTime() ?? 0;
      const dateB = asDateMaybe(b?.shiftStartAt)?.getTime() ?? 0;
      return dateA - dateB;
    });
  }, [items, now]);
  // Search filtering can be added here later if needed

  const renderItem = ({ item }) => {
    const when =
      formatDateTime(item.shiftStartAt) ||
      (item.shiftDate && item.shiftTime
        ? `${item.shiftDate} - ${item.shiftTime}`
        : null);

    const cancellable = isCancellableUI(item);
    const visualStatus = deriveApplicationStatus(item, now);

    return (
      <Pressable onPress={() => openJob(item.jobId)} style={styles.card}>
        <Text style={styles.cardTitle}>{item.jobTitle || "Shift"}</Text>
        <Text style={styles.cardCompany}>{item.orgName || "Company name"}</Text>
        {item.location ? (
          <Text style={styles.cardMeta}>{item.location}</Text>
        ) : null}
        {when ? <Text style={styles.cardMeta}>{when}</Text> : null}

        <Text style={[styles.statusText, getStatusStyle(visualStatus)]}>
          {visualStatus}
        </Text>
      </Pressable>
    );
  };

  const Header = (
    <View style={styles.header}>
      <Text style={styles.title}>My shifts</Text>
      <Text style={styles.subtitle}>
        Here you can view all the shifts you've joined, including pending
        approval, confirmed, rejected, completed, and cancelled shifts.
      </Text>
      {loadError ? <Text style={styles.errorBox}>{loadError}</Text> : null}
    </View>
  );

  if (loading) {
    return (
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF", "#8CE8F1"]}
        locations={[0, 0.52, 1]}
        style={styles.screen}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading applied jobs...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={["#FFFFFF", "#FFFFFF", "#8CE8F1"]}
      locations={[0, 0.52, 1]}
      style={styles.screen}
    >
      <FlatList
        data={sortedItems.length === 0 ? [] : sortedItems}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listContent: { paddingTop: 75, paddingBottom: 110, paddingHorizontal: 20 },
  header: { marginBottom: 28 },
  title: {
    color: "#2A5FB3",
    fontSize: 24,
    fontFamily: "Inter",
    fontWeight: "500",
    marginBottom: 22,
    paddingHorizontal: 10,
  },
  subtitle: {
    color: "#898989",
    fontSize: 13,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
    lineHeight: 20,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  card: {
    width: "100%",
    paddingHorizontal: 12,
    paddingVertical: 12,
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E3E1E1",
    overflow: "hidden",
    marginBottom: 15,
  },
  cardTitle: {
    color: "#434343",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "500",
    marginTop: 8,
  },
  cardCompany: {
    color: "#434343",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "500",
    marginTop: 12,
  },
  cardMeta: {
    color: "#434343",
    fontSize: 14,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
    marginTop: 12,
  },
  statusText: {
    position: "absolute",
    top: 16,
    right: 16,
    fontSize: 13,
    fontFamily: "Inter",
    fontWeight: "300",
  },
  statusCancelled: { color: "#FF0404" },
  statusRejected: { color: "#B91C1C" },
  statusExpired: { color: "#111827" },
  statusPending: { color: "#6568AC" },
  statusUpcoming: { color: "#2A5FB3" },
  statusOngoing: { color: "#FFB800" },
  statusCompleted: { color: "#0BCAD5" },
  errorBox: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 10,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: { marginTop: 10, color: "#6B7280", fontWeight: "700" },
});