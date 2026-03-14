import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  RefreshControl,
  StyleSheet,
  Pressable,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";

import { db } from "../../../services/firebase/config";
import { useSavedJobs } from "../../hooks/useSavedJobs";
import { formatShiftDate } from "../../../utils/jobFormatters";

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default function Saved() {
  const navigation = useNavigation();
  const { loading: savedLoading, savedMap, toggleSaved } = useSavedJobs();

  const savedIds = useMemo(() => Array.from(savedMap.keys()), [savedMap]);

  const [visibleIds, setVisibleIds] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setVisibleIds(savedIds);
  }, [savedIds]);

  const fetchJobsByIds = useCallback(async (ids) => {
    if (!ids.length) return [];

    const jobsRef = collection(db, "jobs");
    const fetched = [];

    for (const idsChunk of chunk(ids, 10)) {
      const q = query(jobsRef, where(documentId(), "in", idsChunk));
      const snap = await getDocs(q);
      snap.forEach((d) => fetched.push({ id: d.id, ...d.data() }));
    }

    const map = new Map(fetched.map((j) => [j.id, j]));
    return ids.map((id) => map.get(id)).filter(Boolean);
  }, []);

  const load = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const list = await fetchJobsByIds(visibleIds);
      setJobs(list);
    } catch (e) {
      console.log("Saved load error:", e);
    } finally {
      setLoadingJobs(false);
    }
  }, [fetchJobsByIds, visibleIds]);

  useEffect(() => {
    if (savedLoading) return;
    load();
  }, [savedLoading, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleUnsave = useCallback(
    async (job) => {
      setVisibleIds((prev) => prev.filter((id) => id !== job.id));
      setJobs((prev) => prev.filter((j) => j.id !== job.id));

      try {
        const orgId = job.orgId ?? savedMap.get(job.id)?.orgId;
        await toggleSaved({ jobId: job.id, orgId });
      } catch (e) {
        console.log("Unsave failed:", e);
        setVisibleIds(savedIds);
      }
    },
    [toggleSaved, savedMap, savedIds]
  );

  const empty = !savedLoading && !loadingJobs && jobs.length === 0;

  const renderSavedCard = ({ item }) => {
    const dateText = formatShiftDate(item?.shiftDate);
    const timeText = item?.shiftTime || "";

    return (
      <Pressable
        onPress={() => navigation.navigate("WorkerJobDetails", { jobId: item.id })}
        style={styles.card}
      >
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleUnsave(item);
          }}
          hitSlop={10}
          style={styles.saveButton}
        >
          <Ionicons name="bookmark" size={20} color="#FFB800" />
        </Pressable>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item?.title || "Untitled job"}</Text>
          <Text style={styles.cardCompany}>{item?.orgName || "Company name"}</Text>

          {item?.location ? (
            <Text style={styles.cardMeta}>{item.location}</Text>
          ) : null}

          {dateText || timeText ? (
            <Text style={styles.cardMeta}>
              {dateText}
              {dateText && timeText ? " - " : ""}
              {timeText}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const Header = (
    <View style={styles.header}>

      <Text style={styles.title}>Saved Job</Text>

      <Text style={styles.subtitle}>
        Only saved jobs are shown here. This does not mean you have applied to all of them.
        Check your active shifts in the Applied tab.
      </Text>
    </View>
  );

  if (empty) {
    return (
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF", "#8CE8F1"]}
        locations={[0, 0.52, 1]}
        style={styles.screen}
      >
        <View style={styles.emptyWrap}>
          {Header}
          <View style={styles.emptyCard}>
            <Text style={styles.subtitle}>
              No saved jobs yet. Tap the bookmark on a job to save it for later.
            </Text>
          </View>
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
        data={jobs}
        keyExtractor={(item) => item.id}
        renderItem={renderSavedCard}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
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
    gap: 15,
  },

  header: {
    marginBottom: 28,
  },

  backButton: {
    alignSelf: "flex-start",
    padding: 8,
    marginBottom: 14,
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
    marginBottom: 18,
    paddingHorizontal: 10,
  },

  subtitle: {
    color: "#FFB800",
    fontSize: 13,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
    lineHeight: 20,
  },

  card: {
    alignSelf: "stretch",
    padding: 12,
    position: "relative",
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E3E1E1",
    overflow: "hidden",
    marginBottom: 15,
  },

  cardContent: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },

  cardTitle: {
    color: "#434343",
    fontSize: 15,
    fontFamily: "Inter",
    fontWeight: "500",
  },

  cardCompany: {
    color: "#434343",
    fontSize: 14,
    fontFamily: "Inter",
    fontWeight: "500",
  },

  cardMeta: {
    color: "#434343",
    fontSize: 14,
    fontFamily: "Inter",
    fontStyle: "italic",
    fontWeight: "300",
  },

  saveButton: {
    position: "absolute",
    top: 15,
    right: 12,
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },

  emptyWrap: {
    flex: 1,
    paddingTop: 75,
    paddingBottom: 110,
    paddingHorizontal: 20,
  },

  emptyCard: {
    marginTop: 8,
    padding: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E3E1E1",
    backgroundColor: "#FFFFFF",
  },

  emptyText: {
    textAlign: "center",
    color: "#434343",
    fontSize: 14,
    fontFamily: "Inter",
    lineHeight: 22,
  },
});