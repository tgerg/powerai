import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function ConnectionModal({ onClose, onSaved }) {
  const [form, setForm] = useState({
    name: "",
    db_type: "postgresql",
    host: "",
    port: "5432",
    database: "",
    username: "",
    password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const set = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (key === "db_type") {
      setForm(f => ({ ...f, db_type: val, port: val === "postgresql" ? "5432" : "3306" }));
    }
  };

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      await axios.post("/connections", { ...form, port: parseInt(form.port) });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "9px 12px",
    fontSize: "13px",
    borderRadius: "8px"
  };

  const labelStyle = {
    fontSize: "11px",
    fontWeight: 600,
    color: "var(--text3)",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
    marginBottom: "5px",
    display: "block"
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.3)",
      display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 1000
    }}>
      <div ref={ref} style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "28px",
        width: "440px",
        boxShadow: "var(--shadow-lg)"
      }}>
        <p style={{ fontWeight: 700, fontSize: "16px", marginBottom: "20px" }}>
          Connect a Database
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* DB Type */}
          <div>
            <label style={labelStyle}>Database Type</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {["postgresql", "mysql"].map(t => (
                <button
                  key={t}
                  onClick={() => set("db_type", t)}
                  style={{
                    flex: 1, padding: "9px",
                    borderRadius: "8px",
                    background: form.db_type === t ? "rgba(91,79,207,0.1)" : "var(--surface2)",
                    border: form.db_type === t ? "1px solid var(--accent)" : "1px solid var(--border)",
                    color: form.db_type === t ? "var(--accent)" : "var(--text2)",
                    fontWeight: form.db_type === t ? 600 : 400,
                    fontSize: "13px", textTransform: "capitalize"
                  }}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Friendly name */}
          <div>
            <label style={labelStyle}>Connection Name</label>
            <input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Production DB"
              style={inputStyle}
            />
          </div>

          {/* Host + Port */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Host</label>
              <input
                value={form.host}
                onChange={e => set("host", e.target.value)}
                placeholder="localhost or IP"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Port</label>
              <input
                value={form.port}
                onChange={e => set("port", e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Database */}
          <div>
            <label style={labelStyle}>Database Name</label>
            <input
              value={form.database}
              onChange={e => set("database", e.target.value)}
              placeholder="my_database"
              style={inputStyle}
            />
          </div>

          {/* Username + Password */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Username</label>
              <input
                value={form.username}
                onChange={e => set("username", e.target.value)}
                placeholder="postgres"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={form.password}
                onChange={e => set("password", e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
              />
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: "14px",
            padding: "10px 14px",
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.2)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "var(--red)"
          }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px",
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text2)", borderRadius: "8px"
            }}
          >Cancel</button>
          <button
            onClick={submit}
            disabled={loading || !form.host || !form.database || !form.username}
            style={{
              flex: 2, padding: "10px",
              background: "var(--accent)",
              color: "white", fontWeight: 600,
              borderRadius: "8px"
            }}
          >{loading ? "Testing connection..." : "Connect"}</button>
        </div>
      </div>
    </div>
  );
}