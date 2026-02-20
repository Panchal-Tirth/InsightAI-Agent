"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, RefreshCw, Trash2, AlertTriangle, CheckCircle, Info, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const severityConfig: Record<string, any> = {
  high:   { color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/30",   icon: AlertTriangle, label: "HIGH"   },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: Info,          label: "MEDIUM" },
  low:    { color: "text-blue-400",  bg: "bg-blue-500/10",  border: "border-blue-500/30",  icon: CheckCircle,   label: "LOW"    },
};

export default function AlertsPage() {
  const [alerts,   setAlerts]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [clearing, setClearing] = useState(false);
  const [filter,   setFilter]   = useState<string>("all");

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/alerts`);
      setAlerts(res.data.alerts || []);
    } finally {
      setLoading(false);
    }
  }

  async function clearAlerts() {
    setClearing(true);
    try {
      await axios.delete(`${API}/api/alerts`);
      setAlerts([]);
    } finally {
      setClearing(false);
    }
  }

  const filtered = filter === "all" ? alerts : alerts.filter(a => a.severity === filter);
  const counts   = {
    all:    alerts.length,
    high:   alerts.filter(a => a.severity === "high").length,
    medium: alerts.filter(a => a.severity === "medium").length,
    low:    alerts.filter(a => a.severity === "low").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* ── Header ── */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Alert <span className="text-gradient">Log</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            AI-generated alerts · {alerts.length} total fired
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAlerts}
            disabled={loading}
            className="border-white/10 text-white/60 hover:text-white hover:bg-white/5"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAlerts}
            disabled={clearing || alerts.length === 0}
            className="border-red-500/20 text-red-400/60 hover:text-red-400 hover:bg-red-500/5"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2" />
            Clear All
          </Button>
        </div>
      </motion.div>

      {/* ── Filter tabs ── */}
      <div className="flex gap-2 mb-6">
        {(["all", "high", "medium", "low"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200
              ${filter === f
                ? "bg-[#7c6dfa] text-white glow-sm"
                : "glass border border-white/10 text-white/40 hover:text-white/70"
              }
            `}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 opacity-60">({counts[f]})</span>
          </button>
        ))}
      </div>

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl border border-white/5 p-16 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">No Alerts</h3>
          <p className="text-sm text-white/40">
            {filter === "all" ? "All campaigns are healthy." : `No ${filter} severity alerts.`}
          </p>
        </motion.div>
      )}

      {/* ── Alert cards ── */}
      <div className="space-y-3">
        <AnimatePresence>
          {filtered.map((alert, i) => {
            const cfg = severityConfig[alert.severity] || severityConfig.low;
            const Icon = cfg.icon;
            const date = new Date(alert.timestamp);

            return (
              <motion.div
                key={alert.timestamp + i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.06, duration: 0.3 }}
                whileHover={{ x: 4, transition: { duration: 0.2 } }}
                className={`
                  glass glass-hover rounded-2xl p-5
                  border ${cfg.border}
                  transition-all duration-300 group
                `}
              >
                <div className="flex items-start gap-4">

                  {/* Severity icon */}
                  <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className="text-sm font-bold text-white">
                        {alert.campaign?.replace(/_/g, " ")}
                      </span>
                      <Badge variant="outline" className={`text-[10px] ${cfg.border} ${cfg.color} py-0`}>
                        {cfg.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] border-white/10 text-white/30 py-0">
                        {alert.status || "new"}
                      </Badge>
                      <div className="ml-auto flex items-center gap-1 text-[10px] text-white/30">
                        <Clock className="w-3 h-3" />
                        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>

                    <p className="text-sm text-white/60 mb-3 leading-relaxed">
                      {alert.issue}
                    </p>

                    <div className={`${cfg.bg} border ${cfg.border} rounded-xl p-3`}>
                      <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">
                        AI Recommendation
                      </p>
                      <p className="text-xs text-white/70 leading-relaxed">
                        {alert.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}