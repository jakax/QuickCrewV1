import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Pressable,
} from "react-native";
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

function statusLabel(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "ACCEPTED") return "Accepted";
  if (s === "REJECTED") return "Rejected";
  if (s === "WITHDRAWN") return "Withdrawn";
  return "Applied";
}

function statusStyle(statusRaw) {
  const s = String(statusRaw || "").toUpperCase();
  if (s === "ACCEPTED") return styles.pillAccepted;
  if (s === "REJECTED") return styles.pillRejected;
  if (s === "WITHDRAWN") return styles.pillWithdrawn;
  return styles.pillApplied;
}

export default function Applied() {
  const navigation = useNavigation();
  const { uid } = useSession();
  const confirm = useConfirm();

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
      where("workerId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
        where("workerId", "==", uid),
        orderBy("createdAt", "desc")
      );

      const snap = await getDocs(q);
      const next = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
    const appStatus = String(app?.status || "").toUpperCase();
    if (appStatus !== "APPLIED") return false;

    const startAt = asDateMaybe(app?.shiftStartAt);
    if (!startAt) return false;

    const diff = startAt.getTime() - Date.now();
    return diff >= HOURS_8_MS;
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

        const appStatus = String(appData.status || "").toUpperCase();
        if (appStatus !== "APPLIED") throw new Error("You can only cancel an active application.");

        const jobSnap = await tx.get(jobRef);
        if (!jobSnap.exists()) throw new Error("Job not found.");

        const jobData = jobSnap.data();

        // Only in auto-assign mode
        const approvalRequired = jobData?.businessApprovalRequired === true;
        if (approvalRequired) {
          throw new Error("This shift requires business approval and can’t be cancelled in this flow.");
        }

        const startAt = asDateMaybe(jobData?.shiftStartAt);
        if (!startAt) throw new Error("Shift start time missing.");

        const diff = startAt.getTime() - Date.now();
        if (diff < HOURS_8_MS) {
          throw new Error("You can only cancel at least 8 hours before the shift starts.");
        }

        // Remove application
        tx.delete(appRef);

        // Re-open job so it instantly returns to the pool
        const jobStatus = String(jobData?.status || "").toLowerCase();
        if (jobStatus === "pending") {
          tx.update(jobRef, {
            status: "open",
            updatedAt: serverTimestamp(),
          });
        }
      });
    } catch (e) {
      // Reuse confirm modal as an error modal (non-destructive)
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

  const renderItem = ({ item }) => {
    const when =
      formatDateTime(item.shiftStartAt) ||
      (item.shiftDate && item.shiftTime ? `${item.shiftDate} - ${item.shiftTime}` : null);

    const cancellable = isCancellableUI(item);

    return (
      <View style={styles.card}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => openJob(item.jobId)}>
          <View style={styles.cardTopRow}>
            <Text style={styles.title} numberOfLines={1}>
              {item.jobTitle || "Shift"}
            </Text>

            <View style={[styles.pill, statusStyle(item.status)]}>
              <Text style={styles.pillText}>{statusLabel(item.status)}</Text>
            </View>
          </View>

          {item.orgName ? <Text style={styles.org}>{item.orgName}</Text> : null}
          {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
          {when ? <Text style={styles.meta}>{when}</Text> : null}

          {typeof item.ratePerHour === "number" ? (
            <Text style={styles.rate}>{`$${Number(item.ratePerHour).toFixed(2)} / hour`}</Text>
          ) : null}
        </TouchableOpacity>

        {cancellable ? (
          <Pressable
            onPress={() => cancelApplication(item)}
            style={({ pressed }) => [
              styles.cancelBtn,
              pressed && { opacity: 0.9 },
              cancelLoadingId === item.id && { opacity: 0.6 },
            ]}
            disabled={cancelLoadingId === item.id}
          >
            <Text style={styles.cancelBtnText}>
              {cancelLoadingId === item.id ? "Cancelling..." : "Cancel shift"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading applied jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.h1}>Applied</Text>

      {loadError ? <Text style={styles.errorBox}>{loadError}</Text> : null}

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No applications yet</Text>
          <Text style={styles.emptySubtitle}>Apply to a shift and it will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },

  h1: {
    fontSize: 20,
    fontWeight: "900",
    color: "#111827",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: "#fff",
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  title: { flex: 1, fontSize: 16, fontWeight: "900", color: "#111827" },
  org: { marginTop: 6, fontSize: 14, fontWeight: "800", color: "#111827" },
  meta: { marginTop: 6, fontSize: 13, fontWeight: "700", color: "#374151" },
  rate: { marginTop: 8, fontSize: 13, fontWeight: "900", color: "#111827" },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: "900" },

  pillApplied: { backgroundColor: "#DBEAFE", borderColor: "#BFDBFE" },
  pillAccepted: { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" },
  pillRejected: { backgroundColor: "#FEE2E2", borderColor: "#FECACA" },
  pillWithdrawn: { backgroundColor: "#F3F4F6", borderColor: "#E5E7EB" },

  cancelBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  cancelBtnText: { color: "#B91C1C", fontWeight: "900" },

  errorBox: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: "700",
  },

  empty: { paddingHorizontal: 16, paddingTop: 30 },
  emptyTitle: { fontSize: 18, fontWeight: "900", color: "#111827" },
  emptySubtitle: { marginTop: 8, fontSize: 14, fontWeight: "700", color: "#6B7280", lineHeight: 20 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff", padding: 20 },
  loadingText: { marginTop: 10, color: "#6B7280", fontWeight: "700" },
});