import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOrganizations, OrgRow } from "../../services/organizations.service";

export default function OrganizationsListScreen() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<OrgRow[]>([]);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listOrganizations();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Could not load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter((o) => {
    const term = q.trim().toLowerCase();
    if (!term) return true;
    const name = String(o.name || "").toLowerCase();
    const legal = String(o.legalName || "").toLowerCase();
    const id = String(o.id || "").toLowerCase();
    return name.includes(term) || legal.includes(term) || id.includes(term);
  });

  return (
    <div className="page">
      <div className="row">
        <h1 className="h1">Organizations</h1>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="muted mt6">Manage employer organizations. Rates live per organization.</div>

      <div className="card mt18">
        <div className="cardBody">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <input
              className="input"
              placeholder="Search by name / legal name / id..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ width: 360 }}
            />
            <div className="muted" style={{ fontWeight: 800 }}>
              {loading ? "Loading…" : `${filtered.length} orgs`}
            </div>
          </div>

          {error ? <div className="error mt12">{error}</div> : null}

          {!loading && filtered.length === 0 ? (
            <div className="muted mt16">No organizations found.</div>
          ) : null}

          <div className="mt16" style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Name</th>
                  <th style={{ textAlign: "left" }}>Legal</th>
                  <th style={{ textAlign: "left" }}>Industry</th>
                  <th style={{ textAlign: "left" }}>Location</th>
                  <th style={{ width: 160 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 900 }}>{o.name || "—"}</td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      {o.legalName || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      {o.industry || "—"}
                    </td>
                    <td className="muted" style={{ fontWeight: 800 }}>
                      {[o.city, o.country].filter(Boolean).join(", ") || "—"}
                    </td>
                    <td>
                      <button className="btn btnPrimary" onClick={() => nav(`/organizations/${o.id}`)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="muted mt10" style={{ fontSize: 12, fontWeight: 800 }}>
              Next: add “Create org” later if QuickCrew needs it. For now orgs are created by your app flow.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}