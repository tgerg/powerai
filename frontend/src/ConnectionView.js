import { useState, useEffect } from "react";
import axios from "axios";
import ConnectionQueryBox from "./ConnectionQueryBox";
import ChartView from "./ChartView";
import ResultsTable from "./ResultsTable";
import Insights from "./Insights";
import Suggestions from "./Suggestions";

export default function ConnectionView({ connection, onPin, dashboards }) {
  const [tables, setTables] = useState([]);
  const [activeTable, setActiveTable] = useState(null);
  const [data, setData] = useState(null);
  const [prefill, setPrefill] = useState("");
  const [insightsTrigger, setInsightsTrigger] = useState(0);
  const [loadingTables, setLoadingTables] = useState(true);

  useEffect(() => {
    if (!connection) return;
    setLoadingTables(true);
    setActiveTable(null);
    setData(null);
    axios.get(`/connections/${connection.id}/tables`)
      .then(res => setTables(res.data.tables))
      .catch(() => {})
      .finally(() => setLoadingTables(false));
  }, [connection]);

  const selectTable = (table) => {
    setActiveTable(table);
    setData(null);
    setInsightsTrigger(t => t + 1);
  };

  if (!connection) return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      height: "400px", color: "var(--text3)", gap: "12px"
    }}>
      <p style={{ fontSize: "32px" }}>🔌</p>
      <p style={{ fontWeight: 600, color: "var(--text2)" }}>No connection selected</p>
      <p style={{ fontSize: "13px" }}>Add a connection from the sidebar</p>
    </div>
  );

  return (
    <div style={{ maxWidth: "860px" }}>
      {/* Connection header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
        marginBottom: "20px", padding: "12px 16px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)"
      }}>
        <span style={{
          width: "8px", height: "8px",
          borderRadius: "50%",
          background: "var(--green)",
          flexShrink: 0
        }} />
        <span style={{ fontWeight: 600, fontSize: "13px" }}>{connection.name}</span>
        <span style={{
          fontSize: "11px", color: "var(--text3)",
          fontFamily: "var(--font-mono)"
        }}>{connection.db_type} · {connection.host} · {connection.database}</span>
      </div>

      {/* Table picker */}
      <div style={{ marginBottom: "20px" }}>
        <p style={{
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "1.2px", color: "var(--text3)",
          textTransform: "uppercase", marginBottom: "8px"
        }}>Select Table</p>

        {loadingTables ? (
          <div style={{ display: "flex", gap: "8px" }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: "30px", width: "80px",
                background: "var(--surface2)",
                borderRadius: "6px",
                animation: "pulse 1.2s infinite",
                animationDelay: `${i * 0.1}s`
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {tables.map(t => (
              <button
                key={t}
                onClick={() => selectTable(t)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  background: activeTable === t ? "rgba(91,79,207,0.1)" : "var(--surface)",
                  border: activeTable === t ? "1px solid var(--accent)" : "1px solid var(--border)",
                  color: activeTable === t ? "var(--accent)" : "var(--text2)",
                  fontSize: "12px",
                  fontFamily: "var(--font-mono)",
                  fontWeight: activeTable === t ? 600 : 400
                }}
              >{t}</button>
            ))}
          </div>
        )}
      </div>

      {activeTable && (
        <>
          <ConnectionQueryBox
            connection={connection}
            activeTable={activeTable}
            onData={setData}
            prefill={prefill}
          />

          <Suggestions
            trigger={insightsTrigger}
            onSelect={q => setPrefill(q)}
            activeTable={activeTable}
            connectionId={connection.id}
          />

          <Insights
            trigger={insightsTrigger}
            activeTable={activeTable}
            connectionId={connection.id}
          />

          {data && data.rows?.length > 0 && (
            <div className="fade-up">
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                marginBottom: "20px", overflow: "hidden",
                boxShadow: "var(--shadow)"
              }}>
                <div style={{ padding: "8px 14px", borderBottom: "1px solid var(--border)" }}>
                  <span style={{
                    fontSize: "10px", fontWeight: 600,
                    letterSpacing: "1px", color: "var(--text3)",
                    textTransform: "uppercase"
                  }}>Generated SQL</span>
                </div>
                <pre style={{
                  margin: 0, padding: "14px",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px", color: "var(--accent)",
                  overflowX: "auto", lineHeight: "1.6"
                }}>{data.sql}</pre>
              </div>

              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <button
                  onClick={() => onPin(data, connection.name)}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(91,79,207,0.1)",
                    border: "1px solid rgba(91,79,207,0.2)",
                    color: "var(--accent)",
                    fontSize: "12px", fontWeight: 600, borderRadius: "6px"
                  }}
                >📌 Pin to Dashboard</button>
              </div>

              <ChartView rows={data.rows} chartType={data.chartType} />
              <ResultsTable rows={data.rows} />
            </div>
          )}
        </>
      )}
    </div>
  );
}