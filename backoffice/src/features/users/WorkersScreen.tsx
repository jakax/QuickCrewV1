import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../providers/AuthProvider";
import { ApprovalStatus, listWorkersByStatus, setWorkerStatus, UserRow } from "./users.service";
import { usePrompt } from "../../providers/PromptProvider";

const TABS: ApprovalStatus[] = ["pending", "approved", "rejected", "suspended"];

function titleFor(tab: ApprovalStatus) {
  if (tab === "pending") return "Pending";
  if (tab === "approved") return "Approved";
  if (tab === "rejected") return "Rejected";
  return "Suspended";
}

export default function WorkersScreen() {
  const nav = useNavigate();
  const { user } = useAuth();

  const [tab, setTab] = useState<ApprovalStatus>("pending");
  const title = useMemo(() => titleFor(tab), [tab]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { prompt } = usePrompt();

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listWorkersByStatus(tab);
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Could not load workers.");
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

    return items.filter((u) => {
      const name = String(u.fullName || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const id = String(u.id || "").toLowerCase();
      return name.includes(term) || email.includes(term) || id.includes(term);
    });
  }, [items, q]);

  const openReview = (userId: string) => {
    // For now, reuse your existing approvals screen as “deep review”.
    // Later we can create /users/workers/:id
    nav("/users/approvals");
    // If you want, next step is to add route param and open exact worker.
  };

  const changeStatus = async (u: UserRow, to: ApprovalStatus) => {
    try {
      if (!user?.uid) throw new Error("Missing admin session.");

      setActionError(null);

      let reason: string | null = null;
      if (to === "rejected" || to === "suspended") {
        reason = await prompt({
            title: `Reason required (${to})`,
            message: "Please add a short reason for audit history.",
            placeholder: "e.g. References could not be verified",
            confirmText: "Save",
            cancelText: "Cancel",
            required: true,
        });

        if (reason == null) return; // user cancelled
      }

      setActionLoadingId(u.id);

      await setWorkerStatus({
        userId: u.id,
        adminUid: user.uid,
        to,
        reason,
        skills: Array.isArray(u.skills) ? u.skills : [],
        from: String(u.approvalStatus || tab),
      });

      await load();
    } catch (e: any) {
      setActionError(e?.message || "Could not update status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="page">
      <div className="row">
        <h1 className="h1">Workers</h1>
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
              <div style={{ fontWeight: 900 }}>{title} workers</div>
              <div className="muted mt6 fw800 fs13">
                {loading ? "Loading…" : `${filtered.length} shown · ${items.length} total`}
              </div>
            </div>

            <input
              className="input w320"
              placeholder="Search name / email / uid..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {error ? <div className="error mt12">{error}</div> : null}
          {actionError ? <div className="error mt12">{actionError}</div> : null}

          {!loading && filtered.length === 0 ? (
            <div className="muted mt16">No workers in this status.</div>
          ) : null}

          <div className="mt16 tableWrap">
            <table className="table tableThLeft">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Name</th>
                  <th style={{ textAlign: "left" }}>Email</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th style={{ textAlign: "left" }}>Skills</th>
                  <th className="thActions" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const busy = actionLoadingId === u.id;
                  const st = String(u.approvalStatus || tab);

                  return (
                    <tr key={u.id}>
                      <td className="fw900">{u.fullName || "Unnamed"}</td>
                      <td className="muted fw800">
                        {u.email || u.id}
                      </td>
                      <td>
                        <span className={`pill ${st === "approved" ? "pillOk" : st === "pending" ? "" : "pillWarn"}`}>
                          {st}
                        </span>
                      </td>
                      <td className="muted fw800">
                        {Array.isArray(u.skills) && u.skills.length ? u.skills.join(", ") : "—"}
                      </td>
                      <td>
                        <div className="tableActions">
                          <button className="btn" onClick={() => openReview(u.id)} disabled={busy}>
                            Review
                          </button>

                          {st !== "approved" ? (
                            <button className="btn btnPrimary" onClick={() => changeStatus(u, "approved")} disabled={busy}>
                              {busy ? "Saving..." : "Approve"}
                            </button>
                          ) : null}

                          {st !== "pending" ? (
                            <button className="btn" onClick={() => changeStatus(u, "pending")} disabled={busy}>
                              Set pending
                            </button>
                          ) : null}

                          {st !== "suspended" ? (
                            <button className="btn" onClick={() => changeStatus(u, "suspended")} disabled={busy}>
                              Suspend
                            </button>
                          ) : null}

                          {st !== "rejected" ? (
                            <button className="btn btnDanger" onClick={() => changeStatus(u, "rejected")} disabled={busy}>
                              Reject
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="muted mt10 fs12 fw800">
              Reject/Suspend requires a reason (stored on the user doc + lightweight history).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}