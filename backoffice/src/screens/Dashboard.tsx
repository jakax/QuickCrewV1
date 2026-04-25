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
            <div className="fw900">Workers</div>
            <div className="muted mt6">
              Review workers, approve/reject, suspend/enable accounts, assign skills.
            </div>
            <button className="btn btnPrimary mt12" onClick={() => nav("/users/workers")}>
              Open Workers
            </button>
          </div>
        </div>

        <div className="card">
          <div className="cardBody">
            <div className="fw900">Employers</div>
            <div className="muted mt6">
              Review employers, approve/reject, suspend/enable accounts, assign skills.
            </div>
            <button className="btn btnPrimary mt12" onClick={() => nav("/users/employers")}>
              Open Employers
            </button>
          </div>
        </div>

        <div className="card">
          <div className="cardBody">
            <div className="fw900">Organizations</div>
            <div className="muted mt6">
              Manage organizations and per-company role rates.
            </div>
            <button className="btn btnPrimary mt12" onClick={() => nav("/organizations")}>
              Open Organizations
            </button>
          </div>
        </div>

        <div className="card">
          <div className="cardBody">
            <div className="fw900">Skills Catalog</div>
            <div className="muted mt6">
              Add/edit/deactivate skills used for worker eligibility and job visibility.
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