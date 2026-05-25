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
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
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
  updateDoc,
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

function isShiftExpired(app) {
  const endAt = asDateMaybe(app?.shiftEndAt);
  if (endAt) return Date.now() > endAt.getTime();

  // fallback si no hay shiftEndAt
  const startAt = asDateMaybe(app?.shiftStartAt);
  if (startAt) return Date.now() > startAt.getTime();

  return false;
}

function getVisualStatus(app) {
  const raw = String(app?.status || "").toLowerCase();

  if (raw === "job_cancelled") return "Cancelled by employer";
  if (raw === "cancelled") return "Cancelled";
  if (raw === "rejected") return "Rejected";
  if (raw === "accepted") {
    return isShiftExpired(app) ? "Expired" : "Active";
  }
  if (raw === "pending") {
    return isShiftExpired(app) ? "Expired" : "Pending approval";
  }
  if (raw === "completed" || raw === "complete" || raw === "finished") {
    return "Finished";
  }

  return isShiftExpired(app) ? "Expired" : "Pending approval";
}

function canHideApplication(app) {
  const raw = String(app?.status || "").toLowerCase();

  if (raw === "cancelled" || raw === "rejected") return true;

  if (raw === "completed" || raw === "complete" || raw === "finished") return true;

  if (raw === "job_cancelled") return true;

  const startAt = asDateMaybe(app?.shiftStartAt);
  if (startAt && startAt.getTime() < Date.now()) {
    return true;
  }

  return false;
}

function getVisualStatusStyle(label) {
  if (label === "Cancelled") return styles.statusCancelled;
  if (label === "Rejected") return styles.statusRejected;
  if (label === "Expired") return styles.statusExpired;
  if (label === "Pending approval") return styles.statusPending;
  if (label === "Active") return styles.statusActive;
  if (label === "Finished") return styles.statusOngoing;
  if (label === "ON GOING") return styles.statusOngoing;
  if (label === "Cancelled by employer") return styles.statusCancelled;
  return styles.statusPending;
}

export default function Applied() {
  const navigation = useNavigation();
  const { uid } = useSession();
  const confirm = useConfirm();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const [cancelLoadingId, setCancelLoadingId] = useState(null);
  const [hideLoadingId, setHideLoadingId] = useState(null);

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
        where("workerId", "==", uid),
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

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((item) => {
      const title = String(item?.jobTitle || "").toLowerCase();
      const org = String(item?.orgName || "").toLowerCase();
      const location = String(item?.location || "").toLowerCase();
      return title.includes(q) || org.includes(q) || location.includes(q);
    });
  }, [items, search]);

  const openJob = (jobId) => {
    if (!jobId) return;
    navigation.navigate("WorkerJobDetails", { jobId });
  };

  const isCancellableUI = (app) => {
    const appStatus = String(app?.status || "").toUpperCase();
    if (appStatus !== "pending") return false;

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
        if (appStatus !== "pending") throw new Error("You can only cancel an active application.");

        const jobSnap = await tx.get(jobRef);
        if (!jobSnap.exists()) throw new Error("Job not found.");

        const jobData = jobSnap.data();

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

        tx.delete(appRef);

        const jobStatus = String(jobData?.status || "").toLowerCase();
        if (jobStatus === "pending") {
          tx.update(jobRef, {
            status: "open",
            updatedAt: serverTimestamp(),
          });
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

  const hideApplication = async (app) => {
    if (!uid || !app?.id) return;
    if (!canHideApplication(app)) return;

    const ok = await confirm({
      title: "Remove application?",
      message:
        "This will remove the application from your list, but QuickCrew will still keep it for tracking purposes.",
      confirmText: "Remove",
      cancelText: "Cancel",
      destructive: true,
    });

    if (!ok) return;

    try {
      setHideLoadingId(app.id);

      const appRef = doc(db, "applications", app.id);

      await updateDoc(appRef, {
        hiddenByWorker: true,
        hiddenByWorkerAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      await confirm({
        title: "Could not remove",
        message: e?.message || "Something went wrong.",
        confirmText: "OK",
        cancelText: "",
        hideCancel: true,
      });
    } finally {
      setHideLoadingId(null);
    }
  };

  const renderItem = ({ item }) => {
    const when =
      formatDateTime(item.shiftStartAt) ||
      (item.shiftDate && item.shiftTime ? `${item.shiftDate} - ${item.shiftTime}` : null);

    const cancellable = isCancellableUI(item);
    const hideable = canHideApplication(item);
    const visualStatus = getVisualStatus(item);

    return (
      <Pressable
        onPress={() => openJob(item.jobId)}
        style={styles.card}
      >
        <Text style={styles.cardTitle}>{item.jobTitle || "Shift"}</Text>
        <Text style={styles.cardCompany}>{item.orgName || "Company name"}</Text>
        {item.location ? <Text style={styles.cardMeta}>{item.location}</Text> : null}
        {when ? <Text style={styles.cardMeta}>{when}</Text> : null}

        <Text style={[styles.statusText, getVisualStatusStyle(visualStatus)]}>
          {visualStatus}
        </Text>

        {hideable ? (
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              hideApplication(item);
            }}
            style={styles.binButton}
            disabled={hideLoadingId === item.id}
            hitSlop={10}
          >
            <Ionicons
              name={hideLoadingId === item.id ? "hourglass-outline" : "trash-outline"}
              size={18}
              color="#C0C0C0"
            />
          </Pressable>
        ) : null}
      </Pressable>
    );
  };

  const Header = (
    <View style={styles.header}>

      <Text style={styles.title}>My shifts</Text>

      <Text style={styles.subtitle}>
        Here you can view all the shifts you’ve joined, including pending approval, confirmed, rejected, completed, and cancelled shifts.
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
      {filteredItems.length === 0 ? (
        <FlatList
          data={[]}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ListHeaderComponent={Header}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },

  listContent: {
    paddingTop: 75,
    paddingBottom: 110,
    paddingHorizontal: 20,
  },

  header: {
    marginBottom: 28,
  },

  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 20,
  },

  backButtonText: {
    color: "#A7A4A4",
    fontSize: 34,
    lineHeight: 34,
    fontFamily: "Inter",
    fontWeight: "600",
  },

  title: {
    color: "#2A5FB3",
    fontSize: 24,
    fontFamily: "Inter",
    fontWeight: "500",
    marginBottom: 22,
    paddingHorizontal: 10,
  },

  searchWrap: {
    paddingHorizontal: 10,
    marginBottom: 22,
  },

  searchInner: {
    minHeight: 38,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#828282",
    paddingLeft: 17,
    paddingRight: 17,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  searchInput: {
    flex: 1,
    color: "#716C6C",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "300",
    paddingRight: 10,
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

  statusCancelled: {
    color: "#FF0404",
  },

  statusRejected: {
    color: "#B91C1C",
  },

  statusExpired: {
    color: "#111827",
  },

  statusPending: {
    color: "#6568AC",
  },

  statusActive: {
    color: "#FFB800",
  },

  statusOngoing: {
    color: "#5BB70B",
  },

  binButton: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },

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

  empty: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#111827",
  },

  emptySubtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
    lineHeight: 20,
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  loadingText: {
    marginTop: 10,
    color: "#6B7280",
    fontWeight: "700",
  },
});