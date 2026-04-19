import { describe, expect, it } from 'vitest';
import { buildVipArchiveTips } from './TipsPage';
import type { Tip } from '../services/tipsService';

function makeTip(id: number, result: Tip['result'], matchDate: string): Tip {
  return {
    id: String(id),
    fixtureId: id,
    homeTeam: `Home ${id}`,
    awayTeam: `Away ${id}`,
    league: 'Premier League',
    matchDate,
    prediction: '1X',
    odds: '2.10',
    bookmaker: 'Demo',
    bookmakerOdds: [],
    result,
    confidence: 4,
    isPremium: true,
    isFree: false,
    category: 'premium',
    reasoning: 'Test reasoning',
    createdAt: matchDate,
    updatedAt: matchDate,
  };
}

describe('buildVipArchiveTips', () => {
  it('shows all settled premium results for unlocked users', () => {
    const tips = [
      makeTip(1, 'won', '2026-04-18T12:00:00Z'),
      makeTip(2, 'lost', '2026-04-17T12:00:00Z'),
      makeTip(3, 'postponed', '2026-04-16T12:00:00Z'),
      makeTip(4, 'pending', '2026-04-15T12:00:00Z'),
    ];

    const archive = buildVipArchiveTips(tips, true);

    expect(archive.map((tip) => tip.id)).toEqual(['1', '2', '3']);
  });

  it('shows all settled premium results to the public once updated', () => {
    const tips = [
      makeTip(1, 'won', '2026-04-18T12:00:00Z'),
      makeTip(2, 'won', '2026-04-17T12:00:00Z'),
      makeTip(3, 'won', '2026-04-16T12:00:00Z'),
      makeTip(4, 'won', '2026-04-15T12:00:00Z'),
      makeTip(5, 'won', '2026-04-14T12:00:00Z'),
      makeTip(6, 'lost', '2026-04-13T12:00:00Z'),
      makeTip(7, 'lost', '2026-04-12T12:00:00Z'),
      makeTip(8, 'lost', '2026-04-11T12:00:00Z'),
      makeTip(9, 'pending', '2026-04-10T12:00:00Z'),
    ];

    const archive = buildVipArchiveTips(tips, false);
    const visibleLosses = archive.filter((tip) => tip.result === 'lost');

    expect(archive.every((tip) => tip.result !== 'pending')).toBe(true);
    expect(visibleLosses).toHaveLength(3);
    expect(archive.map((tip) => tip.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8']);
  });
});
