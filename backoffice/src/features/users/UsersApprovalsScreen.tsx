import React, { useEffect, useMemo, useState } from "react";
import { listPendingWorkers, approveWorker, rejectWorker, UserRow } from "./users.service";
import { useAuth } from "../../providers/AuthProvider";
import { listSkillsCatalog } from "../../services/skillsCatalog.service";

type ReferenceItem = {
  name?: string;
  role?: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

type TimestampLike =
  | { toDate?: () => Date }
  | Date
  | string
  | number
  | null
  | undefined;

function formatTimestamp(value: TimestampLike) {
  try {
    if (!value) return "—";
    if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
      return value.toDate().toLocaleString();
    }
    if (value instanceof Date) return value.toLocaleString();
    if (typeof value === "number") return new Date(value).toLocaleString();
    if (typeof value === "string") {
      // If it's already a readable date string, keep it; otherwise try parsing.
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
    }
    return "—";
  } catch {
    return "—";
  }
}

export default function UsersApprovalsScreen() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<UserRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) || null,
    [items, selectedId]
  );

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [skills, setSkills] = useState<{ id: string; name: string; key: string; isActive: boolean }[]>([]);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSkills = async () => {
      try {
        setSkillsError(null);
        setSkillsLoading(true);

        const data = await listSkillsCatalog();

        // Only active skills by default
        const active = data.filter((s) => s.isActive !== false);

        if (mounted) setSkills(active);
      } catch (e: any) {
        if (mounted) setSkillsError(e?.message || "Could not load skills catalog.");
      } finally {
        if (mounted) setSkillsLoading(false);
      }
    };

    loadSkills();
    return () => {
      mounted = false;
    };
  }, []);

  const load = async () => {
    try {
      setError(null);
      setLoading(true);

      const rows = await listPendingWorkers();
      setItems(rows);

      if (rows.length) {
        // keep selection if possible
        if (!selectedId || !rows.some((r) => r.id === selectedId)) {
          setSelectedId(rows[0].id);
        }
      } else {
        setSelectedId(null);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load pending users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const skills = Array.isArray(selected?.skills) ? selected!.skills! : [];
    setSelectedSkills(skills);
    setActionError(null);
  }, [selected?.id]);

  const toggleSkill = (skillKey: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillKey) ? prev.filter((x) => x !== skillKey) : [...prev, skillKey]
    );
  };

  const onApprove = async () => {
    try {
      if (!selected?.id) return;
      if (!user?.uid) throw new Error("Missing admin session.");

      setActionError(null);
      setActionLoading(true);

      await approveWorker({
        userId: selected.id,
        adminUid: user.uid,
        skills: selectedSkills,
      });

      await load();
    } catch (e: any) {
      setActionError(e?.message || "Could not approve user.");
    } finally {
      setActionLoading(false);
    }
  };

  const onReject = async () => {
    try {
      if (!selected?.id) return;
      if (!user?.uid) throw new Error("Missing admin session.");

      setActionError(null);
      setActionLoading(true);

      await rejectWorker({
        userId: selected.id,
        adminUid: user.uid,
        skills: selectedSkills,
      });

      await load();
    } catch (e: any) {
      setActionError(e?.message || "Could not reject user.");
    } finally {
      setActionLoading(false);
    }
  };

  // These fields may not exist on UserRow yet depending on listPendingWorkers().
  // We read them defensively to avoid TS issues and runtime crashes.
  const selectedAny = selected as any;
  const references: ReferenceItem[] = Array.isArray(selectedAny?.references) ? selectedAny.references : [];

  return (
    <div className="page approvalsLayout">
      {/* LEFT */}
      <div className="card">
        <div className="cardHeader">
          <div className="fw900">Pending worker approvals</div>
          <div className="muted mt6 fs13">
            {loading ? "Loading…" : `${items.length} pending`}
          </div>
        </div>

        {error ? <div className="cardBody error">{error}</div> : null}

        <div className="list">
          {items.map((u) => {
            const isActive = u.id === selectedId;
            return (
              <button
                key={u.id}
                className={`listItem ${isActive ? "listItemActive" : ""}`}
                onClick={() => setSelectedId(u.id)}
              >
                <div className="fw900">{u.fullName || "Unnamed worker"}</div>
                <div className="muted mt6 fs13">{u.email || u.id}</div>
                <div className="mt6 fs12 fw800">
                  role: {u.role || "—"} · status: {u.approvalStatus || "—"}
                </div>
              </button>
            );
          })}

          {!loading && items.length === 0 ? (
            <div className="cardBody muted">No pending workers 🎉</div>
          ) : null}
        </div>
      </div>

      {/* RIGHT */}
      <div className="card">
        <div className="cardBody">
          {!selected ? (
            <div className="muted">Select a worker from the list.</div>
          ) : (
            <>
              <div className="row">
                <div>
                  <div className="fw900">{selected.fullName || "Unnamed worker"}</div>
                  <div className="muted mt6">{selected.email || selected.id}</div>
                </div>

                <div className="row gap10">
                  <button className="btn btnDanger" disabled={actionLoading} onClick={onReject}>
                    Reject
                  </button>
                  <button className="btn btnPrimary" disabled={actionLoading} onClick={onApprove}>
                    Approve
                  </button>
                </div>
              </div>

              {actionError ? <div className="error mt12">{actionError}</div> : null}

              <div className="sectionGrid">
                <div className="card cardBody">
                  <div className="fw900 mb8">Profile</div>

                  <div className="fs13 fw800">Role: {selected.role || "—"}</div>
                  <div className="mt6 fs13 fw800">Approval status: {selected.approvalStatus || "—"}</div>

                  <div className="mt12">
                    <div className="fw900 mb8">IRD & Bank</div>

                    <div className="fs13 fw800">
                      IRD: {selectedAny?.irdNumber || "—"}
                    </div>
                    <div className="muted fs12 fw800 mt6">
                      Set at: {formatTimestamp(selectedAny?.irdNumberSetAt)}
                    </div>

                    <div className="mt12 fs13 fw800">
                      Bank account: {selectedAny?.bankAccountNumber || "—"}
                    </div>
                    <div className="muted fs12 fw800 mt6">
                      Set at: {formatTimestamp(selectedAny?.bankAccountNumberSetAt)}
                    </div>
                  </div>
                </div>

                <div className="card cardBody">
                  <div className="fw900 mb8">CV</div>
                  <div className="muted fs13">
                    Not uploaded yet (C1 will add CV upload in worker profile).
                  </div>
                </div>

                <div className="card cardBody fullRow">
                  <div className="fw900 mb8">References</div>

                  {references.length ? (
                    <div className="historyList">
                      {references.map((r, idx) => (
                        <div key={idx} className="historyRow">
                          <div className="fw900">
                            {r?.name || "—"}
                            {r?.role ? ` · ${r.role}` : ""}
                            {r?.company ? ` @ ${r.company}` : ""}
                          </div>

                          <div className="muted fs12 fw800 mt6">
                            {r?.email ? `email: ${r.email}` : ""}
                            {r?.phone ? (r?.email ? " · " : "") + `phone: ${r.phone}` : ""}
                          </div>

                          {r?.notes ? (
                            <div className="muted fs12 fw800 mt6">notes: {r.notes}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="muted fs13 fw800">No references.</div>
                  )}
                </div>

                <div className="card cardBody fullRow">
                  <div className="fw900 mb8">Status history</div>

                  {Array.isArray(selectedAny?.statusHistory) && selectedAny.statusHistory.length ? (
                    <div className="historyList">
                      {selectedAny.statusHistory
                        .slice(-5)
                        .reverse()
                        .map((h: any, idx: number) => (
                          <div key={idx} className="historyRow">
                            <div className="fw900">
                              {h.from || "—"} → {h.to || "—"}
                            </div>
                            <div className="muted fs12 fw800 mt6">
                              by {h.by || "—"}
                              {h.reason ? ` · reason: ${h.reason}` : ""}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="muted fs13 fw800">No history yet.</div>
                  )}
                </div>

                <div className="card cardBody fullRow">
                  <div className="fw900 mb8">Skills (controls job visibility later)</div>

                  <div className="skillsWrap">
                    {skillsLoading ? (
                      <div className="muted fs13 fw800">Loading skills…</div>
                    ) : skillsError ? (
                      <div className="error fs13">{skillsError}</div>
                    ) : skills.length === 0 ? (
                      <div className="muted fs13 fw800">
                        No skills found. Add skills in Catalog → Skills.
                      </div>
                    ) : (
                      skills.map((s) => {
                        const checked = selectedSkills.includes(s.key);
                        return (
                          <label key={s.id} className={`skillChip ${checked ? "skillChipActive" : ""}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSkill(s.key)}
                            />
                            {s.name}
                          </label>
                        );
                      })
                    )}
                  </div>

                  <div className="muted mt10 fs12 fw800">
                    Selected: {selectedSkills.length ? selectedSkills.join(", ") : "none"}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}