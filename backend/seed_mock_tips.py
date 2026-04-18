"""
Seed mock tips directly into the database for UI testing.
Run with: python seed_mock_tips.py
"""

import asyncio
from datetime import datetime, timedelta
from sqlalchemy import text

# ── Bootstrap the app config so we can connect ──
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from app.database import engine, Base
from app.models.tip import Tip


MOCK_TIPS = [
    # ── FREE TIPS (is_premium=0) ──
    {
        "fixture_id": 900001,
        "home_team": "Arsenal",
        "away_team": "Chelsea",
        "league": "Premier League",
        "match_date": datetime.utcnow() + timedelta(hours=3),
        "prediction": "Home Win",
        "odds": "1.85",
        "bookmaker": "Betway",
        "confidence": 4,
        "reasoning": "Arsenal strong at home, unbeaten in 12.",
        "category": "2+",
        "is_premium": 0,
        "result": "pending",
    },
    {
        "fixture_id": 900002,
        "home_team": "Barcelona",
        "away_team": "Real Madrid",
        "league": "La Liga",
        "match_date": datetime.utcnow() + timedelta(hours=5),
        "prediction": "Over 2.5",
        "odds": "1.72",
        "bookmaker": "Betika",
        "confidence": 5,
        "reasoning": "El Clasico always delivers goals.",
        "category": "2+",
        "is_premium": 0,
        "result": "pending",
    },
    {
        "fixture_id": 900003,
        "home_team": "Man City",
        "away_team": "Liverpool",
        "league": "Premier League",
        "match_date": datetime.utcnow() + timedelta(hours=7),
        "prediction": "GG",
        "odds": "1.55",
        "bookmaker": "Sportpesa",
        "confidence": 4,
        "reasoning": "Both teams in excellent attacking form.",
        "category": "gg",
        "is_premium": 0,
        "result": "pending",
    },
    {
        "fixture_id": 900004,
        "home_team": "Bayern Munich",
        "away_team": "Dortmund",
        "league": "Bundesliga",
        "match_date": datetime.utcnow() - timedelta(hours=6),
        "prediction": "Over 3.5",
        "odds": "2.10",
        "bookmaker": "Betway",
        "confidence": 3,
        "reasoning": "Der Klassiker — high-scoring affair expected.",
        "category": "4+",
        "is_premium": 0,
        "result": "won",
    },
    {
        "fixture_id": 900005,
        "home_team": "PSG",
        "away_team": "Marseille",
        "league": "Ligue 1",
        "match_date": datetime.utcnow() - timedelta(hours=3),
        "prediction": "Home Win",
        "odds": "1.40",
        "bookmaker": "Betika",
        "confidence": 5,
        "reasoning": "PSG dominant at Parc des Princes.",
        "category": "2+",
        "is_premium": 0,
        "result": "won",
    },

    # ── PREMIUM 2+ TIPS ──
    {
        "fixture_id": 900010,
        "home_team": "Tottenham",
        "away_team": "Newcastle",
        "league": "Premier League",
        "match_date": datetime.utcnow() + timedelta(hours=4),
        "prediction": "BTTS & Over 2.5",
        "odds": "2.05",
        "bookmaker": "Betway",
        "confidence": 4,
        "reasoning": "Open game expected, both leaky at the back.",
        "category": "2+",
        "is_premium": 1,
        "result": "pending",
    },
    {
        "fixture_id": 900011,
        "home_team": "AC Milan",
        "away_team": "Inter Milan",
        "league": "Serie A",
        "match_date": datetime.utcnow() + timedelta(hours=6),
        "prediction": "Draw",
        "odds": "3.20",
        "bookmaker": "Sportpesa",
        "confidence": 3,
        "reasoning": "Derby della Madonnina — tight affair.",
        "category": "2+",
        "is_premium": 1,
        "result": "pending",
    },
    {
        "fixture_id": 900012,
        "home_team": "Atletico Madrid",
        "away_team": "Sevilla",
        "league": "La Liga",
        "match_date": datetime.utcnow() + timedelta(hours=8),
        "prediction": "Under 2.5",
        "odds": "1.90",
        "bookmaker": "Betika",
        "confidence": 4,
        "reasoning": "Simeone's defensive masterclass expected.",
        "category": "2+",
        "is_premium": 1,
        "result": "pending",
    },

    # ── PREMIUM 4+ TIPS ──
    {
        "fixture_id": 900020,
        "home_team": "Juventus",
        "away_team": "Napoli",
        "league": "Serie A",
        "match_date": datetime.utcnow() + timedelta(hours=5),
        "prediction": "Away Win & Over 1.5",
        "odds": "3.10",
        "bookmaker": "Betway",
        "confidence": 3,
        "reasoning": "Napoli's attack too potent for Juve defense.",
        "category": "4+",
        "is_premium": 1,
        "result": "pending",
    },
    {
        "fixture_id": 900021,
        "home_team": "Wolves",
        "away_team": "Aston Villa",
        "league": "Premier League",
        "match_date": datetime.utcnow() + timedelta(hours=3),
        "prediction": "GG & Over 2.5",
        "odds": "2.30",
        "bookmaker": "Sportpesa",
        "confidence": 4,
        "reasoning": "Midlands derby, end-to-end football guaranteed.",
        "category": "4+",
        "is_premium": 1,
        "result": "pending",
    },

    # ── PREMIUM GG TIPS ──
    {
        "fixture_id": 900030,
        "home_team": "RB Leipzig",
        "away_team": "Leverkusen",
        "league": "Bundesliga",
        "match_date": datetime.utcnow() + timedelta(hours=4),
        "prediction": "GG",
        "odds": "1.60",
        "bookmaker": "Betway",
        "confidence": 5,
        "reasoning": "Both teams score in 85% of h2h meetings.",
        "category": "gg",
        "is_premium": 1,
        "result": "pending",
    },
    {
        "fixture_id": 900031,
        "home_team": "Brighton",
        "away_team": "West Ham",
        "league": "Premier League",
        "match_date": datetime.utcnow() + timedelta(hours=6),
        "prediction": "GG",
        "odds": "1.65",
        "bookmaker": "Betika",
        "confidence": 4,
        "reasoning": "Attacking teams, GG in last 5 meetings.",
        "category": "gg",
        "is_premium": 1,
        "result": "pending",
    },

    # ── PREMIUM 10+ TIPS ──
    {
        "fixture_id": 900040,
        "home_team": "Benfica",
        "away_team": "Porto",
        "league": "Liga Portugal",
        "match_date": datetime.utcnow() + timedelta(hours=5),
        "prediction": "Home Win & BTTS",
        "odds": "4.50",
        "bookmaker": "Betway",
        "confidence": 3,
        "reasoning": "O Classico — Benfica edge with home support.",
        "category": "10+",
        "is_premium": 1,
        "result": "pending",
    },
    {
        "fixture_id": 900041,
        "home_team": "Ajax",
        "away_team": "Feyenoord",
        "league": "Eredivisie",
        "match_date": datetime.utcnow() + timedelta(hours=7),
        "prediction": "Over 3.5 & BTTS",
        "odds": "3.00",
        "bookmaker": "Sportpesa",
        "confidence": 4,
        "reasoning": "De Klassieker averages 4.2 goals.",
        "category": "10+",
        "is_premium": 1,
        "result": "pending",
    },

    # ── VIP TIPS ──
    {
        "fixture_id": 900050,
        "home_team": "Real Madrid",
        "away_team": "Man City",
        "league": "Champions League",
        "match_date": datetime.utcnow() + timedelta(hours=8),
        "prediction": "Home Win & Over 2.5",
        "odds": "3.80",
        "bookmaker": "Betway",
        "confidence": 4,
        "reasoning": "UCL knockout magic — Bernabéu factor.",
        "category": "vip",
        "is_premium": 1,
        "result": "pending",
    },
    {
        "fixture_id": 900051,
        "home_team": "Liverpool",
        "away_team": "Bayern Munich",
        "league": "Champions League",
        "match_date": datetime.utcnow() + timedelta(hours=10),
        "prediction": "BTTS & Over 3.5",
        "odds": "3.50",
        "bookmaker": "Sportpesa",
        "confidence": 3,
        "reasoning": "Epic UCL clash — goals expected both ends.",
        "category": "vip",
        "is_premium": 1,
        "result": "pending",
    },
]


async def seed():
    from app.database import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        # Check if mock tips already exist
        result = await session.execute(
            text("SELECT COUNT(*) FROM tips WHERE fixture_id >= 900000 AND fixture_id < 999999")
        )
        count = result.scalar()
        if count and count > 0:
            print(f"⚠️  {count} mock tips already exist. Deleting them first...")
            await session.execute(
                text("DELETE FROM tips WHERE fixture_id >= 900000 AND fixture_id < 999999")
            )
            await session.commit()

        for tip_data in MOCK_TIPS:
            tip = Tip(**tip_data)
            session.add(tip)

        await session.commit()
        print(f"✅ Seeded {len(MOCK_TIPS)} mock tips successfully!")
        print(f"   Free tips: {sum(1 for t in MOCK_TIPS if t['is_premium'] == 0)}")
        print(f"   Premium tips: {sum(1 for t in MOCK_TIPS if t['is_premium'] == 1)}")
        print(f"   Categories: {', '.join(sorted(set(t['category'] for t in MOCK_TIPS)))}")


if __name__ == "__main__":
    asyncio.run(seed())
