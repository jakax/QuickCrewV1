import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import { useAdminGate } from "../providers/AdminGate";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/client";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminGate();
  const nav = useNavigate();

  if (authLoading || adminLoading) {
    return <div style={{ padding: 24, fontFamily: "system-ui" }}>Loading…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div style={{ padding: 24, fontFamily: "system-ui" }}>
        <h2>Not authorized</h2>
        <p>Your account does not have back office access.</p>

        <button
          onClick={async () => {
            await signOut(auth);
            nav("/login", { replace: true });
          }}
          style={{
            marginTop: 14,
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #d1d5db",
            background: "white",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    );
  }

  return <>{children}</>;
}