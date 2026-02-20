"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine
} from "recharts";

interface RoasChartProps {
  data: any[];
}

const PLATFORM_COLORS: Record<string, string> = {
  "Google Ads": "#3b82f6",
  "Meta Ads"  : "#818cf8",
  "TikTok Ads": "#f472b6",
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass border border-white/10 rounded-xl p-3 shadow-xl min-w-[160px]">
      <p className="text-xs text-white/50 mb-2 font-medium">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-xs text-white/60 truncate">{p.name}:</span>
          <span className="text-xs font-bold text-white ml-auto">{Number(p.value).toFixed(2)}x</span>
        </div>
      ))}
    </div>
  );
};

export default function RoasChart({ data }: RoasChartProps) {
  // Pivot: date → { "Google Ads": roas, "Meta Ads": roas, ... }
  const grouped: Record<string, any> = {};
  data.forEach(row => {
    const label = row.date?.slice(5) || row.date; // MM-DD
    if (!grouped[label]) grouped[label] = { date: label };
    grouped[label][row.campaign] = row.roas;
  });

  const chartData = Object.values(grouped).slice(-30); // last 30 days
  const platforms = [...new Set(data.map((r: any) => r.campaign))];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="glass glass-hover rounded-2xl p-6 border border-white/5"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-white">Platform ROAS Trend</h2>
          <p className="text-xs text-white/40 mt-0.5">Last 30 days · Google Ads vs Meta Ads vs TikTok Ads</p>
        </div>
        <div className="flex items-center gap-3">
          {platforms.map(p => (
            <div key={p} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ background: PLATFORM_COLORS[p] || "#7c6dfa" }} />
              <span className="text-[10px] text-white/40">{p}</span>
            </div>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis
            dataKey="date"
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
            axisLine={{ stroke: "rgba(255,255,255,0.05)" }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine
            y={1.5}
            stroke="rgba(245,158,11,0.5)"
            strokeDasharray="6 3"
            label={{ value: "Target 1.5x", fill: "rgba(245,158,11,0.6)", fontSize: 10 }}
          />
          {platforms.map(platform => (
            <Line
              key={platform}
              type="monotone"
              dataKey={platform}
              stroke={PLATFORM_COLORS[platform] || "#7c6dfa"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}