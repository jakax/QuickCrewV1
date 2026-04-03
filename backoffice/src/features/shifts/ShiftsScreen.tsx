import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../providers/AuthProvider";
import {
  fmtDate,
  fmtTime,
  listShiftsByReviewStatus,
  setShiftReviewStatus,
  ShiftReviewStatus,
  ShiftRow,
} from "./shifts.service";

const TABS: ShiftReviewStatus[] = ["pending", "reviewed"];

export default function ShiftsScreen() {
  const { user } = useAuth();

  const [tab, setTab] = useState<ShiftReviewStatus>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ShiftRow[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listShiftsByReviewStatus(tab);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Could not load shifts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((s) => {
      const worker = String(s.workerFullName || "").toLowerCase();
      const org = String(s.orgName || "").toLowerCase();
      const job = String(s.jobTitle || "").toLowerCase();
      return worker.includes(term) || org.includes(term) || job.includes(term);
    });
  }, [items, q]);

  const changeStatus = async (row: ShiftRow, to: ShiftReviewStatus) => {
    try {
      if (!user?.uid) throw new Error("Missing admin session.");
      setActionError(null);
      setActionLoadingId(row.id);
      await setShiftReviewStatus({ assignmentId: row.id, adminUid: user.uid, to });
      await load();
    } catch (e: any) {
      setActionError(e?.message || "Could not update status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="page">
      <div className="row rowBetween">
        <h1 className="h1">Shifts</h1>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="tabs mt16">
        {TABS.map((t) => (
          <button
            key={t}
            className={`tab ${tab === t ? "tabActive" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="card mt18">
        <div className="cardBody">
          <div className="row rowBetween">
            <div>
              <div className="fw900">
                {tab === "pending" ? "Pending review" : "Reviewed shifts"}
              </div>
              <div className="muted mt6 fw800 fs13">
                {loading
                  ? "Loading…"
                  : `${filtered.length} shown · ${items.length} total`}
              </div>
            </div>

            <input
              className="input w320"
              placeholder="Search worker / org / job..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {error ? <div className="error mt12">{error}</div> : null}
          {actionError ? <div className="error mt12">{actionError}</div> : null}

          {!loading && filtered.length === 0 ? (
            <div className="muted mt16">No shifts in this status.</div>
          ) : null}

          <div className="mt16 tableWrap">
            <table className="table tableThLeft">
              <thead>
                <tr>
                  <th>Organization</th>
                  <th>Job</th>
                  <th>Date</th>
                  <th>Worker</th>
                  <th>Worker clock in</th>
                  <th>Worker clock out</th>
                  <th>Employer clock in</th>
                  <th>Employer clock out</th>
                  <th className="thActions" />
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => {
                  const busy = actionLoadingId === row.id;

                  return (
                    <tr key={row.id}>
                      <td className="fw900">{row.orgName || "—"}</td>
                      <td className="fw800">{row.jobTitle || "—"}</td>
                      <td className="muted fw800 fs12">
                        {fmtDate(row.shiftDate)}
                        {row.shiftTime ? (
                          <div className="muted fs12">{row.shiftTime}</div>
                        ) : null}
                      </td>
                      <td>
                        <div className="fw900">{row.workerFullName || "—"}</div>
                        {row.workerEmail ? (
                          <div className="muted fs12">{row.workerEmail}</div>
                        ) : null}
                      </td>
                      <td className="fw800">{fmtTime(row.workerClockIn)}</td>
                      <td className="fw800">{fmtTime(row.workerClockOut)}</td>
                      <td className="fw800">{fmtTime(row.employerClockIn)}</td>
                      <td className="fw800">{fmtTime(row.employerClockOut)}</td>

                      <td>
                        <div className="tableActions">
                          {tab === "pending" ? (
                            <button
                              className="btn btnPrimary"
                              onClick={() => changeStatus(row, "reviewed")}
                              disabled={busy}
                            >
                              {busy ? "Saving..." : "Mark reviewed"}
                            </button>
                          ) : (
                            <button
                              className="btn"
                              onClick={() => changeStatus(row, "pending")}
                              disabled={busy}
                            >
                              {busy ? "Saving..." : "Set pending"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}