# backend/app/api/webhook.py
# ── n8n Webhook Receiver — Phase 3 update ────────────────────────────────────
# The AI agent is now wired into the webhook endpoint.
#

from datetime import datetime
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()


# ── POST /api/webhook/n8n ─────────────────────────────────────────────────────
@router.post("/webhook/n8n", tags=["Webhook"])
async def n8n_webhook(request: Request):
    """
    n8n calls this endpoint on its daily schedule.
    Triggers the full AI analysis pipeline and returns results
    back to n8n so it can route alerts to Slack/Gmail.
    """
    try:
        try:
            body = await request.json()
        except Exception:
            body = {}

        # ── Load campaign data and run the agent ──────────────────────────────
        from app.data.campaigns import load_campaigns
        from app.agents.marketing_agent import run_agent

        campaign_data = load_campaigns()
        result        = await run_agent(campaign_data)

        # ── Return result to n8n ──────────────────────────────────────────────
        # n8n's IF node will check result["alerts"] to decide
        # whether to send Slack/Gmail notifications
        return JSONResponse(content={
            **result,
            "triggered_by": "n8n_webhook",
            "timestamp"   : datetime.now().isoformat(),
        })

    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "status"   : "error",
                "detail"   : str(e),
                "timestamp": datetime.now().isoformat(),
            },
        )


# ── GET /api/webhook/test ─────────────────────────────────────────────────────
@router.get("/webhook/test", tags=["Webhook"])
async def webhook_test():
    """Confirm the webhook endpoint is reachable before wiring n8n."""
    return {
        "status"    : "online",
        "message"   : "Webhook endpoint is ready to receive n8n calls.",
        "timestamp" : datetime.now().isoformat(),
    }