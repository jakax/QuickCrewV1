import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../services/firebase/config";

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      setError(null);
      setAuthUser(user);
      setProfile(null);

      // cleanup previous profile listener
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const userRef = doc(db, "users", user.uid);

      unsubProfile = onSnapshot(
        userRef,
        (snap) => {
          if (!snap.exists()) {
            setProfile(null);
            setError("User profile not found.");
            setLoading(false);
            return;
          }

          setProfile({ id: snap.id, ...snap.data() });
          setLoading(false);
        },
        (e) => {
          setProfile(null);
          setError(e?.message || "Session error");
          setLoading(false);
        }
      );
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubAuth();
    };
  }, []);

  const value = useMemo(
    () => ({
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
      approvalStatus:
        profile?.approvalStatus || (profile?.role === "employer" ? "pending" : null),
    }),
    [loading, error, authUser, profile]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}