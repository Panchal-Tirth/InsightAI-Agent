"use client";

import "./globals.css";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Brain, Bell, TrendingUp,
  Zap, ChevronRight, Activity
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/",         label: "Dashboard",   icon: LayoutDashboard, desc: "Overview"   },
  { href: "/insights", label: "AI Insights", icon: Brain,           desc: "GPT Reports" },
  { href: "/alerts",   label: "Alerts",      icon: Bell,            desc: "Live Feed"   },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <html lang="en" className="dark">
      <body className="flex h-screen overflow-hidden bg-[#080810] grid-bg">

        {/* ── Sidebar ── */}
        <motion.aside
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-64 flex-shrink-0 glass border-r border-white/5 flex flex-col py-6 px-3 relative z-20"
        >
          {/* Logo */}
          <div className="px-3 mb-8">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-9 h-9 rounded-xl bg-[#7c6dfa] flex items-center justify-center glow-sm animate-pulse-glow">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none">InsightAI</p>
                <p className="text-[10px] text-white/40 mt-0.5">Marketing Agent</p>
              </div>
            </motion.div>
          </div>

          {/* Live indicator */}
          <div className="px-3 mb-4">
            <div className="glass rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] text-white/50">Agent Active</span>
              <Badge variant="outline" className="ml-auto text-[9px] border-emerald-500/30 text-emerald-400 py-0">
                LIVE
              </Badge>
            </div>
          </div>

          <Separator className="mb-4 bg-white/5" />

          {/* Nav label */}
          <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest px-3 mb-2">
            Navigation
          </p>

          {/* Nav items */}
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map((item, i) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i + 0.3 }}
                  onHoverStart={() => setHovered(item.href)}
                  onHoverEnd={() => setHovered(null)}
                >
                  <Link href={item.href}>
                    <div className={`
                      relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
                      transition-all duration-200 group
                      ${isActive
                        ? "bg-[#7c6dfa]/15 border border-[#7c6dfa]/30"
                        : "hover:bg-white/5 border border-transparent"
                      }
                    `}>
                      {/* Active glow */}
                      {isActive && (
                        <motion.div
                          layoutId="active-bg"
                          className="absolute inset-0 rounded-xl bg-[#7c6dfa]/10 glow-sm"
                          transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                        />
                      )}

                      <div className={`
                        relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200
                        ${isActive ? "bg-[#7c6dfa] text-white" : "bg-white/5 text-white/40 group-hover:text-white/70"}
                      `}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="relative flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-none ${isActive ? "text-white" : "text-white/60 group-hover:text-white/80"}`}>
                          {item.label}
                        </p>
                        <p className="text-[10px] text-white/25 mt-0.5">{item.desc}</p>
                      </div>

                      {isActive && (
                        <ChevronRight className="relative w-3.5 h-3.5 text-[#7c6dfa]" />
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          <Separator className="mb-4 bg-white/5" />

          {/* Bottom stats */}
          <div className="px-3 space-y-2">
            <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2">
              System
            </p>
            {[
              { label: "API Status",   value: "Online",  color: "text-emerald-400" },
              { label: "Model",        value: "Llama 3.3", color: "text-[#7c6dfa]" },
              { label: "n8n Schedule", value: "9AM Daily", color: "text-white/50"  },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-[11px] text-white/30">{s.label}</span>
                <span className={`text-[11px] font-medium ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        </motion.aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="min-h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

      </body>
    </html>
  );
}