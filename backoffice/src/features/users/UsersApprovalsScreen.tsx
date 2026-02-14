import React, { useEffect, useMemo, useState } from "react";
import { listPendingWorkers, approveWorker, rejectWorker, UserRow } from "./users.service";
import { useAuth } from "../../providers/AuthProvider";
import { listSkillsCatalog } from "../../services/skillsCatalog.service";

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

  return (
    <div className="page approvalsLayout">
      {/* LEFT */}
      <div className="card">
        <div className="cardHeader">
          <div style={{ fontWeight: 900 }}>Pending worker approvals</div>
          <div className="muted mt6" style={{ fontSize: 13 }}>
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
                <div style={{ fontWeight: 900 }}>{u.fullName || "Unnamed worker"}</div>
                <div className="muted mt6" style={{ fontSize: 13 }}>
                  {u.email || u.id}
                </div>
                <div className="mt6" style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>
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
                  <div style={{ fontSize: 18, fontWeight: 900 }}>{selected.fullName || "Unnamed worker"}</div>
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
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Profile</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>Role: {selected.role || "—"}</div>
                  <div className="mt6" style={{ fontSize: 13, fontWeight: 800, color: "#374151" }}>
                    Approval status: {selected.approvalStatus || "—"}
                  </div>
                </div>

                <div className="card cardBody">
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>CV</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    Not uploaded yet (C1 will add CV upload in worker profile).
                  </div>
                </div>

                <div className="card cardBody fullRow">
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>References</div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    No references yet (C1 will add references in worker profile).
                  </div>
                </div>

                <div className="card cardBody fullRow">
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Skills (controls job visibility later)</div>

                  <div className="skillsWrap">
                    {skillsLoading ? (
                      <div className="muted" style={{ fontSize: 13, fontWeight: 800 }}>
                        Loading skills…
                      </div>
                    ) : skillsError ? (
                      <div className="error" style={{ fontSize: 13 }}>
                        {skillsError}
                      </div>
                    ) : skills.length === 0 ? (
                      <div className="muted" style={{ fontSize: 13, fontWeight: 800 }}>
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

                  <div className="muted mt10" style={{ fontSize: 12, fontWeight: 800 }}>
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