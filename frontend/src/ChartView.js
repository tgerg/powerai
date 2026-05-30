import {
  LineChart, Line,
  BarChart, Bar,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ["#5b4fcf", "#16a34a", "#d97706", "#dc2626", "#7c6aff", "#059669", "#f59e0b", "#ef4444"];

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e4ea",
  borderRadius: "8px",
  color: "#111827",
  fontFamily: "'DM Mono', monospace",
  fontSize: "12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
};

const axisStyle = {
  fill: "#9ca3af",
  fontSize: 11,
  fontFamily: "'DM Mono', monospace"
};

export default function ChartView({ rows, chartType, onChartClick }) {
  if (!rows || rows.length === 0 || chartType === "none") return null;

  const allKeys = Object.keys(rows[0]);
  const numericKeys = allKeys.filter((k) => typeof rows[0][k] === "number");
  const stringKeys = allKeys.filter((k) => typeof rows[0][k] === "string");

  const xKey = stringKeys[0] || allKeys[0];
  const yKey = numericKeys[0];

  if (!yKey) return null;

  const type = chartType || "bar";

  const handleElementClick = (elementData) => {
    if (!onChartClick) return;
    onChartClick({ activePayload: [{ payload: elementData }] });
  };

  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginBottom: "12px"
      }}>
        <p style={{
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "1.2px", color: "var(--text3)",
          textTransform: "uppercase", margin: 0
        }}>Visualization</p>
        <span style={{
          fontSize: "10px",
          background: "rgba(91,79,207,0.08)",
          color: "var(--accent)",
          padding: "2px 8px",
          borderRadius: "99px",
          fontFamily: "var(--font-mono)",
          border: "1px solid rgba(91,79,207,0.15)"
        }}>
          {type}
        </span>
        {onChartClick && (
          <span style={{ fontSize: "10px", color: "var(--text3)", marginLeft: "4px" }}>
            · click to filter
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        {type === "line" ? (
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e4ea" />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: "#e2e4ea" }} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke="#5b4fcf"
              strokeWidth={2}
              dot={{ r: 4, cursor: onChartClick ? "pointer" : "default" }}
              activeDot={{ r: 6 }}
              onClick={(_, payload) => handleElementClick(payload)}
            />
          </LineChart>

        ) : type === "pie" ? (
          <PieChart>
            <Pie
              data={rows}
              dataKey={yKey}
              nameKey={xKey}
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
              onClick={(pieData) => handleElementClick(pieData)}
              cursor={onChartClick ? "pointer" : "default"}
            >
              {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend
              formatter={(value) => <span style={{ color: "var(--text2)", fontSize: "12px" }}>{value}</span>}
            />
          </PieChart>

        ) : type === "scatter" && numericKeys.length >= 2 ? (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e4ea" />
            <XAxis dataKey={numericKeys[0]} tick={axisStyle} axisLine={{ stroke: "#e2e4ea" }} tickLine={false} />
            <YAxis dataKey={numericKeys[1]} tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: "3 3" }} />
            <Scatter
              data={rows}
              fill="#5b4fcf"
              onClick={(scatterData) => handleElementClick(scatterData)}
              cursor={onChartClick ? "pointer" : "default"}
            />
          </ScatterChart>

        ) : (
          <BarChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e4ea" vertical={false} />
            <XAxis dataKey={xKey} tick={axisStyle} axisLine={{ stroke: "#e2e4ea" }} tickLine={false} />
            <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(91,79,207,0.05)" }} />
            <Bar
              dataKey={yKey}
              fill="#5b4fcf"
              radius={[4, 4, 0, 0]}
              onClick={(barData) => handleElementClick(barData)}
              cursor={onChartClick ? "pointer" : "default"}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}