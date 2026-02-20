"use client";

import { useState } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import {
  Brain, Zap, RefreshCw, CheckCircle2, AlertTriangle,
  Activity, ChevronRight, FileText, Sparkles,
  TrendingUp, TrendingDown, Minus, Bot, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Health config ─────────────────────────────────────────────────────────────
const healthConfig: Record<string, any> = {
  healthy:  {
    color: "text-emerald-400", bg: "bg-emerald-500/10",
    border: "border-emerald-500/25", glow: "rgba(34,197,94,0.12)",
    label: "All Healthy", icon: TrendingUp,
  },
  warning:  {
    color: "text-amber-400", bg: "bg-amber-500/10",
    border: "border-amber-500/25", glow: "rgba(245,158,11,0.12)",
    label: "Warning", icon: Minus,
  },
  critical: {
    color: "text-red-400", bg: "bg-red-500/10",
    border: "border-red-500/25", glow: "rgba(239,68,68,0.12)",
    label: "Critical", icon: TrendingDown,
  },
};

// ── Tool call display names ───────────────────────────────────────────────────
const toolMeta: Record<string, { label: string; color: string; bg: string }> = {
  get_campaign_trend: { label: "Trend Analysis",   color: "text-blue-400",    bg: "bg-blue-500/10"    },
  create_alert:       { label: "Alert Created",    color: "text-red-400",     bg: "bg-red-500/10"     },
  generate_report:    { label: "Report Generated", color: "text-[#7c6dfa]",   bg: "bg-[#7c6dfa]/10"  },
};

// ══════════════════════════════════════════════════════════════════════════════
// CUSTOM MARKDOWN RENDERER
// Each element is fully styled — no prose classes needed
// ══════════════════════════════════════════════════════════════════════════════
const MarkdownComponents: Components = {

  // ── H1 — Page title style ──────────────────────────────────────────────────
  h1: ({ children }) => (
    <div className="flex items-center gap-3 mb-5 mt-2">
      <div className="w-1 h-7 rounded-full bg-gradient-to-b from-[#7c6dfa] to-[#a78bfa]" />
      <h1 className="text-xl font-black text-white tracking-tight">{children}</h1>
    </div>
  ),

  // ── H2 — Section headers ───────────────────────────────────────────────────
  h2: ({ children }) => (
    <div className="mt-7 mb-3">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-3.5 h-3.5 text-[#7c6dfa]" />
        <h2 className="text-sm font-bold text-white uppercase tracking-widest">{children}</h2>
      </div>
      <div className="h-px bg-gradient-to-r from-[#7c6dfa]/30 to-transparent" />
    </div>
  ),

  // ── H3 — Sub-section headers ───────────────────────────────────────────────
  h3: ({ children }) => (
    <h3 className="text-sm font-bold text-white/80 mt-5 mb-2 flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-[#7c6dfa] inline-block" />
      {children}
    </h3>
  ),

  // ── Paragraphs ─────────────────────────────────────────────────────────────
  p: ({ children }) => (
    <p className="text-sm text-white/65 leading-7 mb-3 font-light">{children}</p>
  ),

  // ── Strong / Bold ──────────────────────────────────────────────────────────
  strong: ({ children }) => (
    <strong className="font-semibold text-white/90">{children}</strong>
  ),

  // ── Unordered list ─────────────────────────────────────────────────────────
  ul: ({ children }) => (
    <ul className="space-y-1.5 mb-4 ml-1">{children}</ul>
  ),

  // ── Ordered list ───────────────────────────────────────────────────────────
  ol: ({ children }) => (
    <ol className="space-y-1.5 mb-4 ml-1 list-none counter-reset-[item]">{children}</ol>
  ),

  // ── List items ─────────────────────────────────────────────────────────────
  li: ({ children }) => (
    <li className="flex items-start gap-2.5 text-sm text-white/60 leading-6">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#7c6dfa]/60 flex-shrink-0" />
      <span>{children}</span>
    </li>
  ),

  // ── Inline code ────────────────────────────────────────────────────────────
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <pre className="glass border border-white/5 rounded-xl p-4 mb-4 overflow-x-auto">
          <code className="text-xs text-emerald-300 font-mono leading-6">{children}</code>
        </pre>
      );
    }
    return (
      <code className="bg-[#7c6dfa]/15 text-[#a78bfa] text-xs px-1.5 py-0.5 rounded font-mono">
        {children}
      </code>
    );
  },

  // ── Blockquote — highlight key insights ───────────────────────────────────
  blockquote: ({ children }) => (
    <div className="border-l-2 border-[#7c6dfa]/50 bg-[#7c6dfa]/5 rounded-r-xl pl-4 pr-3 py-3 mb-4">
      <div className="text-sm text-white/60 italic leading-6">{children}</div>
    </div>
  ),

  // ── Horizontal rule ────────────────────────────────────────────────────────
  hr: () => (
    <div className="my-5 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  ),

  // ── Table ──────────────────────────────────────────────────────────────────
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4 rounded-xl border border-white/5">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-[#7c6dfa]/10 border-b border-white/5">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-[10px] font-bold text-white/50 uppercase tracking-wider">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-xs text-white/60 border-b border-white/3">{children}</td>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-white/2 transition-colors">{children}</tr>
  ),
};


