import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useParams, useNavigate } from "react-router-dom";
import { getOrganizationById, OrgRow } from "../../services/organizations.service";
import { listOrgRoleRates, upsertOrgRoleRate, updateOrgRoleRate, OrgRoleRate } from "../../services/orgRoleRates.service";

type Tab = "overview" | "rates";

function TabLink({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} end className={({ isActive }) => `tab ${isActive ? "tabActive" : ""}`}>
      {label}
    </NavLink>
  );
}

export default function OrganizationDetailScreen() {
  const { orgId } = useParams();

  const [org, setOrg] = useState<OrgRow | null>(null);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState<string | null>(null);

  const [rates, setRates] = useState<OrgRoleRate[]>([]);
  const [ratesLoading, setRatesLoading] = useState(true);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [newRoleName, setNewRoleName] = useState("");
  const [newRateText, setNewRateText] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const [rowSavingKey, setRowSavingKey] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("overview");

  const nav = useNavigate();

  // simple “tab” via URL hash to avoid nested routing complexity
  useEffect(() => {
    const h = String(window.location.hash || "").replace("#", "");
    if (h === "rates") setTab("rates");
    else setTab("overview");
  }, [orgId]);

  const loadOrg = async () => {
    try {
      setOrgError(null);
      setOrgLoading(true);
      if (!orgId) throw new Error("Missing orgId");
      const data = await getOrganizationById(orgId);
      setOrg(data);
    } catch (e: any) {
      setOrgError(e?.message || "Could not load organization.");
    } finally {
      setOrgLoading(false);
    }
  };

  const loadRates = async () => {
    try {
      setRatesError(null);
      setRatesLoading(true);
      if (!orgId) throw new Error("Missing orgId");
      const data = await listOrgRoleRates(orgId);
      setRates(data);
    } catch (e: any) {
      setRatesError(e?.message || "Could not load role rates.");
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    loadOrg();
    loadRates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const onAddRate = async () => {
    try {
      if (!orgId) return;
      setRatesError(null);

      const rateNum =
        newRateText.trim() === "" ? null : Number(newRateText.trim().replace(",", "."));

      if (rateNum != null && Number.isNaN(rateNum)) {
        throw new Error("Rate must be a number (e.g. 24).");
      }

      setSavingNew(true);
      await upsertOrgRoleRate({
        orgId,
        roleName: newRoleName,
        ratePerHour: rateNum,
        currency: "NZD",
        isActive: true,
      });

      setNewRoleName("");
      setNewRateText("");
      await loadRates();
      window.location.hash = "rates";
      setTab("rates");
    } catch (e: any) {
      setRatesError(e?.message || "Could not add role rate.");
    } finally {
      setSavingNew(false);
    }
  };

  const toggleActive = async (r: OrgRoleRate) => {
    try {
      if (!orgId) return;
      setRatesError(null);
      setRowSavingKey(r.roleKey);

      await updateOrgRoleRate(orgId, r.roleKey, { isActive: !(r.isActive !== false) });
      await loadRates();
    } catch (e: any) {
      setRatesError(e?.message || "Could not update role.");
    } finally {
      setRowSavingKey(null);
    }
  };

  const updateRateInline = async (r: OrgRoleRate, rateText: string) => {
    try {
      if (!orgId) return;
      setRatesError(null);
      setRowSavingKey(r.roleKey);

      const rateNum = rateText.trim() === "" ? null : Number(rateText.trim().replace(",", "."));
      if (rateNum != null && Number.isNaN(rateNum)) throw new Error("Rate must be a number.");

      await updateOrgRoleRate(orgId, r.roleKey, { ratePerHour: rateNum });
      await loadRates();
    } catch (e: any) {
      setRatesError(e?.message || "Could not update rate.");
    } finally {
      setRowSavingKey(null);
    }
  };

  const activeRates = useMemo(() => rates.filter((x) => x.isActive !== false), [rates]);

  return (
    <div className="page">
      <div className="row">
        <div>
            <button
            className="btn"
            style={{ marginBottom: 10 }}
            onClick={() => nav("/organizations")}
            >
            ← Back to organizations
            </button>

            <h1 className="h1">{org?.name || "Organization"}</h1>
            <div className="muted mt6" style={{ fontWeight: 800 }}>
            {orgId}
            </div>
        </div>

        <div className="row gap10">
            <button className="btn" onClick={loadOrg} disabled={orgLoading}>
            {orgLoading ? "Refreshing..." : "Refresh org"}
            </button>
            <button className="btn" onClick={loadRates} disabled={ratesLoading}>
            {ratesLoading ? "Refreshing..." : "Refresh rates"}
            </button>
        </div>
        </div>

      {orgError ? <div className="error mt12">{orgError}</div> : null}

      <div className="tabs mt16">
        <a
          href="#overview"
          className={`tab ${tab === "overview" ? "tabActive" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = "overview";
            setTab("overview");
          }}
        >
          Overview
        </a>

        <a
          href="#rates"
          className={`tab ${tab === "rates" ? "tabActive" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            window.location.hash = "rates";
            setTab("rates");
          }}
        >
          Rates
        </a>
      </div>

      {tab === "overview" ? (
        <div className="card mt18">
          <div className="cardBody">
            {orgLoading ? (
              <div className="muted">Loading…</div>
            ) : !org ? (
              <div className="muted">Organization not found.</div>
            ) : (
              <>
                <div style={{ fontWeight: 900, fontSize: 16 }}>Details</div>
                <div className="mt12" style={{ display: "grid", gap: 8 }}>
                  <div className="muted" style={{ fontWeight: 800 }}>
                    Legal: <span style={{ color: "#111827" }}>{org.legalName || "—"}</span>
                  </div>
                  <div className="muted" style={{ fontWeight: 800 }}>
                    Industry: <span style={{ color: "#111827" }}>{org.industry || "—"}</span>
                  </div>
                  <div className="muted" style={{ fontWeight: 800 }}>
                    Location:{" "}
                    <span style={{ color: "#111827" }}>
                      {[org.city, org.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </div>
                </div>

                <div className="divider mt18" />

                <div style={{ fontWeight: 900, fontSize: 16 }}>Rates summary</div>
                <div className="muted mt6" style={{ fontWeight: 800 }}>
                  Active roles: {activeRates.length}
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}

      {tab === "rates" ? (
        <>
          <div className="card mt18">
            <div className="cardBody">
              <div style={{ fontWeight: 900 }}>Add role rate for this organization</div>

              <div className="row mt12" style={{ gap: 10, alignItems: "center" }}>
                <input
                  className="input"
                  placeholder="Role name (e.g. Kitchen Hand)"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <input
                  className="input"
                  placeholder="Rate per hour (e.g. 24)"
                  value={newRateText}
                  onChange={(e) => setNewRateText(e.target.value)}
                  style={{ width: 220 }}
                />
                <button
                  className="btn btnPrimary"
                  onClick={onAddRate}
                  disabled={savingNew || !newRoleName.trim()}
                >
                  {savingNew ? "Adding..." : "Add"}
                </button>
              </div>

              <div className="muted mt10" style={{ fontSize: 12, fontWeight: 800 }}>
                Note: rate is employer-specific (stored under this org). Later we can attach roles from a global
                roles catalog to avoid typos.
              </div>

              {ratesError ? <div className="error mt12">{ratesError}</div> : null}
            </div>
          </div>

          <div className="card mt18">
            <div className="cardBody">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontWeight: 900 }}>Role rates</div>
                <div className="muted" style={{ fontWeight: 800 }}>
                  {ratesLoading ? "Loading…" : `${rates.length} roles`}
                </div>
              </div>

              {ratesLoading ? (
                <div className="muted mt16">Loading rates…</div>
              ) : rates.length === 0 ? (
                <div className="muted mt16">No role rates yet. Add the first one above.</div>
              ) : (
                <div className="mt16" style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left" }}>Role</th>
                        <th style={{ textAlign: "left" }}>Role key</th>
                        <th style={{ textAlign: "left" }}>Rate</th>
                        <th style={{ textAlign: "left" }}>Status</th>
                        <th style={{ width: 180 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {rates.map((r) => {
                        const busy = rowSavingKey === r.roleKey;
                        return (
                          <tr key={r.roleKey}>
                            <td style={{ fontWeight: 900 }}>{r.roleName}</td>
                            <td className="muted" style={{ fontWeight: 800 }}>
                              {r.roleKey}
                            </td>
                            <td>
                              <RateEditor
                                value={r.ratePerHour}
                                disabled={busy}
                                onSave={(val) => updateRateInline(r, val)}
                              />
                            </td>
                            <td>
                              <span className={`pill ${r.isActive !== false ? "pillOk" : "pillWarn"}`}>
                                {r.isActive !== false ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td>
                              <button className="btn" disabled={busy} onClick={() => toggleActive(r)}>
                                {busy ? "Updating..." : r.isActive !== false ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  <div className="muted mt10" style={{ fontSize: 12, fontWeight: 800 }}>
                    We soft-disable roles instead of deleting. This avoids breaking historical jobs.
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function RateEditor({
  value,
  disabled,
  onSave,
}: {
  value: number | null;
  disabled?: boolean;
  onSave: (nextText: string) => void;
}) {
  const [txt, setTxt] = useState(value == null ? "" : String(value.toFixed(2).replace(/\.00$/, "")));
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTxt(value == null ? "" : String(value.toFixed(2).replace(/\.00$/, "")));
    setDirty(false);
  }, [value]);

  return (
    <div className="row" style={{ gap: 8, alignItems: "center" }}>
      <input
        className="input"
        style={{ width: 140 }}
        value={txt}
        onChange={(e) => {
          setTxt(e.target.value);
          setDirty(true);
        }}
        disabled={disabled}
        placeholder="24"
      />
      <button className="btn" disabled={disabled || !dirty} onClick={() => onSave(txt)}>
        Save
      </button>
    </div>
  );
}