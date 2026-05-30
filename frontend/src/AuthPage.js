import { useState } from "react";
import axios from "axios";

function AuthForm({ mode, onSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true);
    setError("");
    try {
      if (mode === "register") {
        await axios.post("/auth/register", { email, password });
        const res = await axios.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
      } else {
        const res = await axios.post("/auth/login", { email, password });
        localStorage.setItem("token", res.data.token);
      }
      onSuccess();
    } catch {
      setError(mode === "login" ? "Invalid email or password." : "Registration failed. Try a different email.");
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") submit(); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <input
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKey}
        style={{ padding: "12px 16px", width: "100%" }}
      />
      <input
        placeholder="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={handleKey}
        style={{ padding: "12px 16px", width: "100%" }}
      />
      {error && (
        <p style={{ color: "var(--red)", fontSize: "12px", margin: 0 }}>{error}</p>
      )}
      <button
        onClick={submit}
        disabled={loading || !email || !password}
        style={{
          padding: "12px",
          background: "var(--accent)",
          color: "white",
          fontWeight: 600,
          fontSize: "14px",
          marginTop: "4px",
          borderRadius: "var(--radius)"
        }}
      >
        {loading ? "..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </div>
  );
}

export default function AuthPage({ onAuth }) {
  const [tab, setTab] = useState("login");

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px"
    }}>
      <div className="fade-up" style={{ width: "100%", maxWidth: "400px" }}>
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "var(--text)",
            marginBottom: "6px"
          }}>
            Power<span style={{ color: "var(--accent)" }}>AI</span>
          </h1>
          <p style={{ color: "var(--text3)", fontSize: "13px" }}>
            AI-powered analytics for everyone
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-lg)"
        }}>
          {/* Tabs */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            borderBottom: "1px solid var(--border)"
          }}>
            {["login", "register"].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "16px",
                  background: tab === t ? "var(--bg)" : "transparent",
                  color: tab === t ? "var(--text)" : "var(--text3)",
                  borderRadius: 0,
                  fontWeight: tab === t ? 600 : 400,
                  fontSize: "13px",
                  borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent"
                }}
              >
                {t === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <div style={{ padding: "28px" }}>
            <AuthForm mode={tab} onSuccess={onAuth} />
          </div>
        </div>
      </div>
    </div>
  );
}