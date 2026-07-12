import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../providers/AuthProvider";
import {
  fmtDate,
  fmtTime,
  listShiftsByReviewStatus,
  setShiftReviewStatus,
  ShiftReviewStatus,
  ShiftRow,
  listUnclosedAssignments,
  listOpenJobs,
} from "./shifts.service";

const TABS = ["pending", "reviewed", "paid", "rejected", "unclosed", "open"] as const;
type Tab = typeof TABS[number];

// Tries to parse shiftDate into a sortable timestamp.
// Handles ISO "YYYY-MM-DD" first (unambiguous), then falls back to
// "DD/MM/YYYY" style, then a generic Date parse as a last resort.
// Shifts with no parseable date sort to the end.
function parseShiftDate(v: string | null): number {
  if (!v) return Infinity;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return d.getTime();
  }
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(v);
  if (dmy) {
    const d = new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    return d.getTime();
  }
  const generic = new Date(v);
  return isNaN(generic.getTime()) ? Infinity : generic.getTime();
}

export default function ShiftsScreen() {
  const { user } = useAuth();

  const [tab, setTab] = useState<Tab>("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ShiftRow[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [detailRow, setDetailRow] = useState<ShiftRow | null>(null);
  const [rejectRow, setRejectRow] = useState<ShiftRow | null>(null);
  const [rejectComment, setRejectComment] = useState("");

  const load = async () => {
    try {
      setError(null);
      setLoading(true);
      const data =
        tab === "unclosed"
          ? await listUnclosedAssignments()
          : tab === "open"
            ? await listOpenJobs()
            : await listShiftsByReviewStatus(tab as ShiftReviewStatus);
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
    const base = term
      ? items.filter((s) => {
        const worker = String(s.workerFullName || "").toLowerCase();
        const employer = String(s.employerFullName || "").toLowerCase();
        const org = String(s.orgName || "").toLowerCase();
        const job = String(s.jobTitle || "").toLowerCase();
        return worker.includes(term) || employer.includes(term) || org.includes(term) || job.includes(term);
      })
      : items;

    return [...base].sort((a, b) => parseShiftDate(a.shiftDate) - parseShiftDate(b.shiftDate));
  }, [items, q]);

  const changeStatus = async (row: ShiftRow, to: ShiftReviewStatus, quickCrewComment?: string) => {
    try {
      if (!user?.uid) throw new Error("Missing admin session.");
      setActionError(null);
      setActionLoadingId(row.id);
      await setShiftReviewStatus({ assignmentId: row.id, adminUid: user.uid, to, quickCrewComment });
      await load();
    } catch (e: any) {
      setActionError(e?.message || "Could not update status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onRejectConfirm = async () => {
    if (!rejectRow) return;
    await changeStatus(rejectRow, "rejected", rejectComment.trim() || undefined);
    setRejectRow(null);
    setRejectComment("");
  };

  return (
    <div className="page">

      {/* ── Detail modal ── */}
      {detailRow ? (
        <div className="modalOverlay" onClick={() => setDetailRow(null)}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <span className="fw900">{tab === "open" ? "Job details" : "Shift details"}</span>
              <button className="modalClose" onClick={() => setDetailRow(null)}>✕</button>
            </div>

            <div className="modalBody">
              {tab === "open" ? (
                <>
                  <div className="detailGrid">
                    <div className="detailLabel">Organization</div>
                    <div className="detailValue">{detailRow.orgName || "—"}</div>

                    <div className="detailLabel">Posted by</div>
                    <div className="detailValue">
                      {detailRow.employerFullName || "—"}
                      {detailRow.employerEmail ? ` (${detailRow.employerEmail})` : ""}
                    </div>

                    <div className="detailLabel">Date</div>
                    <div className="detailValue">{fmtDate(detailRow.shiftDate)}</div>

                    <div className="detailLabel">Time</div>
                    <div className="detailValue">{detailRow.shiftTime || "—"}</div>

                    <div className="detailLabel">Shift name</div>
                    <div className="detailValue">{detailRow.jobTitle || "—"}</div>

                    <div className="detailLabel">Primary role</div>
                    <div className="detailValue">{detailRow.primaryRoleKey || "—"}</div>

                    <div className="detailLabel">Secondary roles</div>
                    <div className="detailValue">
                      {detailRow.requiredSkills && detailRow.requiredSkills.length
                        ? detailRow.requiredSkills.join(", ")
                        : "—"}
                    </div>
                  </div>

                  {detailRow.description ? (
                    <div className="detailComment">
                      <div className="detailCommentLabel">Special requirements</div>
                      <div className="detailCommentBody">{detailRow.description}</div>
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  {detailRow.workerNoShow ? (
                    <div className="noShowBanner">⚠️ Worker reported as no-show by employer</div>
                  ) : null}

                  <div className="detailGrid">
                    <div className="detailLabel">Worker clock in</div>
                    <div className="detailValue">{fmtTime(detailRow.workerClockIn)}</div>

                    <div className="detailLabel">Worker clock out</div>
                    <div className="detailValue">{fmtTime(detailRow.workerClockOut)}</div>

                    <div className="detailLabel">Employer clock in</div>
                    <div className="detailValue">{fmtTime(detailRow.employerClockIn)}</div>

                    <div className="detailLabel">Employer clock out</div>
                    <div className="detailValue">{fmtTime(detailRow.employerClockOut)}</div>
                  </div>

                  {detailRow.employerComment ? (
                    <div className="detailComment">
                      <div className="detailCommentLabel">Employer comment</div>
                      <div className="detailCommentBody">{detailRow.employerComment}</div>
                    </div>
                  ) : null}

                  {detailRow.quickCrewComment ? (
                    <div className="detailComment detailCommentInternal">
                      <div className="detailCommentLabel">QuickCrew internal note</div>
                      <div className="detailCommentBody">{detailRow.quickCrewComment}</div>
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="modalFooter">
              <button className="btn" onClick={() => setDetailRow(null)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Reject modal ── */}
      {rejectRow ? (
        <div className="modalOverlay" onClick={() => { setRejectRow(null); setRejectComment(""); }}>
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <span className="fw900">Reject shift</span>
              <button className="modalClose" onClick={() => { setRejectRow(null); setRejectComment(""); }}>✕</button>
            </div>

            <div className="modalBody">
              <div className="muted fs13 mb12">
                This worker will <strong>not be paid</strong> for this shift. This action can be reverted from the Rejected tab.
              </div>
              <div className="fw800 fs13 mb6">Internal note <span className="muted fw400">(optional)</span></div>
              <textarea
                className="input textArea"
                placeholder="e.g. Worker confirmed no-show via phone..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
                maxLength={500}
              />
            </div>

            <div className="modalFooter">
              <button className="btn" onClick={() => { setRejectRow(null); setRejectComment(""); }}>
                Cancel
              </button>
              <button
                className="btn btnDanger"
                onClick={onRejectConfirm}
                disabled={!!actionLoadingId}
              >
                {actionLoadingId ? "Rejecting..." : "Confirm reject"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
                <div className="fw900">
                  {tab === "pending" ? "Pending review"
                    : tab === "reviewed" ? "Reviewed shifts"
                      : tab === "paid" ? "Paid shifts"
                        : tab === "rejected" ? "Rejected shifts"
                          : tab === "unclosed" ? "Unclosed shifts"
                            : "Open jobs"}
                </div>
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
          {tab === "unclosed" ? (
            <div className="infoBanner mt12">
              These shifts were assigned to workers but no action was taken by the employer regarding hours. Please review each case and take the appropriate action.
            </div>
          ) : null}
          {tab === "open" ? (
            <div className="infoBanner mt12">
              These jobs are open and have not been taken by any worker yet. This view is for visibility and control only.
            </div>
          ) : null}

          {loading ? (
            <div className="mt16" style={{ textAlign: "center", padding: "48px 0" }}>
              <div className="fw900 fs14">Loading shifts…</div>
            </div>
          ) : (
            <>
              {filtered.length === 0 ? (
                <div className="muted mt16">No shifts in this status.</div>
              ) : null}

              <div className="mt16 tableWrap">
                <table className="table tableThLeft">
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>{tab === "open" ? "Shift name" : "Job"}</th>
                      <th>Date</th>
                      {tab === "open" ? <th>Time</th> : <th>Worker</th>}
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
                            {row.shiftTime && tab !== "open" ? (
                              <div className="muted fs12">{row.shiftTime}</div>
                            ) : null}
                          </td>
                          {tab === "open" ? (
                            <td className="muted fw800 fs12">{row.shiftTime || "—"}</td>
                          ) : (
                            <td>
                              <div className="fw900">{row.workerFullName || "—"}</div>
                              {row.workerEmail ? (
                                <div className="muted fs12">{row.workerEmail}</div>
                              ) : null}
                            </td>
                          )}
                          <td>
                            <div className="tableActions">
                              <button
                                className="btn"
                                onClick={() => setDetailRow(row)}
                              >
                                {tab === "open" ? "Review" : "View details"}
                              </button>

                              {tab === "pending" ? (
                                <>
                                  <button
                                    className="btn btnPrimary"
                                    onClick={() => changeStatus(row, "reviewed")}
                                    disabled={busy}
                                  >
                                    {busy ? "Saving..." : "Mark reviewed"}
                                  </button>
                                  <button
                                    className="btn btnDanger"
                                    onClick={() => setRejectRow(row)}
                                    disabled={busy}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : tab === "reviewed" ? (
                                <>
                                  <button
                                    className="btn"
                                    onClick={() => changeStatus(row, "pending")}
                                    disabled={busy}
                                  >
                                    {busy ? "Saving..." : "Set pending"}
                                  </button>
                                  <button
                                    className="btn btnPrimary"
                                    onClick={() => changeStatus(row, "paid")}
                                    disabled={busy}
                                  >
                                    {busy ? "Saving..." : "Mark paid"}
                                  </button>
                                  <button
                                    className="btn btnDanger"
                                    onClick={() => setRejectRow(row)}
                                    disabled={busy}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : tab === "rejected" ? (
                                <>
                                  <button
                                    className="btn"
                                    onClick={() => changeStatus(row, "pending")}
                                    disabled={busy}
                                  >
                                    {busy ? "Saving..." : "Set pending"}
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() => changeStatus(row, "reviewed")}
                                    disabled={busy}
                                  >
                                    {busy ? "Saving..." : "Set reviewed"}
                                  </button>
                                </>
                              ) : tab === "unclosed" ? (
                                <>
                                  <button
                                    className="btn btnPrimary"
                                    onClick={() => changeStatus(row, "paid")}
                                    disabled={busy}
                                  >
                                    {busy ? "Saving..." : "Mark paid"}
                                  </button>
                                  <button
                                    className="btn btnDanger"
                                    onClick={() => setRejectRow(row)}
                                    disabled={busy}
                                  >
                                    Reject
                                  </button>
                                </>
                              ) : tab === "open" ? null : (
                                <button
                                  className="btn"
                                  onClick={() => changeStatus(row, "reviewed")}
                                  disabled={busy}
                                >
                                  {busy ? "Saving..." : "Set reviewed"}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}