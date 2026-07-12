import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase/client";
import { useAuth } from "../providers/AuthProvider";

function SideItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => `sideItem ${isActive ? "sideItemActive" : ""}`}>
      {label}
    </NavLink>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const nav = useNavigate();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand" onClick={() => nav("/")}>
          QuickCrew
          <div className="brandSub">Back Office</div>
        </div>

        <div className="sideSection">Main</div>
        <SideItem to="/" label="Dashboard" />

        <div className="sideSection">Users</div>
        <SideItem to="/users/workers" label="Workers" />
        <SideItem to="/users/employers" label="Employers" />
        <SideItem to="/users/approvals" label="Pending Approvals" />

        <div className="sideSection">Organizations</div>
        <SideItem to="/organizations" label="Organizations" />

        <div className="sideSection">Catalog</div>
        <SideItem to="/catalog/skills" label="Workers Skills" />

        <div className="sideSection">Shifts</div>
        <SideItem to="/shifts" label="Shifts" />

        <div style={{ flex: 1 }} />

        <div className="sideFooter">
          <div className="muted" style={{ fontSize: 12 }}>
            {user?.email || user?.uid}
          </div>

          <button className="btn mt10" onClick={() => signOut(auth)}>
            Sign out
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div className="topbarTitle">QuickCrew Back Office</div>
          <div className="topbarRight">
            <div className="muted">{user?.email || user?.uid}</div>
          </div>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}