import { useEffect, useState } from "react";
import axios from "axios";

export default function Suggestions({ trigger, onSelect, activeTable, connectionId }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trigger || !activeTable) return;
    setLoading(true);
    setSuggestions([]);

    const url = connectionId
      ? `/connections/${connectionId}/suggestions`
      : "/suggestions";

    axios.post(url, { table_name: activeTable })
      .then((res) => setSuggestions(res.data.suggestions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trigger, activeTable, connectionId]);

  if (!trigger) return null;

  return (
    <div style={{ marginBottom: "20px" }} className="fade-up">
      <p style={{
        fontSize: "10px",
        fontWeight: 600,
        letterSpacing: "1.2px",
        color: "var(--text3)",
        textTransform: "uppercase",
        marginBottom: "10px"
      }}>Suggested questions</p>

      {loading ? (
        <div style={{ display: "flex", gap: "8px" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: "30px",
              width: `${80 + i * 30}px`,
              background: "var(--surface2)",
              borderRadius: "99px",
              animation: "pulse 1.2s infinite",
              animationDelay: `${i * 0.1}s`
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {suggestions.map((q, i) => (
            <button
              key={i}
              onClick={() => onSelect(q)}
              className="fade-up"
              style={{
                padding: "6px 14px",
                borderRadius: "99px",
                background: "transparent",
                border: "1px solid var(--border2)",
                color: "var(--text2)",
                fontSize: "12px",
                animationDelay: `${i * 0.05}s`,
                transition: "all 0.15s"
              }}
              onMouseEnter={e => {
                e.target.style.borderColor = "var(--accent)";
                e.target.style.color = "var(--accent)";
                e.target.style.background = "rgba(91,79,207,0.06)";
              }}
              onMouseLeave={e => {
                e.target.style.borderColor = "var(--border2)";
                e.target.style.color = "var(--text2)";
                e.target.style.background = "transparent";
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}