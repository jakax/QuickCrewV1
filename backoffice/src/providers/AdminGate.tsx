import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/client";
import { useAuth } from "./AuthProvider";

type AdminState = {
  isAdmin: boolean;
  loading: boolean;
};

const Ctx = createContext<AdminState>({ isAdmin: false, loading: true });

export function AdminGateProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function run() {
      if (authLoading) return;

      // Not logged in => not admin (but gate will redirect elsewhere)
      if (!user?.uid) {
        if (mounted) {
          setIsAdmin(false);
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const ref = doc(db, "adminUsers", user.uid);
        const snap = await getDoc(ref);
        if (mounted) setIsAdmin(snap.exists());
      } catch {
        if (mounted) setIsAdmin(false);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [user?.uid, authLoading, user]);

  const value = useMemo(() => ({ isAdmin, loading }), [isAdmin, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminGate() {
  return useContext(Ctx);
}