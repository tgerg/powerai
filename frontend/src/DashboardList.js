import { useState } from "react";
import axios from "axios";

export default function DashboardList({
  dashboards,
  activeDashboardId,
  onSelect,
  onCreate,
  onDelete,
  onRename
}) {
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await onCreate(newName.trim());
    setNewName("");
    setCreating(false);
  };

  const handleRename = async (id) => {
    if (!renameValue.trim()) return;
    await onRename(id, renameValue.trim());
    setRenamingId(null);
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px"
      }}>
        <p style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "1.2px",
          color: "var(--text3)",
          textTransform: "uppercase",
          margin: 0
        }}>Dashboards</p>
        <button
          onClick={() => setCreating(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent2)",
            fontSize: "18px",
            lineHeight: 1,
            padding: "0 4px",
            cursor: "pointer"
          }}
          title="New dashboard"
        >+</button>
      </div>

      {creating && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "8px" }}>
          <input
            autoFocus
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setCreating(false); }}
            placeholder="Dashboard name..."
            style={{ flex: 1, padding: "6px 10px", fontSize: "12px" }}
          />
          <button
            onClick={handleCreate}
            style={{
              padding: "6px 10px",
              background: "var(--accent)",
              color: "white",
              borderRadius: "6px",
              fontSize: "12px"
            }}
          >✓</button>
        </div>
      )}

      {dashboards.length === 0 && !creating && (
        <p style={{ color: "var(--text3)", fontSize: "12px", padding: "4px 0" }}>
          No dashboards yet
        </p>
      )}

      {dashboards.map(d => (
        <div key={d.id} style={{ marginBottom: "2px" }}>
          {renamingId === d.id ? (
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                autoFocus
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleRename(d.id); if (e.key === "Escape") setRenamingId(null); }}
                style={{ flex: 1, padding: "6px 10px", fontSize: "12px" }}
              />
              <button
                onClick={() => handleRename(d.id)}
                style={{
                  padding: "6px 10px",
                  background: "var(--accent)",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "12px"
                }}
              >✓</button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "8px",
                background: activeDashboardId === d.id ? "var(--surface2)" : "transparent",
                border: activeDashboardId === d.id ? "1px solid var(--border2)" : "1px solid transparent",
                cursor: "pointer",
                group: true
              }}
              onClick={() => onSelect(d)}
            >
              <span style={{ fontSize: "12px" }}>◫</span>
              <span style={{
                flex: 1,
                fontSize: "12px",
                color: activeDashboardId === d.id ? "var(--text)" : "var(--text2)",
                fontWeight: activeDashboardId === d.id ? 600 : 400,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}>{d.name}</span>
              <div style={{ display: "flex", gap: "2px", opacity: 0.6 }}>
                <button
                  onClick={e => { e.stopPropagation(); setRenamingId(d.id); setRenameValue(d.name); }}
                  style={{
                    background: "none", border: "none",
                    color: "var(--text3)", fontSize: "11px",
                    cursor: "pointer", padding: "0 3px"
                  }}
                  title="Rename"
                >✎</button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(d.id); }}
                  style={{
                    background: "none", border: "none",
                    color: "var(--text3)", fontSize: "11px",
                    cursor: "pointer", padding: "0 3px"
                  }}
                  onMouseEnter={e => e.target.style.color = "var(--red)"}
                  onMouseLeave={e => e.target.style.color = "var(--text3)"}
                  title="Delete"
                >✕</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}