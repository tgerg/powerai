import { useEffect, useState, useRef } from "react";
import axios from "axios";

export default function FileSwitcher({ activeTable, onSwitch, onReplace, onDelete }) {
  const [files, setFiles] = useState([]);
  const [replacingId, setReplacingId] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const fileInputRef = useRef(null);

  const load = () => {
    axios.get("/files")
      .then(res => setFiles(res.data.files))
      .catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const deleteFile = async (e, id) => {
    e.stopPropagation();
    await axios.delete(`/files/${id}`);
    // If we deleted the active file, notify parent
    const deletedFile = files.find(f => f.id === id);
    if (deletedFile?.table_name === activeTable) {
      if (onDelete) onDelete();
    }
    load();
  };

  const handleReplaceClick = (e, id) => {
    e.stopPropagation();
    setReplacingId(id);
    fileInputRef.current.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files[0];
    if (!file || !replacingId) return;

    setReplacing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`/files/${replacingId}/replace`, formData);
      const updatedCount = res.data.panels_updated;
      alert(`✓ Dataset replaced. ${updatedCount} dashboard panel${updatedCount !== 1 ? "s" : ""} updated automatically.`);
      load();
      if (onReplace) onReplace();
    } catch (e) {
      alert("Replace failed — make sure the new file has compatible columns.");
    } finally {
      setReplacing(false);
      setReplacingId(null);
      e.target.value = "";
    }
  };

  if (files.length === 0) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Hidden file input for replace */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls,.json"
        onChange={handleFileSelected}
        style={{ display: "none" }}
      />

      <p style={{
        fontSize: "10px", fontWeight: 600,
        letterSpacing: "1.2px", color: "var(--text3)",
        textTransform: "uppercase", marginBottom: "8px"
      }}>Saved Files</p>

      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {files.map(f => (
          <div
            key={f.id}
            onClick={() => onSwitch(f)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              border: activeTable === f.table_name
                ? "1px solid var(--accent)"
                : "1px solid var(--border2)",
              background: activeTable === f.table_name
                ? "rgba(124,106,255,0.1)"
                : "var(--surface)",
              cursor: "pointer",
              transition: "all 0.15s"
            }}
          >
            <span style={{ fontSize: "12px" }}>📄</span>
            <span style={{
              flex: 1,
              fontSize: "12px",
              color: activeTable === f.table_name ? "var(--accent2)" : "var(--text2)",
              fontWeight: activeTable === f.table_name ? 600 : 400
            }}>
              {f.file_name}
            </span>

            {/* Replace button — only shows on active file */}
            {activeTable === f.table_name && (
              <button
                onClick={(e) => handleReplaceClick(e, f.id)}
                disabled={replacing}
                title="Replace dataset"
                style={{
                  padding: "3px 8px",
                  background: "rgba(124,106,255,0.15)",
                  border: "1px solid rgba(124,106,255,0.3)",
                  borderRadius: "5px",
                  color: "var(--accent2)",
                  fontSize: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
                onMouseEnter={e => e.target.style.background = "rgba(124,106,255,0.25)"}
                onMouseLeave={e => e.target.style.background = "rgba(124,106,255,0.15)"}
              >
                {replacing ? "Updating..." : "↺ Replace"}
              </button>
            )}

            <button
              onClick={(e) => deleteFile(e, f.id)}
              style={{
                background: "none", border: "none",
                color: "var(--text3)", fontSize: "11px",
                padding: "0 2px", cursor: "pointer", lineHeight: 1
              }}
              onMouseEnter={e => e.target.style.color = "var(--red)"}
              onMouseLeave={e => e.target.style.color = "var(--text3)"}
            >✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}