import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/client";
import { useAuth } from "../providers/AuthProvider";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div style={{ fontFamily: "system-ui", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Back Office</h1>
        <button
          onClick={() => signOut(auth)}
          style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "white", fontWeight: 800 }}
        >
          Sign out
        </button>
      </div>

      <div style={{ marginTop: 16, color: "#374151" }}>
        Logged in as <b>{user?.email || user?.uid}</b>
      </div>

      <div style={{ marginTop: 18, border: "1px solid #e5e7eb", borderRadius: 12, padding: 14 }}>
        <b>Next:</b> User Approvals (Phase B1)
        <div style={{ marginTop: 8, color: "#6b7280" }}>
          We’ll build a table of users pending approval and actions to approve/reject.
        </div>
      </div>
    </div>
  );
}