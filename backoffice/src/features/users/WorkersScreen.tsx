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

function asDateMaybe(v: any): Date | null {
  if (!v) return null;
  // Firestore Timestamp
  if (typeof v?.toDate === "function") return v.toDate();
  // {seconds}
  if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
  // JS Date
  if (v instanceof Date) return v;
  return null;
}

function fmtShort(d: Date | null): string {
  if (!d) return "—";
  try {
    return d.toLocaleString();
  } catch {
    return "—";
  }
}

function pillClass(st: string) {
  if (st === "approved") return "pill pillOk";
  if (st === "pending") return "pill";
  // rejected/suspended (and any other future states)
  return "pill pillWarn";
}

export default function WorkersScreen() {
  const nav = useNavigate();
  const { user } = useAuth();
  const { prompt } = usePrompt();

  const [tab, setTab] = useState<ApprovalStatus>("pending");
  const title = useMemo(() => titleFor(tab), [tab]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    // MVP: keep it simple.
    // Later: make approvals screen accept ?userId=... to open exact worker.
    void userId;
    nav("/users/approvals");
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

        if (reason == null) return; // cancelled
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
      <div className="row rowBetween">
        <h1 className="h1">Workers</h1>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="tabs mt16">
        {TABS.map((t) => (
          <button key={t} className={`tab ${tab === t ? "tabActive" : ""}`} onClick={() => setTab(t)}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="card mt18">
        <div className="cardBody">
          <div className="row rowBetween">
            <div>
              <div className="fw900">{title} workers</div>
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

          {!loading && filtered.length === 0 ? <div className="muted mt16">No workers in this status.</div> : null}

          <div className="mt16 tableWrap">
            <table className="table tableThLeft">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Skills</th>
                  <th>Last change</th>
                  <th>Reason</th>
                  <th className="thActions" />
                </tr>
              </thead>

              <tbody>
                {filtered.map((u) => {
                  const busy = actionLoadingId === u.id;
                  const st = String(u.approvalStatus || tab).toLowerCase();
                  const updatedAt = fmtShort(asDateMaybe(u.statusUpdatedAt || u.updatedAt));
                  const reason = st === "rejected" || st === "suspended" ? String(u.statusReason || "—") : "—";

                  return (
                    <tr key={u.id}>
                      <td className="fw900">{u.fullName || "Unnamed"}</td>
                      <td className="muted fw800">{u.email || u.id}</td>

                      <td>
                        <span className={pillClass(st)}>{st}</span>
                      </td>

                      <td className="muted fw800">
                        {Array.isArray(u.skills) && u.skills.length ? u.skills.join(", ") : "—"}
                      </td>

                      <td className="muted fw800 fs12">{updatedAt}</td>
                      <td className="muted fw800 fs12">{reason}</td>

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