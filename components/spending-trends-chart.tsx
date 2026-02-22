"use client";

import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Legend,
  type PieSectorDataItem,
} from "recharts";
import { CATEGORY_LABELS } from "@/lib/rewards/scoring";
import type { StandardCategory } from "@/lib/rewards/categories";
import type { SpendingTrends } from "@/lib/rewards/spend-profile";

const RADIAN = Math.PI / 180;

const CATEGORY_COLORS: Record<string, string> = {
  dining: "#ea580c",
  groceries: "#16a34a",
  gas: "#2563eb",
  travel: "#7c3aed",
  airfare: "#4f46e5",
  hotels: "#db2777",
  transit: "#0891b2",
  streaming: "#9333ea",
  drugstores: "#0d9488",
  online_retail: "#ea580c",
  entertainment: "#be123c",
  utilities: "#475569",
  phone: "#0284c7",
  office_supply: "#65a30d",
  all_other: "#64748b",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getColor(category: string): string {
  return CATEGORY_COLORS[category] ?? "#94a3b8";
}

interface LabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  name?: string;
  payload?: { category?: string };
  fill?: string;
}

function renderRadialLabel({
  cx = 0,
  cy = 0,
  midAngle = 0,
  outerRadius = 0,
  percent = 0,
  name = "",
  payload,
  fill,
}: LabelProps) {
  if (percent < 0.01) return null;
  const lineInnerRadius = outerRadius + 3;
  const lineOuterRadius = outerRadius + 18;
  const textRadius = outerRadius + 28;
  const x0 = cx + lineInnerRadius * Math.cos(-midAngle * RADIAN);
  const y0 = cy + lineInnerRadius * Math.sin(-midAngle * RADIAN);
  const x1 = cx + lineOuterRadius * Math.cos(-midAngle * RADIAN);
  const y1 = cy + lineOuterRadius * Math.sin(-midAngle * RADIAN);
  const textX = cx + textRadius * Math.cos(-midAngle * RADIAN);
  const textY = cy + textRadius * Math.sin(-midAngle * RADIAN);
  const label = `${name} ${(percent * 100).toFixed(0)}%`;
  const sliceColor = fill ?? (payload?.category ? getColor(payload.category) : "var(--fg)");
  const textAnchor = textX >= cx ? "start" : "end";
  return (
    <g>
      <line
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={sliceColor}
        strokeWidth={1.5}
        strokeOpacity={0.7}
        strokeLinecap="round"
      />
      <text
        x={textX}
        y={textY}
        textAnchor={textAnchor}
        dominantBaseline="central"
        fill={sliceColor}
        fontSize={12}
        fontWeight={500}
      >
        {label}
      </text>
    </g>
  );
}

type SpendingTrendsChartProps = {
  trends: SpendingTrends;
};

export function SpendingTrendsChart({ trends }: SpendingTrendsChartProps) {
  const totalSpend = Object.values(trends.byCategory).reduce((a, b) => a + b, 0);
  if (totalSpend <= 0) return null;

  const pieData = (Object.entries(trends.byCategory) as [StandardCategory, number][])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, value]) => ({
      name: CATEGORY_LABELS[cat],
      value: Math.round(value),
      category: cat,
    }));

  const renderActiveShape = (props: PieSectorDataItem) => (
    <Sector
      {...props}
      outerRadius={(Number(props.outerRadius) || 0) + 10}
      fillOpacity={1}
      style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))" }}
    />
  );

  const renderInactiveShape = (props: PieSectorDataItem) => (
    <Sector {...props} fillOpacity={0.5} />
  );

  return (
    <article className="panel" style={{ marginBottom: "2rem" }}>
      <h2 style={{ marginTop: 0 }}>Spending distribution</h2>
      <p className="muted" style={{ marginBottom: "1.25rem" }}>
        How your spending is distributed across categories
      </p>

      <div className="spending-chart-container" style={{ width: "100%", height: 520, minHeight: 440, minWidth: 420 }}>
        <ResponsiveContainer width="100%" height={520}>
          <PieChart margin={{ top: 36, right: 120, bottom: 76, left: 120 }}>
            <Pie
              data={pieData}
              cx="50%"
              cy="48%"
              innerRadius="20%"
              outerRadius="78%"
              paddingAngle={0}
              dataKey="value"
              nameKey="name"
              rootTabIndex={-1}
              activeShape={renderActiveShape}
              inactiveShape={renderInactiveShape}
              label={renderRadialLabel}
              labelLine={false}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={getColor(entry.category)}
                  stroke="var(--surface)"
                  strokeWidth={2.5}
                />
              ))}
            </Pie>
            <Legend
              layout="horizontal"
              align="center"
              verticalAlign="bottom"
              wrapperStyle={{ fontSize: "0.8rem", gap: "0.5rem" }}
              iconType="circle"
              iconSize={8}
              itemSorter={(item) => -(item.payload?.value ?? 0)}
              formatter={(value) => {
                const item = pieData.find((d) => d.name === value);
                return item ? `${value} (${formatCurrency(item.value)})` : value;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
