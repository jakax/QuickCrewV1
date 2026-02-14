import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/client";
import { useAuth } from "../providers/AuthProvider";
import { useAdminGate } from "../providers/AdminGate";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminGate();

  if (authLoading || adminLoading) {
    return <div className="page">Loading…</div>;
  }

  if (!user) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div className="page">
        <div className="card">
          <div className="cardBody">
            <h2 className="h2">Not authorized</h2>
            <div className="muted mt10">Your account does not have back office access.</div>

            <button
              className="btn mt14"
              onClick={async () => {
                await signOut(auth);
                nav("/login", { replace: true });
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}