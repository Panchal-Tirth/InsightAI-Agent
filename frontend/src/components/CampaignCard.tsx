"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, DollarSign, MousePointer, ShoppingCart, Target, BarChart2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CampaignCardProps {
  campaign: string;
  roas: number;
  spend: number;
  conversions: number;
  ctr: number;
  revenue: number;
  cpc?: number;
  cpa?: number;
  index: number;
}

function useCounter(target: number, duration = 1200, delay = 0) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      const steps = 60;
      let current = 0;
      const increment = target / steps;
      const interval = setInterval(() => {
        current += increment;
        if (current >= target) { setCount(target); clearInterval(interval); }
        else setCount(current);
      }, duration / steps);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timer);
  }, [target, duration, delay]);
  return count;
}

const platformConfig: Record<string, { color: string; dot: string }> = {
  "Google Ads": { color: "text-blue-400",   dot: "bg-blue-400"   },
  "Meta Ads"  : { color: "text-indigo-400", dot: "bg-indigo-400" },
  "TikTok Ads": { color: "text-pink-400",   dot: "bg-pink-400"   },
};

function getRoasConfig(roas: number) {
  if (roas >= 2.5) return {
    color: "text-emerald-400", bg: "bg-emerald-500/10",
    border: "border-emerald-500/20", glow: "rgba(34,197,94,0.12)",
    label: "Healthy", icon: TrendingUp, badge: "border-emerald-500/30 text-emerald-400",
  };
  if (roas >= 1.5) return {
    color: "text-amber-400", bg: "bg-amber-500/10",
    border: "border-amber-500/20", glow: "rgba(245,158,11,0.12)",
    label: "Warning", icon: Minus, badge: "border-amber-500/30 text-amber-400",
  };
  return {
    color: "text-red-400", bg: "bg-red-500/10",
    border: "border-red-500/20", glow: "rgba(239,68,68,0.12)",
    label: "Critical", icon: TrendingDown, badge: "border-red-500/30 text-red-400",
  };
}

export default function CampaignCard({ campaign, roas, spend, conversions, ctr, revenue, cpc, cpa, index }: CampaignCardProps) {
  const roasCfg    = getRoasConfig(roas);
  const platCfg    = platformConfig[campaign] || { color: "text-white/60", dot: "bg-white/40" };
  const StatusIcon = roasCfg.icon;

  const animRoas        = useCounter(roas,        1200, index * 100);
  const animSpend       = useCounter(spend,       1200, index * 100 + 80);
  const animRevenue     = useCounter(revenue,     1200, index * 100 + 120);
  const animConversions = useCounter(conversions, 1200, index * 100 + 160);
  const animCpc         = useCounter(cpc || 0,   1200, index * 100 + 200);
  const animCpa         = useCounter(cpa || 0,   1200, index * 100 + 240);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" style={{ background: roasCfg.glow }} />
      <div className={`relative glass glass-hover rounded-2xl p-5 h-full border ${roasCfg.border} transition-all duration-300`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${platCfg.dot} animate-pulse`} />
            <div>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Platform</p>
              <h3 className={`text-sm font-bold ${platCfg.color}`}>{campaign}</h3>
            </div>
          </div>
          <Badge variant="outline" className={`text-[10px] ${roasCfg.badge} border`}>
            <StatusIcon className="w-2.5 h-2.5 mr-1" />{roasCfg.label}
          </Badge>
        </div>

        <div className={`${roasCfg.bg} rounded-xl p-3 mb-4 border ${roasCfg.border}`}>
          <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">ROAS</p>
          <div className="flex items-end gap-1 mb-2">
            <span className={`text-3xl font-black ${roasCfg.color}`}>{animRoas.toFixed(2)}</span>
            <span className="text-sm text-white/30 mb-1">x</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${roas >= 2.5 ? "bg-emerald-400" : roas >= 1.5 ? "bg-amber-400" : "bg-red-400"}`}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((roas / 5) * 100, 100)}%` }}
              transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Spend",       value: `$${animSpend.toFixed(0)}`,  icon: DollarSign   },
            { label: "Revenue",     value: `$${animRevenue.toFixed(0)}`, icon: TrendingUp   },
            { label: "Conversions", value: Math.round(animConversions),  icon: ShoppingCart },
            { label: "CTR",         value: `${ctr.toFixed(2)}%`,        icon: MousePointer },
            { label: "CPC",         value: `$${animCpc.toFixed(2)}`,    icon: BarChart2    },
            { label: "CPA",         value: `$${animCpa.toFixed(2)}`,    icon: Target       },
          ].map(m => (
            <div key={m.label} className="bg-white/3 rounded-lg p-2">
              <div className="flex items-center gap-1 mb-0.5">
                <m.icon className="w-2.5 h-2.5 text-white/25" />
                <p className="text-[9px] text-white/30 uppercase tracking-wide">{m.label}</p>
              </div>
              <p className="text-xs font-bold text-white/80">{m.value}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}