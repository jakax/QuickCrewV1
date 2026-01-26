import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, FlatList, Text, RefreshControl } from "react-native";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "../../../services/firebase/config"; // adjust
import { useSavedJobs } from "../../hooks/useSavedJobs";
import JobsItem from "../../components/jobs/JobsItem";

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

export default function Saved({ navigation }) {
  const { loading: savedLoading, savedMap, toggleSaved } = useSavedJobs();

  const savedIds = useMemo(() => Array.from(savedMap.keys()), [savedMap]);

  // local list for instant removal on unsave
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

    // preserve visible order
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
      // optimistic UI
      setVisibleIds((prev) => prev.filter((id) => id !== job.id));
      setJobs((prev) => prev.filter((j) => j.id !== job.id));

      try {
        // orgId can come from job OR savedMap data
        const orgId = job.orgId ?? savedMap.get(job.id)?.orgId;

        await toggleSaved({ jobId: job.id, orgId });
      } catch (e) {
        console.log("Unsave failed:", e);
        // rollback by resyncing from store
        setVisibleIds(savedIds);
      }
    },
    [toggleSaved, savedMap, savedIds]
  );

  const empty = !savedLoading && !loadingJobs && jobs.length === 0;

  if (empty) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
        <Text style={{ textAlign: "center" }}>
          No saved jobs yet. Tap the bookmark on a job to save it for later.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={jobs}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <JobsItem
            job={item}
            forceBookmarked={true}
            onBookmarkPress={handleUnsave}
            onPressOverride={() => navigation.navigate("WorkerJobDetails", { jobId: item.id })}
          />
        )}
      />
    </View>
  );
}