// ══════════════════════════════════════════════════════════════════════════════
// ALERT CARD — for each alert in result.alerts
// ══════════════════════════════════════════════════════════════════════════════
function AlertCard({ alert, index }: { alert: any; index: number }) {
  const sevConfig: Record<string, any> = {
    high:   { color: "text-red-400",   bg: "bg-red-500/10",   border: "border-red-500/20",   icon: AlertTriangle, label: "HIGH"   },
    medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", icon: Minus,         label: "MEDIUM" },
    low:    { color: "text-blue-400",  bg: "bg-blue-500/10",  border: "border-blue-500/20",  icon: CheckCircle2,  label: "LOW"    },
  };
  const cfg  = sevConfig[alert.severity] || sevConfig.low;
  const Icon = cfg.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
        <span className="text-xs font-bold text-white">{alert.campaign}</span>
        <Badge variant="outline" className={`text-[9px] ${cfg.border} ${cfg.color} py-0 ml-auto`}>
          {cfg.label}
        </Badge>
      </div>
      <p className="text-xs text-white/55 leading-5 mb-2">{alert.issue}</p>
      <div className="flex items-start gap-1.5">
        <Zap className="w-3 h-3 text-[#7c6dfa] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[#a78bfa] leading-5">{alert.recommendation}</p>
      </div>
    </motion.div>
  );
}


