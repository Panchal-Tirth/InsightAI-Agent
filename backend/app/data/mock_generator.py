import pandas as pd
import random
from datetime import datetime, timedelta
import os

# ── Seed for reproducibility ────────────────────────────────────────────────
random.seed(42)

# ── Campaign names ───────────────────────────────────────────────────────────
CAMPAIGNS = ["Summer_Sale", "Brand_Awareness", "Retargeting", "Lead_Gen"]

# ── Generate 30 days × 4 campaigns = 120 rows ───────────────────────────────
rows = []

for day_offset in range(30):
    date = datetime.today() - timedelta(days=(30 - day_offset))

    for campaign in CAMPAIGNS:
        spend       = round(random.uniform(80, 600), 2)
        impressions = random.randint(5000, 60000)
        clicks      = random.randint(100, 3000)
        conversions = random.randint(5, 100)
        revenue     = round(conversions * random.uniform(25, 90), 2)
        roas        = round(revenue / spend, 2)
        ctr         = round((clicks / impressions) * 100, 2)

        # ── Inject deliberately bad ROAS into Lead_Gen for last 5 days ──────
        # This is your DEMO TRIGGER — the AI agent will detect this and fire
        # a high-severity alert. ROAS values 0.5–1.2 guarantee the trigger.
        if campaign == "Lead_Gen" and day_offset >= 25:
            revenue = round(spend * random.uniform(0.5, 1.2), 2)
            roas    = round(revenue / spend, 2)

        rows.append({
            "date":        date.strftime("%Y-%m-%d"),
            "campaign":    campaign,
            "impressions": impressions,
            "clicks":      clicks,
            "spend":       spend,
            "conversions": conversions,
            "revenue":     revenue,
            "roas":        roas,
            "ctr":         ctr,
        })

# ── Save to CSV ──────────────────────────────────────────────────────────────
# Output goes to the /data folder at the root of the monorepo
output_dir  = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")
output_dir  = os.path.normpath(output_dir)
output_path = os.path.join(output_dir, "mock_campaigns.csv")
print(output_path)
os.makedirs(output_dir, exist_ok=True)

df = pd.DataFrame(rows)
df.to_csv(output_path, index=False)

# ── Verification output ──────────────────────────────────────────────────────
print(f"✅  Generated {len(df)} rows  →  {output_path}")
print(f"\n📊  Campaigns:  {df['campaign'].nunique()}")
print(f"📅  Date range: {df['date'].min()}  →  {df['date'].max()}")
print(f"\n🔴  Lead_Gen ROAS (last 5 days) — should all be below 1.5:")

lead_gen_bad = df[(df["campaign"] == "Lead_Gen")].tail(5)[["date", "roas"]]
for _, row in lead_gen_bad.iterrows():
    flag = "🚨 TRIGGER" if row["roas"] < 1.5 else "✅ OK"
    print(f"    {row['date']}  ROAS = {row['roas']}  {flag}")

print("\n✅  Mock data ready. Move on to Step 3.")