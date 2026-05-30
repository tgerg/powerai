import { useEffect, useState } from "react";
import axios from "axios";
import DashboardList from "./DashboardList";

export default function Sidebar({
  onSelectQuery, activeQuestion,
  dashboards, activeDashboardId,
  onSelectDashboard, onCreateDashboard,
  onDeleteDashboard, onRenameDashboard,
  connections, activeConnectionId,
  onSelectConnection, onAddConnection,
  onDeleteConnection
}) {
  const [queries, setQueries] = useState([]);

  useEffect(() => {
    axios.get("/queries/list")
      .then((res) => setQueries(res.data))
      .catch(() => {});
  }, []);

  return (
    <div style={{
      width: "240px", minWidth: "240px",
      height: "100vh",
      background: "var(--surface)",
      borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Wordmark */}
      <div style={{
        padding: "20px 20px 16px",
        borderBottom: "1px solid var(--border)"
      }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "18px",
          fontWeight: 800,
          letterSpacing: "-0.3px",
          color: "var(--text)",
          margin: 0
        }}>
          Power<span style={{ color: "var(--accent)" }}>AI</span>
        </h1>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px" }}>

        {/* Databases section */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            padding: "0 8px", marginBottom: "8px"
          }}>
            <p style={{
              fontSize: "10px", fontWeight: 600,
              letterSpacing: "1.2px", color: "var(--text3)",
              textTransform: "uppercase", margin: 0
            }}>Databases</p>
            <button
              onClick={onAddConnection}
              style={{
                background: "none", border: "none",
                color: "var(--accent)", fontSize: "18px",
                lineHeight: 1, padding: "0 4px", cursor: "pointer"
              }}
              title="Add connection"
            >+</button>
          </div>

          {connections.length === 0 ? (
            <p style={{ color: "var(--text3)", fontSize: "12px", padding: "4px 8px" }}>
              No connections yet
            </p>
          ) : (
            connections.map(c => (
              <div
                key={c.id}
                onClick={() => onSelectConnection(c)}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "8px 10px", borderRadius: "8px", cursor: "pointer",
                  background: activeConnectionId === c.id ? "var(--surface2)" : "transparent",
                  border: activeConnectionId === c.id ? "1px solid var(--border2)" : "1px solid transparent",
                  marginBottom: "2px",
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => { if (activeConnectionId !== c.id) e.currentTarget.style.background = "var(--surface2)"; }}
                onMouseLeave={e => { if (activeConnectionId !== c.id) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{
                  width: "6px", height: "6px", borderRadius: "50%",
                  background: "var(--green)", flexShrink: 0
                }} />
                <span style={{
                  flex: 1, fontSize: "12px",
                  color: activeConnectionId === c.id ? "var(--text)" : "var(--text2)",
                  fontWeight: activeConnectionId === c.id ? 600 : 400,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                }}>{c.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); onDeleteConnection(c.id); }}
                  style={{
                    background: "none", border: "none",
                    color: "var(--text3)", fontSize: "11px",
                    cursor: "pointer", padding: "0 2px"
                  }}
                  onMouseEnter={e => e.target.style.color = "var(--red)"}
                  onMouseLeave={e => e.target.style.color = "var(--text3)"}
                >✕</button>
              </div>
            ))
          )}
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)", margin: "4px 8px 16px" }} />

        {/* Dashboards section */}
        <DashboardList
          dashboards={dashboards}
          activeDashboardId={activeDashboardId}
          onSelect={onSelectDashboard}
          onCreate={onCreateDashboard}
          onDelete={onDeleteDashboard}
          onRename={onRenameDashboard}
        />

        {/* Divider */}
        <div style={{ height: "1px", background: "var(--border)", margin: "4px 8px 16px" }} />

        {/* Saved queries section */}
        <p style={{
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "1.2px", color: "var(--text3)",
          textTransform: "uppercase",
          padding: "0 8px", marginBottom: "8px"
        }}>Saved Queries</p>

        {queries.length === 0 ? (
          <p style={{ color: "var(--text3)", fontSize: "12px", padding: "8px" }}>
            No saved queries yet
          </p>
        ) : (
          queries.map((q) => (
            <button
              key={q.id}
              onClick={() => onSelectQuery(q)}
              style={{
                width: "100%", padding: "9px 10px",
                borderRadius: "8px",
                background: activeQuestion === q.question ? "var(--surface2)" : "transparent",
                color: activeQuestion === q.question ? "var(--text)" : "var(--text2)",
                textAlign: "left", fontSize: "12px", lineHeight: "1.4",
                border: activeQuestion === q.question ? "1px solid var(--border2)" : "1px solid transparent",
                marginBottom: "2px",
                display: "flex", alignItems: "flex-start", gap: "8px",
                transition: "all 0.15s"
              }}
              onMouseEnter={e => { if (activeQuestion !== q.question) e.currentTarget.style.background = "var(--surface2)"; }}
              onMouseLeave={e => { if (activeQuestion !== q.question) e.currentTarget.style.background = "transparent"; }}
            >
              <span style={{ color: "var(--text3)", marginTop: "1px", flexShrink: 0 }}>⌘</span>
              <span style={{
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical"
              }}>{q.question}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}