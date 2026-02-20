# backend/app/agents/mcp_tools.py
# ── MCP Tool Definitions + Execution — Phase 6 update ────────────────────────
# Only change from Phase 3: _execute_create_alert now calls Airtable

import json
import os
from datetime import datetime
from typing import Any

_ROOT        = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
_ALERTS_PATH = os.path.join(_ROOT, "alerts.json")
_REPORT_PATH = os.path.join(_ROOT, "latest_report.md")


# ══════════════════════════════════════════════════════════════════════════════
# TOOL DEFINITIONS
# ══════════════════════════════════════════════════════════════════════════════

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_alert",
            "description": (
                "Fire an alert when a platform is underperforming. "
                "Use when ROAS is below 1.5, CTR drops significantly, "
                "or conversions decline over multiple days. "
                "Severity: high = ROAS below 0.8, medium = 0.8–1.2, low = 1.2–1.5."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign":       {"type": "string", "description": "Platform name (e.g. Google Ads)"},
                    "issue":          {"type": "string", "description": "Specific issue with metric values and timeframe"},
                    "severity":       {"type": "string", "enum": ["low", "medium", "high"]},
                    "recommendation": {"type": "string", "description": "Specific actionable recommendation"},
                },
                "required": ["campaign", "issue", "severity", "recommendation"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generate_report",
            "description": (
                "Generate a full markdown daily performance report. "
                "Call this AFTER all alerts have been created."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "summary_text":       {"type": "string",  "description": "Full markdown report content"},
                    "campaigns_analysed": {"type": "array",   "items": {"type": "string"}},
                    "total_alerts_fired": {"type": "integer"},
                    "overall_health":     {"type": "string",  "enum": ["healthy", "warning", "critical"]},
                },
                "required": ["summary_text", "campaigns_analysed", "total_alerts_fired", "overall_health"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_campaign_trend",
            "description": (
                "Get last N days of performance data for a specific platform. "
                "Call this BEFORE creating an alert to verify it's a real trend."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "campaign_name": {"type": "string"},
                    "days":         {"type": "integer", "default": 7},
                    "metric":       {"type": "string",  "enum": ["roas", "ctr", "conversions", "spend", "revenue", "all"], "default": "all"},
                },
                "required": ["campaign_name"],
            },
        },
    },
]


# ══════════════════════════════════════════════════════════════════════════════
# TOOL EXECUTION ROUTER
# ══════════════════════════════════════════════════════════════════════════════

async def execute_tool(tool_name: str, args: dict, campaign_data: list) -> Any:
    if tool_name == "create_alert":
        return await _execute_create_alert(args)
    elif tool_name == "generate_report":
        return await _execute_generate_report(args)
    elif tool_name == "get_campaign_trend":
        return await _execute_get_campaign_trend(args, campaign_data)
    else:
        return {"error": f"Unknown tool: {tool_name}"}


# ══════════════════════════════════════════════════════════════════════════════
# TOOL EXECUTORS
# ══════════════════════════════════════════════════════════════════════════════

async def _execute_create_alert(args: dict) -> dict:
    """
    1. Saves alert to alerts.json (local)
    2. Logs alert to Airtable (cloud) ← Phase 6 live
    """
    alert = {
        "campaign"      : args["campaign"],
        "issue"         : args["issue"],
        "severity"      : args["severity"],
        "recommendation": args["recommendation"],
        "timestamp"     : datetime.now().isoformat(),
        "status"        : "new",
    }

    # ── Save to local alerts.json ─────────────────────────────────────────────
    os.makedirs(_ROOT, exist_ok=True)
    existing = []
    if os.path.exists(_ALERTS_PATH):
        with open(_ALERTS_PATH, "r") as f:
            try:
                existing = json.load(f)
            except json.JSONDecodeError:
                existing = []

    existing.append(alert)
    with open(_ALERTS_PATH, "w") as f:
        json.dump(existing, f, indent=2)

    # ── Phase 6: Log to Airtable ──────────────────────────────────────────────
    try:
        from app.services.airtable_service import log_alert_to_airtable
        await log_alert_to_airtable(alert)
    except Exception as e:
        # Non-blocking — local save already succeeded
        print(f"[Airtable] Warning: {e}")
    # ─────────────────────────────────────────────────────────────────────────

    return {
        "success": True,
        "message": f"Alert created for {args['campaign']} (severity: {args['severity']})",
        "alert"  : alert,
    }


async def _execute_generate_report(args: dict) -> dict:
    report_content = f"""# Daily Campaign Performance Report
**Generated:** {datetime.now().strftime("%Y-%m-%d %H:%M")}
**Overall Health:** {args.get("overall_health", "unknown").upper()}
**Alerts Fired:** {args.get("total_alerts_fired", 0)}
**Campaigns Analysed:** {", ".join(args.get("campaigns_analysed", []))}

---

{args.get("summary_text", "")}
"""
    os.makedirs(_ROOT, exist_ok=True)
    with open(_REPORT_PATH, "w", encoding="utf-8") as f:
        f.write(report_content)

    return {
        "success"       : True,
        "message"       : "Report generated and saved.",
        "report"        : report_content,
        "overall_health": args.get("overall_health"),
        "alerts_fired"  : args.get("total_alerts_fired", 0),
    }


async def _execute_get_campaign_trend(args: dict, campaign_data: list) -> dict:
    campaign_name = args["campaign_name"]
    days          = args.get("days", 7)
    metric        = args.get("metric", "all")

    rows = [r for r in campaign_data if r.get("campaign") == campaign_name]

    if not rows:
        return {
            "success": False,
            "message": f"No data found for: {campaign_name}",
            "trend"  : [],
        }

    rows_sorted = sorted(rows, key=lambda x: x.get("date", ""))
    recent_rows = rows_sorted[-days:]

    if metric != "all":
        trend = [{"date": r.get("date"), metric: r.get(metric)} for r in recent_rows]
    else:
        trend = recent_rows

    # Trend direction
    if len(recent_rows) >= 2 and metric != "all":
        first_val  = recent_rows[0].get(metric, 0) or 0
        last_val   = recent_rows[-1].get(metric, 0) or 0
        change_pct = round(((last_val - first_val) / first_val) * 100, 1) if first_val > 0 else 0
        direction  = "declining" if change_pct < -5 else "improving" if change_pct > 5 else "stable"
    else:
        change_pct = None
        direction  = "unknown"

    return {
        "success"        : True,
        "campaign"       : campaign_name,
        "days_retrieved" : len(trend),
        "metric"         : metric,
        "trend"          : trend,
        "trend_direction": direction,
        "change_percent" : change_pct,
    }