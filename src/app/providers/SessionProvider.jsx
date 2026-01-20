import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        setError(null);
        setAuthUser(user);
        setProfile(null);

        if (!user) {
          setLoading(false);
          return;
        }

        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setError("User profile not found.");
          setLoading(false);
          return;
        }

        setProfile({ id: snap.id, ...snap.data() });
        setLoading(false);
      } catch (e) {
        setError(e?.message || "Session error");
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo(() => ({
    loading,
    error,
    authUser,
    uid: authUser?.uid ?? null,
    profile,
    role: profile?.role ?? null,
    orgId: profile?.orgId ?? null,
    orgName: profile?.orgName ?? null,
    memberRole: profile?.memberRole ?? null,
    isEmployer: profile?.role === "employer",
    isWorker: profile?.role === "worker",
  }), [loading, error, authUser, profile]);

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}