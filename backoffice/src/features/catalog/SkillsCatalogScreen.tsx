import React, { useEffect, useMemo, useState } from "react";
import {
  createSkillCatalogItem,
  listSkillsCatalog,
  updateSkillCatalogItem,
  SkillCatalogItem,
} from "../../services/skillsCatalog.service";

export default function SkillsCatalogScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SkillCatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [savingNew, setSavingNew] = useState(false);

  const [showInactive, setShowInactive] = useState(false);
  const [q, setQ] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [rowSavingId, setRowSavingId] = useState<string | null>(null);

  const reload = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await listSkillsCatalog();
      setItems(data);
    } catch (e: any) {
      setError(e?.message || "Could not load skills catalog.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items
      .filter((it) => (showInactive ? true : it.isActive !== false))
      .filter((it) => {
        if (!term) return true;
        const name = String(it.name || "").toLowerCase();
        const key = String(it.key || "").toLowerCase();
        return name.includes(term) || key.includes(term);
      });
  }, [items, showInactive, q]);

  const onAdd = async () => {
    try {
      setError(null);
      setSavingNew(true);
      await createSkillCatalogItem(newName);
      setNewName("");
      await reload();
    } catch (e: any) {
      setError(e?.message || "Could not add skill.");
    } finally {
      setSavingNew(false);
    }
  };

  const startEdit = (it: SkillCatalogItem) => {
    setEditId(it.id);
    setEditName(it.name || "");
    setError(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditName("");
  };

  const saveEdit = async () => {
    if (!editId) return;
    try {
      setError(null);
      setRowSavingId(editId);
      await updateSkillCatalogItem(editId, { name: editName });
      setEditId(null);
      setEditName("");
      await reload();
    } catch (e: any) {
      setError(e?.message || "Could not update skill.");
    } finally {
      setRowSavingId(null);
    }
  };

  const toggleActive = async (it: SkillCatalogItem) => {
    try {
      setError(null);
      setRowSavingId(it.id);
      await updateSkillCatalogItem(it.id, { isActive: !(it.isActive !== false) });
      await reload();
    } catch (e: any) {
      setError(e?.message || "Could not update skill.");
    } finally {
      setRowSavingId(null);
    }
  };

  const canAdd = newName.trim().length > 0 && !savingNew;

  return (
    <div className="page">
      <div className="row">
        <h1 className="h1">Skills Catalog</h1>
      </div>

      <div className="muted mt6">
        QuickCrew-managed list of skills used for worker eligibility and job visibility.
      </div>

      {error ? (
        <div className="card mt18">
          <div className="cardBody">
            <div style={{ color: "#b91c1c", fontWeight: 900 }}>{error}</div>
          </div>
        </div>
      ) : null}

      <div className="card mt18">
        <div className="cardBody">
          <div style={{ fontWeight: 900 }}>Add new skill</div>

          <div className="row mt12" style={{ gap: 10, alignItems: "center" }}>
            <input
              className="input"
              placeholder="e.g. Cleaner"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button className="btn btnPrimary" disabled={!canAdd} onClick={onAdd}>
              {savingNew ? "Adding..." : "Add"}
            </button>
          </div>

          <div className="muted mt10" style={{ fontSize: 12 }}>
            Tip: skills are stored with a normalized “key” for consistent matching later.
          </div>
        </div>
      </div>

      <div className="card mt18">
        <div className="cardBody">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 900 }}>Skills</div>
            <div className="row" style={{ gap: 10, alignItems: "center" }}>
              <input
                className="input"
                placeholder="Search..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                style={{ width: 220 }}
              />
              <label className="muted" style={{ fontWeight: 800, display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                />
                Show inactive
              </label>
              <button className="btn" onClick={reload} disabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="muted mt16">Loading skills...</div>
          ) : filtered.length === 0 ? (
            <div className="muted mt16">No skills found.</div>
          ) : (
            <div className="mt16" style={{ overflowX: "auto" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>Name</th>
                    <th style={{ textAlign: "left" }}>Key</th>
                    <th style={{ textAlign: "left" }}>Status</th>
                    <th style={{ width: 280 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const isEditing = editId === it.id;
                    const rowBusy = rowSavingId === it.id;

                    return (
                      <tr key={it.id}>
                        <td>
                          {isEditing ? (
                            <input
                              className="input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          ) : (
                            <span style={{ fontWeight: 900 }}>{it.name}</span>
                          )}
                        </td>

                        <td className="muted" style={{ fontWeight: 800 }}>
                          {it.key || "—"}
                        </td>

                        <td>
                          <span className={`pill ${it.isActive !== false ? "pillOk" : "pillWarn"}`}>
                            {it.isActive !== false ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
                            {isEditing ? (
                              <>
                                <button className="btn" onClick={cancelEdit} disabled={rowBusy}>
                                  Cancel
                                </button>
                                <button className="btn btnPrimary" onClick={saveEdit} disabled={rowBusy || !editName.trim()}>
                                  {rowBusy ? "Saving..." : "Save"}
                                </button>
                              </>
                            ) : (
                              <>
                                <button className="btn" onClick={() => startEdit(it)} disabled={rowBusy}>
                                  Edit
                                </button>
                                <button className="btn" onClick={() => toggleActive(it)} disabled={rowBusy}>
                                  {rowBusy ? "Updating..." : it.isActive !== false ? "Deactivate" : "Activate"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="muted mt10" style={{ fontSize: 12 }}>
                We use “Deactivate” instead of hard delete to keep history and avoid breaking old references.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}