"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { RefreshCw, Zap, TrendingUp, AlertTriangle, DollarSign, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import CampaignCard from "@/components/CampaignCard";
import RoasChart from "@/components/RoasChart";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
console.log("API URL:", process.env.NEXT_PUBLIC_URL);
function useCounter(target: number, duration = 1000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) { setCount(target); clearInterval(interval); }
      else setCount(current);
    }, duration / steps);
    return () => clearInterval(interval);
  }, [target]);
  return count;
}

export default function DashboardPage() {
  const [campaigns,  setCampaigns]  = useState<any[]>([]);
  const [chartData,  setChartData]  = useState<any[]>([]);
  const [filters,    setFilters]    = useState<any>({});
  const [loading,    setLoading]    = useState(true);
  const [analyzing,  setAnalyzing]  = useState(false);
  const [lastRun,    setLastRun]    = useState<string | null>(null);
  const [error,      setError]      = useState<string | null>(null);

  const [selPlatform, setSelPlatform] = useState("All");
  const [selIndustry, setSelIndustry] = useState("All");
  const [selCountry,  setSelCountry]  = useState("All");

  // Fetch whenever filters change
  useEffect(() => { fetchData(); }, [selPlatform, selIndustry, selCountry]);

  // Fetch filter options once on mount
  useEffect(() => { fetchFilterOptions(); }, []);

  // ── Build query string from active filters ─────────────────────────────────
  function buildParams() {
    const p: Record<string, string> = {};
    if (selPlatform !== "All") p.platform = selPlatform;
    if (selIndustry !== "All") p.industry = selIndustry;
    if (selCountry  !== "All") p.country  = selCountry;
    return new URLSearchParams(p).toString();
  }

  async function fetchFilterOptions() {
    try {
      const res = await axios.get(`${API}/api/campaigns/filters`);
      setFilters(res.data.filters || {});
    } catch { /* silent */ }
  }

  async function fetchData() {
    setLoading(true); setError(null);
    try {
      const qs = buildParams();
      const [latestRes, chartRes] = await Promise.all([
        axios.get(`${API}/api/campaigns/latest${qs ? `?${qs}` : ""}`),
        axios.get(`${API}/api/campaigns${qs ? `?${qs}` : ""}`),
      ]);
      setCampaigns(latestRes.data.data || []);
      setChartData(chartRes.data.data  || []);
    } catch {
      setError("Failed to connect to API. Make sure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  }

  async function runAnalysis() {
    setAnalyzing(true); setError(null);
    try {
      // Send filters in POST body to /api/analyze
      await axios.post(`${API}/api/analyze`, {
        platform: selPlatform !== "All" ? selPlatform : null,
        industry: selIndustry !== "All" ? selIndustry : null,
        country : selCountry  !== "All" ? selCountry  : null,
      });
      setLastRun(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Analysis failed.");
    } finally {
      setAnalyzing(false);
    }
  }

  const totalSpend    = campaigns.reduce((s, c) => s + (c.spend   || 0), 0);
  const totalRevenue  = campaigns.reduce((s, c) => s + (c.revenue || 0), 0);
  const avgRoas       = campaigns.length ? campaigns.reduce((s, c) => s + (c.roas || 0), 0) / campaigns.length : 0;
  const criticalCount = campaigns.filter(c => c.roas < 1.5).length;

  const animSpend   = useCounter(totalSpend,   1200);
  const animRevenue = useCounter(totalRevenue, 1200);
  const animRoas    = useCounter(avgRoas,       1200);

  const FilterSelect = ({ label, value, options, onChange }: any) => (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-white/30 uppercase tracking-wider">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="glass border border-white/10 text-white/70 text-xs rounded-lg px-3 py-1.5 bg-transparent outline-none cursor-pointer hover:border-[#7c6dfa]/40 transition-colors"
      >
        <option value="All" className="bg-[#0f0f1a]">All</option>
        {options?.map((o: string) => (
          <option key={o} value={o} className="bg-[#0f0f1a]">{o}</option>
        ))}
      </select>
    </div>
  );

  const hasFilter = selPlatform !== "All" || selIndustry !== "All" || selCountry !== "All";

  return (
    <div className="p-6 max-w-7xl mx-auto">

      {/* Header */}
      <motion.div className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Campaign <span className="text-gradient">Dashboard</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Global Ads Performance · Google · Meta · TikTok
            {lastRun && <span className="text-[#7c6dfa]"> · Analysed {lastRun}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}
            className="border-white/10 text-white/60 hover:text-white hover:bg-white/5">
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={runAnalysis} disabled={analyzing}
            className="bg-[#7c6dfa] hover:bg-[#6c5ce7] text-white border-0 glow-sm">
            {analyzing
              ? <><RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />Analysing...</>
              : <><Zap className="w-3.5 h-3.5 mr-2" />Run Analysis</>}
          </Button>
        </div>
      </motion.div>

      {/* Filter bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass border border-white/5 rounded-xl px-4 py-3 flex items-center gap-6 mb-6 flex-wrap"
      >
        <div className="flex items-center gap-2 text-white/40">
          <Filter className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <div className="w-px h-4 bg-white/10" />
        <FilterSelect label="Platform" value={selPlatform} options={filters.platforms}  onChange={setSelPlatform} />
        <FilterSelect label="Industry" value={selIndustry} options={filters.industries} onChange={setSelIndustry} />
        <FilterSelect label="Country"  value={selCountry}  options={filters.countries}  onChange={setSelCountry}  />
        {hasFilter && (
          <button
            onClick={() => { setSelPlatform("All"); setSelIndustry("All"); setSelCountry("All"); }}
            className="ml-auto text-[11px] text-[#7c6dfa] hover:text-[#a78bfa] transition-colors"
          >
            ✕ Clear filters
          </button>
        )}
      </motion.div>

      {/* Active filter indicator */}
      {hasFilter && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-white/30">Showing data for:</span>
          {selPlatform !== "All" && <span className="glass border border-blue-500/20 text-blue-400 text-[11px] px-2 py-0.5 rounded-full">{selPlatform}</span>}
          {selIndustry !== "All" && <span className="glass border border-[#7c6dfa]/20 text-[#7c6dfa] text-[11px] px-2 py-0.5 rounded-full">{selIndustry}</span>}
          {selCountry  !== "All" && <span className="glass border border-emerald-500/20 text-emerald-400 text-[11px] px-2 py-0.5 rounded-full">{selCountry}</span>}
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-6 glass border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </motion.div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Spend",     value: `$${animSpend.toFixed(0)}`,   icon: DollarSign,    color: "text-white"       },
          { label: "Total Revenue",   value: `$${animRevenue.toFixed(0)}`, icon: TrendingUp,    color: "text-emerald-400" },
          { label: "Avg ROAS",        value: `${animRoas.toFixed(2)}x`,    icon: Zap,           color: "text-[#7c6dfa]"  },
          { label: "Needs Attention", value: criticalCount,                 icon: AlertTriangle, color: "text-red-400"    },
        ].map((stat, i) => (
          <motion.div key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
            className="glass glass-hover rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-3.5 h-3.5 text-white/30" />
              <p className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</p>
            </div>
            <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Campaign Cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 border border-white/5">
              <Skeleton className="h-4 w-24 mb-3 bg-white/5" />
              <Skeleton className="h-8 w-16 mb-4 bg-white/5" />
              <Skeleton className="h-24 w-full bg-white/5" />
            </div>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="glass rounded-2xl border border-white/5 p-10 text-center mb-6">
          <p className="text-white/40 text-sm">No data for selected filters. Try a different combination.</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {campaigns.map((camp, i) => (
            <CampaignCard
              key={camp.campaign}
              campaign={camp.campaign}
              roas={camp.roas}
              spend={camp.spend}
              conversions={camp.conversions}
              ctr={camp.ctr}
              revenue={camp.revenue}
              cpc={camp.cpc}
              cpa={camp.cpa}
              index={i}
            />
          ))}
        </div>
      )}

      {/* ROAS Chart */}
      {!loading && chartData.length > 0 && <RoasChart data={chartData} />}

    </div>
  );
}