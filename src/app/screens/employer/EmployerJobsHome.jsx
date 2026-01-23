import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Platform } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSession } from "../../providers/SessionProvider";
import { listJobsByOrg } from "../../../services/jobs.service";
import JobsItem from "../../components/jobs/JobsItem";


export default function EmployerJobsHome({ navigation }) {
  const { orgId } = useSession();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { approvalStatus } = useSession();

  {approvalStatus === "pending" ? (
    <View style={styles.banner}>
      <Text style={styles.bannerTitle}>Pending approval</Text>
      <Text style={styles.bannerText}>
        Your account is pending approval by QuickCrew. You can browse for now.
      </Text>
    </View>
  ) : null}

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listJobsByOrg({ orgId });
      setJobs(data);
    } catch (e) {
      setError(e?.message || "Could not load jobs.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // Reload every time this tab/screen becomes active
  useFocusEffect(
    useCallback(() => {
      if (!orgId) return;
      load();
    }, [orgId, load])
  );

  const onCreateJob = () => navigation.navigate("CreateJob");

  return (
    <View style={styles.root}>
      {/* Search row (placeholder for later) */}
      <View style={styles.searchRow}>
        <TextInput placeholder="Search jobs..." placeholderTextColor="#9CA3AF" style={styles.searchInput} />
        <Pressable style={styles.filterBtn} onPress={() => console.log("Filter")}>
          <View style={styles.filterIcon} />
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 120 }}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.muted}>Loading…</Text>
          ) : (
            <Text style={styles.muted}>No jobs yet. Tap + to create your first job.</Text>
          )
        }
        renderItem={({ item }) => <JobsItem job={item} />}
      />

      {/* FAB */}
      <Pressable style={styles.fab} onPress={onCreateJob}>
        <View style={styles.plusH} />
        <View style={styles.plusV} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff", padding: 16 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 12,
    color: "#111827",
    backgroundColor: "#fff",
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  filterIcon: { width: 18, height: 12, borderWidth: 2, borderColor: "#111827", borderRadius: 2 },

  error: {
    backgroundColor: "#FEF2F2",
    color: "#B91C1C",
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    fontSize: 13,
  },
  muted: { color: "#6B7280", marginTop: 18, textAlign: "center" },

  card: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
  cardSub: { marginTop: 6, color: "#6B7280" },
  cardMeta: { marginTop: 8, color: "#9CA3AF", fontSize: 12 },

  fab: {
    position: "absolute",
    right: 18,
    bottom: Platform.OS === "ios" ? 92 : 82,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  plusH: { position: "absolute", width: 22, height: 3, borderRadius: 2, backgroundColor: "white" },
  plusV: { position: "absolute", width: 3, height: 22, borderRadius: 2, backgroundColor: "white" },

  tag: {
    alignSelf: "flex-start",
    backgroundColor: "#DBEAFE",
    color: "#1D4ED8",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  company: { marginTop: 6, color: "#111827", fontWeight: "600" },
  location: { marginTop: 4, color: "#6B7280" },
  shiftLine: { marginTop: 8, color: "#374151" },
  rate: { marginTop: 8, color: "#111827", fontWeight: "700" },
  posted: { marginTop: 10, color: "#9CA3AF", fontSize: 12 },

  banner: {
  margin: 16,
  padding: 14,
  borderRadius: 14,
  backgroundColor: "#FFFBEB",
  borderWidth: 1,
  borderColor: "#FDE68A",
},
  bannerTitle: { fontWeight: "900", color: "#92400E", marginBottom: 4 },
  bannerText: { color: "#92400E", fontWeight: "600", lineHeight: 18 },
});