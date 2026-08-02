"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TrafficChartPoint = {
  date: string;
  label: string;
  visitors: number;
  pageViews: number;
};

type Props = {
  data: TrafficChartPoint[];
};

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number | string; color?: string; name?: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs shadow-sm">
      <p className="mb-1.5 font-medium text-foreground">{label}</p>
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li
            key={String(entry.dataKey)}
            className="flex items-center justify-between gap-4"
          >
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span
                className="size-2 rounded-full"
                style={{ background: entry.color }}
                aria-hidden
              />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {Number(entry.value ?? 0).toLocaleString("tr-TR")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DashboardTrafficChart({ data }: Props) {
  const hasData = data.some((d) => d.visitors > 0 || d.pageViews > 0);

  if (!hasData) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
        Son 7 günde henüz ziyaret kaydı yok. Trafik geldikçe grafik burada
        dolacak.
      </div>
    );
  }

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="trafficVisitors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="trafficViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            stroke="var(--border)"
            strokeDasharray="3 3"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
            dy={6}
          />
          <YAxis
            allowDecimals={false}
            width={36}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Area
            type="monotone"
            dataKey="visitors"
            name="Ziyaretçi"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#trafficVisitors)"
            activeDot={{ r: 4 }}
          />
          <Area
            type="monotone"
            dataKey="pageViews"
            name="Görüntüleme"
            stroke="var(--chart-2)"
            strokeWidth={2}
            fill="url(#trafficViews)"
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
