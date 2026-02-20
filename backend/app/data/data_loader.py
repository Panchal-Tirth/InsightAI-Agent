# backend/app/data/data_loader.py
# ── Kaggle Dataset Loader & Normalizer ───────────────────────────────────────

import os
import pandas as pd
from typing import List, Optional

_ROOT     = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "data"))
_CSV_PATH = os.path.join(_ROOT, "global_ads_performance_dataset.csv")


def _load_raw() -> pd.DataFrame:
    if not os.path.exists(_CSV_PATH):
        raise FileNotFoundError(
            f"Kaggle dataset not found at {_CSV_PATH}.\n"
            "Download from Kaggle and place it in the /data folder."
        )
    df = pd.read_csv(_CSV_PATH)
    df = df.rename(columns={
        "ad_spend": "spend",
        "CTR"     : "ctr",
        "ROAS"    : "roas",
        "CPC"     : "cpc",
        "CPA"     : "cpa",
        "platform": "campaign",
    })
    df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    for col in ["spend", "revenue", "roas", "ctr", "cpc", "cpa"]:
        if col in df.columns:
            df[col] = df[col].round(2)
    return df


def _apply_filters(
    df: pd.DataFrame,
    platform: Optional[str] = None,
    industry: Optional[str] = None,
    country : Optional[str] = None,
) -> pd.DataFrame:
    """Filter BEFORE aggregation so industry/country work correctly."""
    if platform and platform != "All":
        df = df[df["campaign"] == platform]
    if industry and industry != "All":
        df = df[df["industry"] == industry]
    if country and country != "All":
        df = df[df["country"] == country]
    return df


def _aggregate(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    agg = df.groupby(["date", "campaign"]).agg(
        impressions = ("impressions", "sum"),
        clicks      = ("clicks",      "sum"),
        spend       = ("spend",       "sum"),
        conversions = ("conversions", "sum"),
        revenue     = ("revenue",     "sum"),
        roas        = ("roas",        "mean"),
        ctr         = ("ctr",         "mean"),
        cpc         = ("cpc",         "mean"),
        cpa         = ("cpa",         "mean"),
    ).reset_index()
    for col in ["spend", "revenue", "roas", "ctr", "cpc", "cpa"]:
        agg[col] = agg[col].round(2)
    return agg


def _tail_days(df: pd.DataFrame, days: int) -> pd.DataFrame:
    """
    Returns last N days relative to the DATASET's own max date.
    This works correctly even if the dataset is from a past year.
    Never use pd.Timestamp.today() — the dataset dates won't match.
    """
    if df.empty:
        return df
    max_date = pd.to_datetime(df["date"]).max()
    cutoff   = max_date - pd.Timedelta(days=days)
    return df[pd.to_datetime(df["date"]) >= cutoff]


# ── Public functions ──────────────────────────────────────────────────────────

def load_campaigns_for_chart(
    platform: Optional[str] = None,
    industry: Optional[str] = None,
    country : Optional[str] = None,
) -> List[dict]:
    """Last 90 days (relative to dataset) for the ROAS chart."""
    df = _load_raw()
    df = _apply_filters(df, platform, industry, country)
    df = _tail_days(df, 90)
    return _aggregate(df).to_dict(orient="records") if not df.empty else []


def load_campaigns_for_agent(
    platform: Optional[str] = None,
    industry: Optional[str] = None,
    country : Optional[str] = None,
) -> List[dict]:
    """Last 30 days (relative to dataset) for the AI agent."""
    df = _load_raw()
    df = _apply_filters(df, platform, industry, country)
    df = _tail_days(df, 30)
    return _aggregate(df).to_dict(orient="records") if not df.empty else []


def get_latest_snapshot(
    platform: Optional[str] = None,
    industry: Optional[str] = None,
    country : Optional[str] = None,
) -> List[dict]:
    """Most recent aggregated row per platform for dashboard cards."""
    df  = _load_raw()
    df  = _apply_filters(df, platform, industry, country)
    agg = _aggregate(df)
    if agg.empty:
        return []
    latest = agg.sort_values("date").groupby("campaign").tail(1)
    return latest.to_dict(orient="records")


def get_filter_options() -> dict:
    df = _load_raw()
    return {
        "platforms"     : sorted(df["campaign"].unique().tolist()),
        "campaign_types": sorted(df["campaign_type"].unique().tolist()),
        "industries"    : sorted(df["industry"].unique().tolist()),
        "countries"     : sorted(df["country"].unique().tolist()),
    }


def get_campaign_names() -> List[str]:
    df = _load_raw()
    return sorted(df["campaign"].unique().tolist())