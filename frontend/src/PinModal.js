import { useEffect, useRef } from "react";

export default function PinModal({ dashboards, onPin, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000
    }}>
      <div ref={ref} style={{
        background: "var(--surface)",
        border: "1px solid var(--border2)",
        borderRadius: "var(--radius-lg)",
        padding: "24px",
        width: "340px",
        maxHeight: "400px",
        overflow: "auto"
      }}>
        <p style={{
          fontWeight: 700, fontSize: "15px",
          marginBottom: "16px", color: "var(--text)"
        }}>Pin to Dashboard</p>

        {dashboards.length === 0 ? (
          <p style={{ color: "var(--text3)", fontSize: "13px" }}>
            No dashboards yet — create one from the sidebar first.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {dashboards.map(d => (
              <button
                key={d.id}
                onClick={() => onPin(d)}
                style={{
                  padding: "12px 16px",
                  background: "var(--surface2)",
                  border: "1px solid var(--border2)",
                  borderRadius: "var(--radius)",
                  color: "var(--text)",
                  fontSize: "13px",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.15s"
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border2)"}
              >
                <span>◫</span>
                <span>{d.name}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            marginTop: "16px",
            width: "100%",
            padding: "10px",
            background: "transparent",
            border: "1px solid var(--border)",
            color: "var(--text2)",
            borderRadius: "var(--radius)",
            fontSize: "13px"
          }}
        >Cancel</button>
      </div>
    </div>
  );
}