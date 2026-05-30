import { useEffect, useState } from "react";
import axios from "axios";

export default function Insights({ trigger, activeTable, connectionId }) {  
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trigger || !activeTable) return;
    setLoading(true);
    setInsights([]);

    const url = connectionId
      ? `/connections/${connectionId}/insights`
      : "/insights";

    axios.post(url, { table_name: activeTable })
      .then(res => setInsights(res.data.insights))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trigger, activeTable, connectionId]);

  if (!trigger) return null;

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "20px",
      marginBottom: "28px"
    }} className="fade-up">
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "16px"
      }}>
        <span style={{
          width: "6px", height: "6px",
          borderRadius: "50%",
          background: loading ? "var(--amber)" : "var(--green)",
          animation: loading ? "pulse 1s infinite" : "none",
          flexShrink: 0
        }} />
        <p style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "1.2px",
          color: "var(--text3)",
          textTransform: "uppercase",
          margin: 0
        }}>AI Insights</p>
      </div>

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              height: "14px",
              width: `${60 + i * 10}%`,
              background: "var(--surface2)",
              borderRadius: "4px",
              animation: "pulse 1.2s infinite",
              animationDelay: `${i * 0.1}s`
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {insights.map((insight, i) => (
            <div
              key={i}
              className="fade-up"
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "flex-start",
                animationDelay: `${i * 0.06}s`
              }}
            >
              <span style={{
                color: "var(--accent)",
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                marginTop: "1px",
                flexShrink: 0,
                opacity: 0.7
              }}>0{i + 1}</span>
              <p style={{
                color: "var(--text2)",
                fontSize: "13px",
                lineHeight: "1.5",
                margin: 0
              }}>{insight}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}