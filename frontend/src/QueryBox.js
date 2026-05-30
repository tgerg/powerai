import { useState, useEffect, useRef } from "react";
import axios from "axios";

export default function QueryBox({ onData, onUpload, prefill, activeTable }) {
  const [question, setQuestion] = useState("");
  const [uploadStatus, setUploadStatus] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempt] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (prefill) {
      setQuestion(prefill);
      inputRef.current?.focus();
    }
  }, [prefill]);

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setUploadStatus("uploading");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("/upload", formData);
      setUploadStatus("done");
      onUpload(res.data); // pass full response so App.js gets table_name
    } catch {
      setUploadStatus("error");
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await axios.post("/query", {
        question,
        table_name: activeTable
      });
      onData({ ...res.data, question });
    } catch (e) {
      const msg = e.response?.data?.error || "Something went wrong.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter" && !e.shiftKey) ask(); };

  const getLoadingText = () => {
    if (attempt === 1) return "Generating query...";
    if (attempt === 2) return "Retrying...";
    if (attempt === 3) return "One more try...";
    return "Running...";
  };

  return (
    <div style={{ marginBottom: "24px" }}>
      {/* Upload area */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "12px 16px",
        marginBottom: "12px",
        display: "flex",
        alignItems: "center",
        gap: "12px"
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", flexShrink: 0 }}>
          <input type="file" accept=".csv,.xlsx,.xls,.json" onChange={uploadFile} style={{ display: "none" }} />
          <span style={{
            padding: "6px 14px",
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            borderRadius: "6px",
            fontSize: "12px",
            color: "var(--text2)",
            fontWeight: 500
          }}>
            ↑ Upload CSV, Excel or JSON
          </span>
        </label>

        <div style={{ flex: 1, fontSize: "12px" }}>
          {!uploadStatus && !activeTable && (
            <span style={{ color: "var(--text3)" }}>No file selected</span>
          )}
          {uploadStatus === "uploading" && (
            <span style={{ color: "var(--amber)", animation: "pulse 1.2s infinite" }}>
              Uploading {fileName}...
            </span>
          )}
          {uploadStatus === "done" && (
            <span style={{ color: "var(--green)" }}>✓ {fileName}</span>
          )}
          {uploadStatus === "error" && (
            <span style={{ color: "var(--red)" }}>Upload failed — check the file</span>
          )}
          {!uploadStatus && activeTable && (
            <span style={{ color: "var(--text3)" }}>Upload a new file to replace</span>
          )}
        </div>
      </div>

      {/* Query input */}
      <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
        <input
          ref={inputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything about your data..."
          disabled={uploadStatus !== "done" && !activeTable}
          style={{
            flex: 1,
            padding: "14px 18px",
            fontSize: "14px",
            background: (uploadStatus === "done" || activeTable) ? "var(--surface)" : "var(--bg)",
            borderColor: error ? "var(--red)" : question ? "var(--border2)" : "var(--border)"
          }}
        />
        <button
          onClick={ask}
          disabled={!question.trim() || loading || (uploadStatus !== "done" && !activeTable)}
          style={{
            padding: "14px 24px",
            background: loading ? "var(--surface2)" : "var(--accent)",
            color: "white",
            fontWeight: 600,
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexShrink: 0
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: "12px", height: "12px",
                border: "2px solid rgba(255,255,255,0.3)",
                borderTopColor: "white",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
                display: "inline-block"
              }} />
              {getLoadingText()}
            </>
          ) : "Run →"}
        </button>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginTop: "10px",
          padding: "10px 14px",
          background: "rgba(248,113,113,0.08)",
          border: "1px solid rgba(248,113,113,0.2)",
          borderRadius: "var(--radius)",
          fontSize: "12px",
          color: "var(--red)",
          lineHeight: "1.5"
        }}>
          {error}
        </div>
      )}
    </div>
  );
}