// ══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ══════════════════════════════════════════════════════════════════════════════
export default function InsightsPage() {
  const [result,    setResult]    = useState<any>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true); setError(null);
    try {
      const res = await axios.post(`${API}/api/analyze`, {});
      setResult(res.data);
      setTimestamp(new Date().toLocaleString());
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Analysis failed. Check your API server.");
    } finally {
      setLoading(false);
    }
  }

  const health = result ? (healthConfig[result.overall_health] || healthConfig.healthy) : null;
  const HealthIcon = health?.icon || TrendingUp;

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* ── Header ── */}
      <motion.div className="flex items-center justify-between mb-8"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            AI <span className="text-gradient">Insights</span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Llama 3.3 · MCP tool-calling agent · Real-time analysis
            {timestamp && (
              <span className="text-[#7c6dfa]"> · {timestamp}</span>
            )}
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading}
          className="bg-[#7c6dfa] hover:bg-[#6c5ce7] text-white border-0 glow-sm">
          {loading
            ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Analysing...</>
            : <><Zap className="w-4 h-4 mr-2" />Run Analysis</>}
        </Button>
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── Empty state ── */}
        {!result && !loading && !error && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-white/5 p-20 text-center">
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-[#7c6dfa]/10 border border-[#7c6dfa]/20 flex items-center justify-center mx-auto mb-6"
            >
              <Brain className="w-10 h-10 text-[#7c6dfa]" />
            </motion.div>
            <h3 className="text-xl font-bold text-white mb-2">Agent Ready</h3>
            <p className="text-sm text-white/40 max-w-sm mx-auto mb-8 leading-6">
              The AI agent will scan all 3 platforms, verify trends with MCP tools,
              fire alerts for underperformers, and generate a full report.
            </p>
            <Button onClick={runAnalysis}
              className="bg-[#7c6dfa] hover:bg-[#6c5ce7] text-white border-0 px-8">
              <Zap className="w-4 h-4 mr-2" />Start Analysis
            </Button>
          </motion.div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="glass rounded-2xl border border-[#7c6dfa]/20 p-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#7c6dfa]/10 border border-[#7c6dfa]/30 flex items-center justify-center mx-auto mb-5 animate-pulse-glow">
              <Activity className="w-8 h-8 text-[#7c6dfa] animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white mb-5">Agent Thinking...</h3>
            <div className="space-y-3 max-w-xs mx-auto">
              {[
                { step: "Fetching platform data",           delay: 0    },
                { step: "Scanning ROAS thresholds",         delay: 0.5  },
                { step: "Calling get_campaign_trend",       delay: 1.0  },
                { step: "Firing alerts via MCP",            delay: 2.0  },
                { step: "Generating performance report",    delay: 3.0  },
              ].map(({ step, delay }, i) => (
                <motion.div key={step}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay }}
                  className="flex items-center gap-3 text-sm"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: delay + 0.2 }}
                    className="w-5 h-5 rounded-full bg-[#7c6dfa]/20 border border-[#7c6dfa]/40 flex items-center justify-center flex-shrink-0"
                  >
                    <ChevronRight className="w-2.5 h-2.5 text-[#7c6dfa]" />
                  </motion.div>
                  <span className="text-white/50">{step}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Error ── */}
        {error && !loading && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass border border-red-500/20 rounded-2xl p-6 flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300 mb-1">Analysis Failed</p>
              <p className="text-xs text-white/40">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={runAnalysis}
              className="ml-auto border-white/10 text-white/60 hover:text-white flex-shrink-0">
              Retry
            </Button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* RESULTS                                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {result && !loading && (
          <motion.div key="result"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >

            {/* ── Health banner ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              className={`relative overflow-hidden rounded-2xl border ${health?.border} p-5`}
              style={{ background: health?.glow }}
            >
              {/* Background glow blob */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-30"
                style={{ background: health?.glow }} />

              <div className="relative flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl ${health?.bg} border ${health?.border} flex items-center justify-center flex-shrink-0`}>
                  <HealthIcon className={`w-6 h-6 ${health?.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-white/40 uppercase tracking-widest mb-0.5">Overall Health</p>
                  <p className={`text-2xl font-black ${health?.color}`}>{health?.label}</p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right">
                  {[
                    { label: "Alerts",    value: result.alerts_count         },
                    { label: "Analysed",  value: result.rows_analysed        },
                    { label: "Tools Used", value: result.tool_calls_log?.length || 0 },
                  ].map(s => (
                    <div key={s.label}>
                      <p className={`text-xl font-black ${health?.color}`}>{s.value}</p>
                      <p className="text-[10px] text-white/35 uppercase tracking-wider">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* ── MCP Tool Timeline ── */}
            {result.tool_calls_log?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass rounded-2xl border border-white/5 p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-[#7c6dfa]/10 flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5 text-[#7c6dfa]" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Agent Tool Timeline</p>
                  <Badge variant="outline" className="ml-auto border-[#7c6dfa]/20 text-[#7c6dfa] text-[9px]">
                    {result.tool_calls_log.length} calls
                  </Badge>
                </div>

                {/* Timeline */}
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gradient-to-b from-[#7c6dfa]/40 via-[#7c6dfa]/20 to-transparent" />

                  <div className="space-y-3 pl-10">
                    {result.tool_calls_log.map((tc: any, i: number) => {
                      const meta = toolMeta[tc.tool] || { label: tc.tool, color: "text-white/60", bg: "bg-white/5" };
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.06 }}
                          className="relative flex items-start gap-3"
                        >
                          {/* Node dot */}
                          <div className={`absolute -left-[26px] w-4 h-4 rounded-full ${meta.bg} border border-white/10 flex items-center justify-center`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${meta.color.replace("text-", "bg-")}`} />
                          </div>

                          <div className={`flex-1 ${meta.bg} border border-white/5 rounded-lg px-3 py-2`}>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className={`w-3 h-3 ${meta.color}`} />
                              <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                              <code className="text-[9px] text-white/25 font-mono ml-1">{tc.tool}()</code>
                              <span className="ml-auto text-[9px] text-white/20">#{i + 1}</span>
                            </div>
                            {tc.args?.campaign_name && (
                              <p className="text-[10px] text-white/30 mt-1">
                                Platform: <span className="text-white/50">{tc.args.campaign_name}</span>
                              </p>
                            )}
                            {tc.args?.campaign && (
                              <p className="text-[10px] text-white/30 mt-1">
                                Campaign: <span className="text-white/50">{tc.args.campaign}</span>
                                {tc.args?.severity && (
                                  <span className={`ml-2 ${
                                    tc.args.severity === "high" ? "text-red-400" :
                                    tc.args.severity === "medium" ? "text-amber-400" : "text-blue-400"
                                  }`}>· {tc.args.severity.toUpperCase()}</span>
                                )}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Alerts fired ── */}
            {result.alerts?.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="glass rounded-2xl border border-white/5 p-5"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  </div>
                  <p className="text-xs font-bold text-white uppercase tracking-widest">Alerts Fired</p>
                  <Badge variant="outline" className="ml-auto border-red-500/20 text-red-400 text-[9px]">
                    {result.alerts.length} issues
                  </Badge>
                </div>
                <div className="space-y-3">
                  {result.alerts.map((alert: any, i: number) => (
                    <AlertCard key={i} alert={alert} index={i} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── AI Report ── */}
            {result.report && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass rounded-2xl border border-white/5 overflow-hidden"
              >
                {/* Report header bar */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 bg-[#7c6dfa]/5">
                  <div className="w-7 h-7 rounded-lg bg-[#7c6dfa]/20 border border-[#7c6dfa]/30 flex items-center justify-center">
                    <FileText className="w-3.5 h-3.5 text-[#7c6dfa]" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Daily Performance Report</p>
                    <p className="text-[10px] text-white/30">AI-generated · Llama 3.3 70B</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div className="flex items-center gap-1.5 glass border border-white/5 rounded-lg px-2.5 py-1">
                      <Clock className="w-2.5 h-2.5 text-white/30" />
                      <span className="text-[10px] text-white/40">{timestamp}</span>
                    </div>
                    <Badge variant="outline" className="border-[#7c6dfa]/30 text-[#7c6dfa] text-[9px]">
                      MCP Agent
                    </Badge>
                  </div>
                </div>

                {/* Report body */}
                <div className="px-6 py-5">
                  <ReactMarkdown components={MarkdownComponents}>
                    {result.report}
                  </ReactMarkdown>
                </div>
              </motion.div>
            )}

            {/* ── Agent Summary ── */}
            {result.summary && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="glass rounded-2xl border border-white/5 overflow-hidden"
              >
                {/* Summary header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-white/2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-xs font-bold text-white">Agent Conclusion</p>
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                    </span>
                    <span className="text-[10px] text-emerald-400">Completed</span>
                  </span>
                </div>

                {/* Summary body — styled quote blocks */}
                <div className="px-5 py-5">
                  {result.summary.split("\n\n").filter(Boolean).map((para: string, i: number) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.06 }}
                      className="flex gap-3 mb-4 last:mb-0"
                    >
                      <div className="w-0.5 flex-shrink-0 mt-1 rounded-full bg-gradient-to-b from-[#7c6dfa]/40 to-transparent self-stretch min-h-[20px]" />
                      <p className="text-sm text-white/60 leading-7 font-light">{para}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}