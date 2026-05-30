import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ChartView from "./ChartView";
import ResultsTable from "./ResultsTable";

const downloadCSV = (rows, question) => {
  if (!rows || rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const header = columns.join(",");
  const body = rows.map(row =>
    columns.map(col => {
      const val = row[col] ?? "";
      return String(val).includes(",") || String(val).includes('"')
        ? `"${String(val).replace(/"/g, '""')}"`
        : val;
    }).join(",")
  ).join("\n");
  const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${question.slice(0, 40).replace(/[^a-z0-9]/gi, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const SIZE_OPTIONS = [
  { key: "half",  label: "Half",  icon: "▪",  desc: "1/2 width" },
  { key: "full",  label: "Full",  icon: "▬",  desc: "Full width" },
  { key: "tall",  label: "Tall",  icon: "▮",  desc: "1/2 wide, tall" },
  { key: "large", label: "Large", icon: "⬛", desc: "Full width, tall" },
];

const SIZE_TO_GRID = {
  half:  { gridColumn: "span 1", maxHeight: "400px" },
  full:  { gridColumn: "span 2", maxHeight: "400px" },
  tall:  { gridColumn: "span 1", maxHeight: "650px" },
  large: { gridColumn: "span 2", maxHeight: "650px" },
};

function Panel({ panel, activeFilter, onFilter, onRemove, dashboardId }) {
  const [rows, setRows] = useState(panel.rows);
  const [loading, setLoading] = useState(false);
  const [size, setSize] = useState(panel.size || "half");
  const [showSizePicker, setShowSizePicker] = useState(false);
  const [name, setName] = useState(panel.name || "");
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [showQuery, setShowQuery] = useState(false);
  const sizePickerRef = useRef(null);

  // Close size picker on outside click
  useEffect(() => {
    if (!showSizePicker) return;
    const handler = (e) => {
      if (sizePickerRef.current && !sizePickerRef.current.contains(e.target)) {
        setShowSizePicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSizePicker]);

  // Apply cross-filter
  useEffect(() => {
    if (!activeFilter) {
      setRows(panel.rows);
      return;
    }
    setLoading(true);
    axios.post("/query/filtered", {
      sql: panel.sql,
      filter_column: activeFilter.column,
      filter_value: activeFilter.value
    })
      .then(res => setRows(res.data.rows))
      .catch(() => setRows(panel.rows))
      .finally(() => setLoading(false));
  }, [activeFilter, panel.sql, panel.rows]);

  const handleChartClick = (chartData) => {
    if (!chartData?.activePayload?.[0]) return;
    const payload = chartData.activePayload[0];
    const allKeys = Object.keys(panel.rows[0] || {});
    const stringKeys = allKeys.filter(k => typeof panel.rows[0][k] === "string");
    const column = stringKeys[0] || allKeys[0];
    const value = payload.payload[column];
    if (activeFilter?.value === String(value)) {
      onFilter(null);
    } else {
      onFilter({ column, value: String(value) });
    }
  };

  const startEdit = () => {
    setEditValue(name || panel.question);
    setEditing(true);
  };

  const saveEdit = async () => {
    const trimmed = editValue.trim();
    if (!trimmed) { setEditing(false); return; }
    setName(trimmed);
    setEditing(false);
    await axios.post(
      `/dashboards/${dashboardId}/panels/${panel.id}/rename`,
      { name: trimmed }
    );
  };

  const handleKey = (e) => {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditing(false);
  };

  const displayName = name || panel.question;
  const gridStyle = SIZE_TO_GRID[size] || SIZE_TO_GRID.half;

  return (
    <div style={{
      gridColumn: gridStyle.gridColumn,
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      transition: "all 0.2s"
    }}>
      {/* Panel header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0, flex: 1 }}>
          {loading && (
            <span style={{
              width: "7px", height: "7px",
              borderRadius: "50%",
              background: "var(--accent)",
              animation: "pulse 1s infinite",
              flexShrink: 0
            }} />
          )}

          {editing ? (
            <input
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onKeyDown={handleKey}
              onBlur={saveEdit}
              style={{
                flex: 1, padding: "3px 8px",
                fontSize: "12px", fontWeight: 500,
                background: "var(--surface2)",
                border: "1px solid var(--accent)",
                borderRadius: "5px", color: "var(--text)"
              }}
            />
          ) : (
            <p
              onClick={startEdit}
              title="Click to rename"
              style={{
                fontSize: "12px", fontWeight: 500,
                color: "var(--text)", margin: 0,
                overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap", cursor: "text", flex: 1
              }}
            >{displayName}</p>
          )}

          <button
            onClick={() => setShowQuery(q => !q)}
            title={showQuery ? "Hide query" : "Show original query"}
            style={{
              background: "none", border: "none",
              color: showQuery ? "var(--accent)" : "var(--text3)",
              fontSize: "11px", cursor: "pointer",
              padding: "0 4px", flexShrink: 0,
              fontFamily: "var(--font-mono)"
            }}
          >SQL</button>

          {panel.fileName && (
            <span style={{
              fontSize: "10px", padding: "2px 7px",
              background: "var(--surface2)",
              border: "1px solid var(--border2)",
              borderRadius: "99px", color: "var(--text3)",
              whiteSpace: "nowrap", flexShrink: 0
            }}>{panel.fileName}</span>
          )}
        </div>

        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          {/* Export */}
          <button
            onClick={() => downloadCSV(rows, displayName)}
            title="Export CSV"
            style={{
              padding: "4px 8px", background: "var(--surface2)",
              border: "1px solid var(--border2)",
              color: "var(--text2)", fontSize: "11px", borderRadius: "6px"
            }}
          >↓</button>

          {/* Size picker */}
          <div ref={sizePickerRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowSizePicker(s => !s)}
              title="Resize panel"
              style={{
                padding: "4px 8px", background: "var(--surface2)",
                border: "1px solid var(--border2)",
                color: "var(--text2)", fontSize: "11px", borderRadius: "6px"
              }}
            >⊞</button>

            {showSizePicker && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "var(--shadow-lg)",
                zIndex: 100,
                overflow: "hidden",
                minWidth: "150px"
              }}>
                {SIZE_OPTIONS.map((s, i) => (
                  <button
                    key={s.key}
                    onClick={() => { setSize(s.key); setShowSizePicker(false); }}
                    style={{
                      width: "100%",
                      padding: "9px 14px",
                      background: size === s.key ? "rgba(91,79,207,0.08)" : "transparent",
                      border: "none",
                      borderBottom: i < SIZE_OPTIONS.length - 1 ? "1px solid var(--border)" : "none",
                      color: size === s.key ? "var(--accent)" : "var(--text2)",
                      fontSize: "12px",
                      fontWeight: size === s.key ? 600 : 400,
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      borderRadius: 0
                    }}
                    onMouseEnter={e => { if (size !== s.key) e.currentTarget.style.background = "var(--surface2)"; }}
                    onMouseLeave={e => { if (size !== s.key) e.currentTarget.style.background = size === s.key ? "rgba(91,79,207,0.08)" : "transparent"; }}
                  >
                    <span style={{ fontSize: "13px" }}>{s.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div>{s.label}</div>
                      <div style={{ fontSize: "10px", color: "var(--text3)", fontWeight: 400 }}>{s.desc}</div>
                    </div>
                    {size === s.key && (
                      <span style={{ color: "var(--accent)", fontSize: "12px" }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remove */}
          <button
            onClick={() => onRemove(panel.id)}
            style={{
              padding: "4px 8px", background: "transparent",
              border: "1px solid transparent",
              color: "var(--text3)", fontSize: "13px", borderRadius: "6px"
            }}
            onMouseEnter={e => { e.target.style.color = "var(--red)"; e.target.style.borderColor = "var(--red)"; }}
            onMouseLeave={e => { e.target.style.color = "var(--text3)"; e.target.style.borderColor = "transparent"; }}
          >✕</button>
        </div>
      </div>

      {/* Query reveal */}
      {showQuery && (
        <div style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)"
        }}>
          <p style={{
            fontSize: "10px", fontWeight: 600,
            letterSpacing: "1px", color: "var(--text3)",
            textTransform: "uppercase", marginBottom: "6px"
          }}>Original Query</p>
          <p style={{
            fontSize: "12px", color: "var(--text2)",
            margin: "0 0 8px"
          }}>{panel.question}</p>
          <pre style={{
            margin: 0, fontFamily: "var(--font-mono)",
            fontSize: "11px", color: "var(--accent)",
            overflowX: "auto", lineHeight: "1.5"
          }}>{panel.sql}</pre>
        </div>
      )}

      {/* Panel content */}
      <div style={{ padding: "16px", overflow: "auto", maxHeight: gridStyle.maxHeight }}>
        <ChartView rows={rows} chartType={panel.chartType} onChartClick={handleChartClick} />
        <ResultsTable rows={rows} />
      </div>
    </div>
  );
}

export default function DashboardView({ dashboard, onPanelRemoved }) {
  const [panels, setPanels] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dashboard) return;
    setLoading(true);
    setActiveFilter(null);
    axios.get(`/dashboards/${dashboard.id}/panels`)
      .then(res => setPanels(res.data.panels))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dashboard]);

  const removePanel = async (panelId) => {
    await axios.delete(`/dashboards/${dashboard.id}/panels/${panelId}`);
    setPanels(prev => prev.filter(p => p.id !== panelId));
    if (onPanelRemoved) onPanelRemoved();
  };

  if (!dashboard) return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "400px", gap: "16px", color: "var(--text3)"
    }}>
      <div style={{
        width: "64px", height: "64px",
        border: "2px dashed var(--border2)",
        borderRadius: "16px",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "24px"
      }}>◫</div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600, color: "var(--text2)", marginBottom: "4px" }}>No dashboard selected</p>
        <p style={{ fontSize: "13px" }}>Create one from the sidebar</p>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
      {[1, 2].map(i => (
        <div key={i} style={{
          height: "280px", background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          animation: "pulse 1.2s infinite",
          animationDelay: `${i * 0.1}s`
        }} />
      ))}
    </div>
  );

  if (panels.length === 0) return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "400px", gap: "16px", color: "var(--text3)"
    }}>
      <div style={{
        width: "64px", height: "64px",
        border: "2px dashed var(--border2)",
        borderRadius: "16px",
        display: "flex", alignItems: "center",
        justifyContent: "center", fontSize: "24px"
      }}>◫</div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 600, color: "var(--text2)", marginBottom: "4px" }}>{dashboard.name} is empty</p>
        <p style={{ fontSize: "13px" }}>Run a query and pin it to this dashboard</p>
      </div>
    </div>
  );

  return (
    <div>
      {activeFilter && (
        <div style={{
          display: "flex", alignItems: "center", gap: "10px",
          marginBottom: "16px", padding: "10px 14px",
          background: "rgba(91,79,207,0.06)",
          border: "1px solid rgba(91,79,207,0.15)",
          borderRadius: "var(--radius)", fontSize: "12px"
        }}>
          <span style={{ color: "var(--text2)" }}>Filtering by</span>
          <span style={{
            padding: "2px 10px",
            background: "rgba(91,79,207,0.1)",
            border: "1px solid rgba(91,79,207,0.2)",
            borderRadius: "99px", color: "var(--accent)",
            fontFamily: "var(--font-mono)"
          }}>
            {activeFilter.column} = "{activeFilter.value}"
          </span>
          <button
            onClick={() => setActiveFilter(null)}
            style={{
              background: "transparent", border: "none",
              color: "var(--text3)", cursor: "pointer",
              fontSize: "13px", marginLeft: "auto"
            }}
            onMouseEnter={e => e.target.style.color = "var(--text)"}
            onMouseLeave={e => e.target.style.color = "var(--text3)"}
          >✕ Clear filter</button>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        alignItems: "start"
      }}>
        {panels.map(panel => (
          <Panel
            key={panel.id}
            panel={panel}
            activeFilter={activeFilter}
            onFilter={setActiveFilter}
            onRemove={removePanel}
            dashboardId={dashboard.id}
          />
        ))}
      </div>
    </div>
  );
}