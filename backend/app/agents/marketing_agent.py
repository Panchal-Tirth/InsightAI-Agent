# backend/app/agents/marketing_agent.py
# ── AI Agent Brain — updated for Kaggle dataset ───────────────────────────────

import json
import os

from dotenv import load_dotenv
from openai import AsyncOpenAI

from app.agents.mcp_tools import TOOLS, execute_tool

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

client = AsyncOpenAI(
    api_key  = os.getenv("GROQ_API_KEY"),
    base_url = "https://api.groq.com/openai/v1",
)

MODEL = "llama-3.3-70b-versatile"
# MODEL = "llama-3.1-8b-instant"


# ══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPT — updated for platform-based Kaggle data
# ══════════════════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """
You are an expert AI marketing analyst working for a global digital agency.

You receive aggregated daily performance data for 3 ad platforms:
  - Google Ads
  - Meta Ads
  - TikTok Ads

Each row represents one platform's aggregated daily performance across all
industries and countries. Key metrics:
  - roas    : Return on Ad Spend (revenue / spend) — PRIMARY health metric
  - ctr     : Click-through rate (%)
  - cpc     : Cost per click ($)
  - cpa     : Cost per acquisition ($)
  - spend   : Total ad spend ($)
  - revenue : Total attributed revenue ($)
  - conversions: Total conversions

SEVERITY RULES (based on ROAS):
  high   = ROAS below 0.8   → campaign is losing money, act immediately
  medium = ROAS 0.8 to 1.2  → poor performance, needs intervention
  low    = ROAS 1.2 to 1.5  → below target, monitor closely

YOUR STEPS:
  1. SCAN all 3 platforms for ROAS below 1.5
  2. VERIFY trends using get_campaign_trend before alerting
     (confirm it's a multi-day trend, not a single bad day)
  3. FIRE alerts using create_alert for confirmed underperformers
     - Be specific: name the platform, exact ROAS value, date range
     - Give actionable recommendations (budget reallocation, bid strategy,
       creative refresh, audience targeting)
     - Mention which platform is outperforming and suggest shifting budget
  4. GENERATE a daily report covering all 3 platforms using generate_report
     - Include platform comparison table
     - Note which platform has best/worst ROAS
     - Highlight spend efficiency (revenue per dollar spent)

RULES:
  - Always reference specific metric values (e.g. "ROAS of 0.92 over 7 days")
  - Compare platforms against each other in recommendations
  - If a platform has high CPA, flag it even if ROAS seems acceptable
  - Generate the report even if all platforms are healthy
  - Do not create duplicate alerts for the same platform in one run
"""


# ══════════════════════════════════════════════════════════════════════════════
# AGENT RUNNER
# ══════════════════════════════════════════════════════════════════════════════

async def run_agent(campaign_data: list) -> dict:
    recent_data = _get_recent_data(campaign_data, days=7)

    platforms = list(set(r["campaign"] for r in recent_data))

    user_message = f"""
Analyse the following ad platform performance data.
This covers the last 7 days aggregated across all industries and countries.

Platforms being analysed: {platforms}
Total data rows: {len(recent_data)}

Data:
{json.dumps(recent_data, indent=2)}

Follow your analysis steps:
1. Check each platform's ROAS and secondary metrics (CTR, CPC, CPA)
2. Use get_campaign_trend to verify suspicious platforms
3. Create alerts for underperforming platforms
4. Generate the daily cross-platform performance report
"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user",   "content": user_message},
    ]

    alerts_created  = []
    report_result   = None
    tool_calls_log  = []
    overall_health  = "healthy"
    max_iterations  = 10
    iteration       = 0
    response_message = None

    while iteration < max_iterations:
        iteration += 1

        response = await client.chat.completions.create(
            model       = MODEL,
            messages    = messages,
            tools       = TOOLS,
            tool_choice = "auto",
            temperature = 0.2,
        )

        response_message = response.choices[0].message
        messages.append(response_message)

        if not response_message.tool_calls:
            break

        for tool_call in response_message.tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)

            tool_calls_log.append({
                "tool"     : tool_name,
                "args"     : tool_args,
                "iteration": iteration,
            })

            tool_result = await execute_tool(tool_name, tool_args, campaign_data)

            if tool_name == "create_alert" and tool_result.get("success"):
                alerts_created.append(tool_result["alert"])
                severity = tool_args.get("severity", "low")
                if severity == "high":
                    overall_health = "critical"
                elif severity == "medium" and overall_health != "critical":
                    overall_health = "warning"
                elif severity == "low" and overall_health == "healthy":
                    overall_health = "warning"

            elif tool_name == "generate_report" and tool_result.get("success"):
                report_result = tool_result

            messages.append({
                "role"        : "tool",
                "tool_call_id": tool_call.id,
                "content"     : json.dumps(tool_result),
            })

    final_summary = ""
    if response_message and response_message.content:
        final_summary = response_message.content

    return {
        "status"        : "success",
        "alerts"        : alerts_created,
        "report"        : report_result.get("report", "") if report_result else "",
        "summary"       : final_summary,
        "overall_health": overall_health,
        "tool_calls_log": tool_calls_log,
        "rows_analysed" : len(campaign_data),
        "alerts_count"  : len(alerts_created),
    }


def _get_recent_data(campaign_data: list, days: int = 7) -> list:
    """Returns most recent N days per platform."""
    by_platform: dict[str, list] = {}
    for row in campaign_data:
        camp = row.get("campaign", "unknown")
        by_platform.setdefault(camp, []).append(row)

    recent = []
    for camp, rows in by_platform.items():
        sorted_rows = sorted(rows, key=lambda x: x.get("date", ""))
        recent.extend(sorted_rows[-days:])

    return recent