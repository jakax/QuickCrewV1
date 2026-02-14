import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <div className="page">
      <div className="row">
        <h1 className="h1">Dashboard</h1>
      </div>

      <div className="mt16">
        Logged in as <b>{user?.email || user?.uid}</b>
      </div>

      <div className="grid mt18">
        <div className="card">
          <div className="cardBody">
            <div style={{ fontWeight: 900 }}>Users</div>
            <div className="muted mt6">
              Review workers, approve/reject, suspend/disable accounts.
            </div>
            <button className="btn btnPrimary mt12" onClick={() => nav("/users/workers")}>
              Open Workers
            </button>
          </div>
        </div>

        <div className="card">
          <div className="cardBody">
            <div style={{ fontWeight: 900 }}>Catalog</div>
            <div className="muted mt6">
              Manage skills and role rates used across the platform.
            </div>
            <button className="btn btnPrimary mt12" onClick={() => nav("/catalog/skills")}>
              Open Skills
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}