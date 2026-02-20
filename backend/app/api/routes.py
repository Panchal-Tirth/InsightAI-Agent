# backend/app/api/routes.py
# ── API Routes — filter-aware ─────────────────────────────────────────────────

import json
import os
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.data.data_loader import (
    load_campaigns_for_chart,
    load_campaigns_for_agent,
    get_latest_snapshot,
    get_campaign_names,
    get_filter_options,
)

router = APIRouter()

_ROOT        = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
_ALERTS_PATH = os.path.join(_ROOT, "alerts.json")
_REPORT_PATH = os.path.join(_ROOT, "latest_report.md")


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class AnalyzeRequest(BaseModel):
    # All filters are optional — if not set, analyse everything
    platform: Optional[str] = None
    industry: Optional[str] = None
    country : Optional[str] = None


class Alert(BaseModel):
    campaign      : str
    issue         : str
    severity      : str
    recommendation: str
    timestamp     : Optional[str] = None
    status        : Optional[str] = "new"


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _read_alerts() -> List[dict]:
    if not os.path.exists(_ALERTS_PATH):
        return []
    with open(_ALERTS_PATH, "r") as f:
        return json.load(f)


def _write_alerts(alerts: List[dict]) -> None:
    os.makedirs(os.path.dirname(_ALERTS_PATH), exist_ok=True)
    with open(_ALERTS_PATH, "w") as f:
        json.dump(alerts, f, indent=2)


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/campaigns", tags=["Campaigns"])
async def get_campaigns(
    platform: Optional[str] = None,
    industry: Optional[str] = None,
    country : Optional[str] = None,
):
    """Returns 90-day chart data. Accepts optional query params for filtering."""
    try:
        data = load_campaigns_for_chart(platform, industry, country)
        return {
            "status"   : "success",
            "count"    : len(data),
            "campaigns": get_campaign_names(),
            "data"     : data,
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/campaigns/latest", tags=["Campaigns"])
async def get_latest_campaigns(
    platform: Optional[str] = None,
    industry: Optional[str] = None,
    country : Optional[str] = None,
):
    """Returns most recent platform snapshot for cards. Filterable."""
    try:
        data = get_latest_snapshot(platform, industry, country)
        return {"status": "success", "data": data}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/campaigns/filters", tags=["Campaigns"])
async def get_filters():
    """Returns unique filter values for dropdowns."""
    try:
        return {"status": "success", "filters": get_filter_options()}
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/analyze", tags=["Analysis"])
async def analyze_campaigns(request: AnalyzeRequest = AnalyzeRequest()):
    """
    Runs the AI agent with optional filters.
    Filters are applied before aggregation inside the data loader.
    """
    try:
        all_data = load_campaigns_for_agent(
            platform = request.platform,
            industry = request.industry,
            country  = request.country,
        )

        if not all_data:
            raise HTTPException(
                status_code=404,
                detail=(
                    "No data found for the selected filters. "
                    "Try a different industry or country combination."
                )
            )

        from app.agents.marketing_agent import run_agent
        result = await run_agent(all_data)
        return result

    except HTTPException:
        raise
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent failed: {str(e)}")


@router.get("/report", tags=["Analysis"])
async def get_latest_report():
    if not os.path.exists(_REPORT_PATH):
        return {"status": "not_found", "message": "No report yet.", "report": ""}
    with open(_REPORT_PATH, "r", encoding="utf-8") as f:
        return {"status": "success", "report": f.read()}


@router.get("/alerts", tags=["Alerts"])
async def get_alerts():
    alerts = _read_alerts()
    return {
        "status": "success",
        "count" : len(alerts),
        "alerts": sorted(alerts, key=lambda x: x.get("timestamp", ""), reverse=True),
    }


@router.post("/alerts", tags=["Alerts"])
async def create_alert(alert: Alert):
    alerts = _read_alerts()
    new_alert = alert.dict()
    new_alert["timestamp"] = datetime.now().isoformat()
    new_alert["status"]    = "new"
    alerts.append(new_alert)
    _write_alerts(alerts)
    return {"status": "success", "alert": new_alert}


@router.delete("/alerts", tags=["Alerts"])
async def clear_alerts():
    _write_alerts([])
    return {"status": "success", "message": "All alerts cleared."}