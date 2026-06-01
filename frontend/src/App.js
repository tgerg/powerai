function App() {
  // ALL state and effects must be here before any returns
  const [loggedIn, setLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [data, setData] = useState(null);
  const [uploadTrigger, setUploadTrigger] = useState(0);
  const [prefill, setPrefill] = useState("");
  const [activeFile, setActiveFile] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [activeDashboard, setActiveDashboard] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [connections, setConnections] = useState([]);
  const [activeConnection, setActiveConnection] = useState(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [view, setView] = useState("query");
  const [savedQueriesVersion, setSavedQueriesVersion] = useState(0);

  // Auth check on mount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token && token !== "null" && token !== "undefined") {
      setLoggedIn(true);
    }
    setAuthReady(true);
  }, []);

  // Load dashboards when logged in
  useEffect(() => {
    if (!loggedIn) return;
    axios.get("/dashboards")
      .then(res => setDashboards(res.data.dashboards))
      .catch(() => {});
  }, [loggedIn]);

  // Load connections when logged in
  useEffect(() => {
    if (!loggedIn) return;
    axios.get("/connections")
      .then(res => setConnections(res.data.connections))
      .catch(() => {});
  }, [loggedIn]);

  // Early returns after all hooks
  if (!authReady) return null;
  if (!loggedIn) return <AuthPage onAuth={() => setLoggedIn(true)} />;

  const loadConnections = () => {
    axios.get("/connections")
      .then(res => setConnections(res.data.connections))
      .catch(() => {});
  };

  // Dashboard handlers
  const createDashboard = async (name) => {
    const res = await axios.post("/dashboards", { name });
    const newD = { id: res.data.id, name };
    setDashboards(prev => [...prev, newD]);
    setActiveDashboard(newD);
    setView("dashboard");
  };

  const deleteDashboard = async (id) => {
    await axios.delete(`/dashboards/${id}`);
    setDashboards(prev => prev.filter(d => d.id !== id));
    if (activeDashboard?.id === id) setActiveDashboard(null);
  };

  const renameDashboard = async (id, name) => {
    await axios.post(`/dashboards/${id}/rename`, { name });
    setDashboards(prev => prev.map(d => d.id === id ? { ...d, name } : d));
    if (activeDashboard?.id === id) setActiveDashboard(prev => ({ ...prev, name }));
  };

  // Connection handlers
  const deleteConnection = async (id) => {
    await axios.delete(`/connections/${id}`);
    setConnections(prev => prev.filter(c => c.id !== id));
    if (activeConnection?.id === id) {
      setActiveConnection(null);
      setView("query");
    }
  };

  // Pin to dashboard
  const pinToBoard = async (dashboard, panelData, sourceName) => {
    await axios.post(`/dashboards/${dashboard.id}/panels`, {
      question: panelData.question,
      sql: panelData.sql,
      rows: panelData.rows,
      chartType: panelData.chartType,
      fileName: sourceName || activeFile?.file_name || ""
    });
    setShowPinModal(false);
    setActiveDashboard(dashboard);
    setView("dashboard");
  };

  // CSV export helper
  const downloadCSV = (rows, question) => {
    if (!rows || rows.length === 0) return;
    const columns = Object.keys(rows[0]);
    const header = columns.join(",");
    const body = rows.map(row =>
      columns.map(col => {
        const val = row[col] ?? "";
        return String(val).includes(",") || String(val).includes('"')
          ? `"${String(val).replace(/"/g, '""')}"`
          : val;
      }).join(",")
    ).join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${question.slice(0, 40).replace(/[^a-z0-9]/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setLoggedIn(false);
  };

  if (!loggedIn) return <AuthPage onAuth={() => setLoggedIn(true)} />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Sidebar
        onSelectQuery={(q) => {
          setData({ question: q.question, sql: q.sql, rows: [] });
          setView("query");
        }}
        activeQuestion={data?.question}
        dashboards={dashboards}
        activeDashboardId={activeDashboard?.id}
        onSelectDashboard={(d) => { setActiveDashboard(d); setView("dashboard"); }}
        onCreateDashboard={createDashboard}
        onDeleteDashboard={deleteDashboard}
        onRenameDashboard={renameDashboard}
        connections={connections}
        activeConnectionId={activeConnection?.id}
        onSelectConnection={(c) => { setActiveConnection(c); setView("connection"); }}
        onAddConnection={() => setShowConnectionModal(true)}
        onDeleteConnection={deleteConnection}
        savedQueriesVersion={savedQueriesVersion}
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Top bar */}
        <div style={{
          height: "56px",
          borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center",
          justifyContent: "space-between",
          padding: "0 28px",
          background: "var(--surface)",
          flexShrink: 0,
          boxShadow: "0 1px 0 var(--border)"
        }}>
          <div style={{ display: "flex", gap: "4px" }}>
            {[
              { key: "query", label: "Query" },
              { key: "dashboard", label: activeDashboard ? activeDashboard.name : "Dashboard" },
              ...(activeConnection ? [{ key: "connection", label: activeConnection.name }] : [])
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                style={{
                  padding: "6px 16px", borderRadius: "6px",
                  background: view === key ? "var(--surface2)" : "transparent",
                  color: view === key ? "var(--text)" : "var(--text2)",
                  border: view === key ? "1px solid var(--border2)" : "1px solid transparent",
                  fontSize: "13px",
                  fontWeight: view === key ? 600 : 400
                }}
              >{label}</button>
            ))}
          </div>

          <button
            onClick={logout}
            style={{
              padding: "6px 14px", background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text2)", fontSize: "12px", borderRadius: "6px"
            }}
            onMouseEnter={e => e.target.style.borderColor = "var(--border2)"}
            onMouseLeave={e => e.target.style.borderColor = "var(--border)"}
          >Sign out</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>

          {/* ── Query View ── */}
          {view === "query" && (
            <div style={{ maxWidth: "860px" }}>
              <QueryBox
                onData={setData}
                onUpload={(fileData) => {
                  setActiveFile(fileData);
                  setUploadTrigger(t => t + 1);
                }}
                prefill={prefill}
                activeTable={activeFile?.table_name}
              />

              <FileSwitcher
                activeTable={activeFile?.table_name}
                onSwitch={(f) => { setActiveFile(f); setUploadTrigger(t => t + 1); }}
                onReplace={() => {
                  if (activeDashboard) setActiveDashboard(d => ({ ...d }));
                }}
                onDelete={() => setActiveFile(null)}
              />

              <Suggestions
                trigger={uploadTrigger}
                onSelect={(q) => setPrefill(q)}
                activeTable={activeFile?.table_name}
              />

              <Insights
                trigger={uploadTrigger}
                activeTable={activeFile?.table_name}
              />

              {data && data.rows?.length > 0 && (
                <div className="fade-up">
                  {/* SQL block */}
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

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    <button
                      onClick={async () => {
                        await axios.post("/queries/save", {
                          question: data.question,
                          sql: data.sql
                        });
                        setSavedQueriesVersion(v => v + 1); // trigger sidebar refresh
                      }}
                      style={{
                        padding: "8px 16px", background: "transparent",
                        border: "1px solid var(--border2)",
                        color: "var(--text2)", fontSize: "12px", borderRadius: "6px"
                      }}
                    >↓ Save Query</button>

                    <button
                      onClick={() => setShowPinModal(true)}
                      style={{
                        padding: "8px 16px",
                        background: "rgba(91,79,207,0.1)",
                        border: "1px solid rgba(91,79,207,0.2)",
                        color: "var(--accent)",
                        fontSize: "12px", fontWeight: 600, borderRadius: "6px"
                      }}
                    >📌 Pin to Dashboard</button>

                    <button
                      onClick={() => downloadCSV(data.rows, data.question)}
                      style={{
                        padding: "8px 16px", background: "transparent",
                        border: "1px solid var(--border2)",
                        color: "var(--text2)", fontSize: "12px", borderRadius: "6px"
                      }}
                    >↓ Export CSV</button>
                  </div>

                  <ChartView rows={data.rows} chartType={data.chartType} />
                  <ResultsTable rows={data.rows} />
                </div>
              )}
            </div>
          )}

          {/* ── Dashboard View ── */}
          {view === "dashboard" && (
            <DashboardView
              dashboard={activeDashboard}
              onPanelRemoved={() => {}}
            />
          )}

          {/* ── Connection View ── */}
          {view === "connection" && (
            <ConnectionView
              connection={activeConnection}
              dashboards={dashboards}
              onPin={(panelData, sourceName) => {
                setData(panelData);
                setShowPinModal(true);
              }}
            />
          )}
        </div>
      </div>

      {/* Pin to dashboard modal */}
      {showPinModal && (
        <PinModal
          dashboards={dashboards}
          onPin={(dashboard) => pinToBoard(dashboard, data, activeConnection?.name)}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {/* Add connection modal */}
      {showConnectionModal && (
        <ConnectionModal
          onClose={() => setShowConnectionModal(false)}
          onSaved={loadConnections}
        />
      )}
    </div>
  );
}

export default App;