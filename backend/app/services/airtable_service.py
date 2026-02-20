# backend/app/services/airtable_service.py
# ── Airtable Integration ──────────────────────────────────────────────────────
#
# Every time the AI agent fires create_alert, this service
# writes the alert as a new record in your Airtable "Insights" table.
#
# Airtable acts as a cloud audit log — persistent, queryable,
# and shareable with clients directly.
#

import os
import httpx
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..","..", ".env"))

AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY")
AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID")
TABLE_NAME       = "Insights"


async def log_alert_to_airtable(alert: dict) -> bool:
    """
    Write a single alert record to Airtable.

    Args:
        alert: dict with keys — campaign, issue, severity, recommendation

    Returns:
        True if successful, False if failed (non-blocking — never crashes the agent)
    """

    # ── Guard: skip if credentials not configured ─────────────────────────────
    if not AIRTABLE_API_KEY or not AIRTABLE_BASE_ID:
        print("[Airtable] ⚠️  Skipping — AIRTABLE_API_KEY or AIRTABLE_BASE_ID not set in .env")
        return False

    if AIRTABLE_API_KEY == "your-key" or AIRTABLE_BASE_ID == "your-base-id":
        print("[Airtable] ⚠️  Skipping — placeholder credentials detected. Update your .env file.")
        return False

    url     = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{TABLE_NAME}"
    headers = {
        "Authorization" : f"Bearer {AIRTABLE_API_KEY}",
        "Content-Type"  : "application/json",
    }

    payload = {
        "records": [
            {
                "fields": {
                    "Date"          : datetime.now().strftime("%Y-%m-%d"),
                    "Campaign"      : alert.get("campaign", "Unknown"),
                    "Issue"         : alert.get("issue", ""),
                    "Severity"      : alert.get("severity", "low"),
                    "Recommendation": alert.get("recommendation", ""),
                    "Status"        : "new",
                }
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload, headers=headers)

        if response.status_code == 200:
            record_id = response.json()["records"][0]["id"]
            print(f"[Airtable] ✅ Alert logged — Record ID: {record_id} | Campaign: {alert.get('campaign')}")
            return True
        else:
            print(f"[Airtable] ❌ Failed — Status {response.status_code}: {response.text}")
            return False

    except httpx.TimeoutException:
        print("[Airtable] ⚠️  Request timed out — Airtable may be slow. Alert saved locally.")
        return False
    except Exception as e:
        print(f"[Airtable] ❌ Unexpected error: {e}")
        return False


async def get_recent_alerts_from_airtable(limit: int = 10) -> list:
    """
    Fetch the most recent alert records from Airtable.
    Optional — useful for syncing the frontend with cloud records.
    """
    if not AIRTABLE_API_KEY or not AIRTABLE_BASE_ID:
        return []

    url     = f"https://api.airtable.com/v0/{AIRTABLE_BASE_ID}/{TABLE_NAME}"
    headers = {"Authorization": f"Bearer {AIRTABLE_API_KEY}"}
    params  = {
        "maxRecords"  : limit,
        "sort[0][field]"    : "Date",
        "sort[0][direction]": "desc",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers, params=params)

        if response.status_code == 200:
            records = response.json().get("records", [])
            return [r["fields"] for r in records]
        return []

    except Exception as e:
        print(f"[Airtable] ❌ Fetch failed: {e}")
        return []