import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ConnectionQueryBox({ connection, activeTable, onData, prefill }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (prefill) { setQuestion(prefill); inputRef.current?.focus(); }
  }, [prefill]);

  const ask = async () => {
    if (!question.trim() || !activeTable) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`/connections/${connection.id}/query`, {
        question,
        table_name: activeTable
      });
      onData({ ...res.data, question });
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") ask(); };

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
        <input
          ref={inputRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          placeholder={activeTable ? `Ask anything about ${activeTable}...` : "Select a table first"}
          disabled={!activeTable}
          style={{
            flex: 1, padding: "14px 18px", fontSize: "14px",
            background: activeTable ? "var(--surface)" : "var(--surface2)",
            borderColor: error ? "var(--red)" : "var(--border)"
          }}
        />
        <button
          onClick={ask}
          disabled={!question.trim() || loading || !activeTable}
          style={{
            padding: "14px 24px",
            background: loading ? "var(--surface2)" : "var(--accent)",
            color: loading ? "var(--text2)" : "white",
            fontWeight: 600, fontSize: "13px",
            display: "flex", alignItems: "center", gap: "8px", flexShrink: 0
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: "12px", height: "12px",
                border: "2px solid rgba(0,0,0,0.15)",
                borderTopColor: "var(--text2)",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                display: "inline-block"
              }} />
              Running
            </>
          ) : "Run →"}
        </button>
      </div>
      {error && (
        <div style={{
          marginTop: "10px", padding: "10px 14px",
          background: "rgba(220,38,38,0.06)",
          border: "1px solid rgba(220,38,38,0.2)",
          borderRadius: "var(--radius)",
          fontSize: "12px", color: "var(--red)"
        }}>{error}</div>
      )}
    </div>
  );
}