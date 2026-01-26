import { useEffect, useMemo, useState } from "react";
import { saveJob, subscribeSavedJobs, unsaveJob } from "../../services/savedJobs.service";
import { useSession } from "../providers/SessionProvider";

export function useSavedJobs() {
  const { uid } = useSession();
  const [savedMap, setSavedMap] = useState(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) {
      setSavedMap(new Map());
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeSavedJobs(
      uid,
      (map) => {
        setSavedMap(map);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [uid]);

  const isSaved = useMemo(() => {
    return (jobId) => savedMap.has(jobId);
  }, [savedMap]);

  const toggleSaved = async ({ jobId, orgId }) => {
    if (!uid) throw new Error("Not logged in");
    if (!jobId) throw new Error("Missing jobId");

    if (savedMap.has(jobId)) {
      await unsaveJob({ uid, jobId });
    } else {
      await saveJob({ uid, jobId, orgId });
    }
  };

  return { loading, savedMap, isSaved, toggleSaved };
}