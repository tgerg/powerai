import { useState, useMemo } from "react";

export default function ResultsTable({ rows }) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const PAGE_SIZE = 10;

  // All hooks must be before any early return
  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter(row =>
      columns.some(col => String(row[col] ?? "").toLowerCase().includes(q))
    );
  }, [rows, search, columns]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [filtered, sortCol, sortDir]);

  // Early return AFTER all hooks
  if (!rows || rows.length === 0) return null;

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "10px", gap: "12px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <p style={{
            fontSize: "10px", fontWeight: 600,
            letterSpacing: "1.2px", color: "var(--text3)",
            textTransform: "uppercase", margin: 0
          }}>Table</p>
          <span style={{
            fontSize: "11px", color: "var(--text3)",
            fontFamily: "var(--font-mono)"
          }}>
            {sorted.length} row{sorted.length !== 1 ? "s" : ""}
          </span>
        </div>
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search..."
          style={{
            padding: "6px 12px", fontSize: "12px",
            width: "200px", background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "6px", color: "var(--text)"
          }}
        />
      </div>

      {/* Table */}
      <div style={{
        overflowX: "auto", borderRadius: "var(--radius)",
        border: "1px solid var(--border)"
      }}>
        <table style={{
          width: "100%", borderCollapse: "collapse",
          fontFamily: "var(--font-mono)", fontSize: "12px"
        }}>
          <thead>
            <tr style={{ background: "var(--surface2)" }}>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  style={{
                    padding: "10px 14px", textAlign: "left",
                    color: sortCol === col ? "var(--accent)" : "var(--text3)",
                    fontWeight: 600, fontSize: "10px",
                    letterSpacing: "0.8px", textTransform: "uppercase",
                    borderBottom: "1px solid var(--border)",
                    whiteSpace: "nowrap", cursor: "pointer",
                    userSelect: "none", transition: "color 0.15s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {col}
                    <span style={{
                      opacity: sortCol === col ? 1 : 0.3,
                      fontSize: "10px", color: "var(--accent)"
                    }}>
                      {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} style={{
                  padding: "24px", textAlign: "center",
                  color: "var(--text3)", fontSize: "13px"
                }}>
                  No results match your search
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < paginated.length - 1 ? "1px solid var(--border)" : "none",
                    transition: "background 0.1s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--surface2)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  {columns.map((col) => (
                    <td key={col} style={{
                      padding: "10px 14px",
                      color: typeof row[col] === "number" ? "var(--accent)" : "var(--text)",
                      whiteSpace: "nowrap"
                    }}>
                      {row[col] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          marginTop: "12px", fontSize: "12px", color: "var(--text2)"
        }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: "11px",
            color: "var(--text3)"
          }}>
            Page {page} of {totalPages}
          </span>

          <div style={{ display: "flex", gap: "4px" }}>
            <button onClick={() => goToPage(1)} disabled={page === 1}
              style={{ padding: "5px 9px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "6px", color: "var(--text2)", fontSize: "11px", cursor: page === 1 ? "not-allowed" : "pointer" }}>«</button>
            <button onClick={() => goToPage(page - 1)} disabled={page === 1}
              style={{ padding: "5px 9px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "6px", color: "var(--text2)", fontSize: "11px", cursor: page === 1 ? "not-allowed" : "pointer" }}>‹</button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 5) p = i + 1;
              else if (page <= 3) p = i + 1;
              else if (page >= totalPages - 2) p = totalPages - 4 + i;
              else p = page - 2 + i;
              return (
                <button key={p} onClick={() => goToPage(p)} style={{
                  padding: "5px 9px",
                  background: page === p ? "var(--accent)" : "var(--surface2)",
                  border: page === p ? "1px solid var(--accent)" : "1px solid var(--border2)",
                  borderRadius: "6px",
                  color: page === p ? "white" : "var(--text2)",
                  fontSize: "11px", cursor: "pointer",
                  fontWeight: page === p ? 600 : 400, minWidth: "30px"
                }}>{p}</button>
              );
            })}

            <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
              style={{ padding: "5px 9px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "6px", color: "var(--text2)", fontSize: "11px", cursor: page === totalPages ? "not-allowed" : "pointer" }}>›</button>
            <button onClick={() => goToPage(totalPages)} disabled={page === totalPages}
              style={{ padding: "5px 9px", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: "6px", color: "var(--text2)", fontSize: "11px", cursor: page === totalPages ? "not-allowed" : "pointer" }}>»</button>
          </div>
        </div>
      )}
    </div>
  );
}