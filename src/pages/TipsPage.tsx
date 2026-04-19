import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  Gift,
  Lock,
  Shield,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { LeagueLogo, TeamWithLogo } from '../components/TeamLogo';
import { SEO } from '../components/SEO';
import { getFreeTips, getPremiumTips, type Tip } from '../services/tipsService';

type TipsTab = 'free' | 'premium' | 'archive';

function getDateLabel(matchDate: string): string {
  const date = new Date(matchDate);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
}

function groupTipsByDate(tips: Tip[]) {
  const grouped = new Map<string, Tip[]>();
  for (const tip of tips) {
    const label = getDateLabel(tip.matchDate);
    const bucket = grouped.get(label) || [];
    bucket.push(tip);
    grouped.set(label, bucket);
  }
  return Array.from(grouped.entries());
}

export function buildVipArchiveTips(tips: Tip[], _premiumUnlocked: boolean): Tip[] {
  const settledTips = tips.filter((tip) => tip.result !== 'pending');
  return settledTips.sort(
    (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
  );
}

function resultBadge(result: Tip['result']) {
  if (result === 'won') return 'text-emerald-400 bg-emerald-500/10';
  if (result === 'lost') return 'text-red-400 bg-red-500/10';
  if (result === 'void') return 'text-zinc-400 bg-zinc-800';
  if (result === 'postponed') return 'text-orange-400 bg-orange-500/10';
  return 'text-zinc-600 bg-transparent';
}

function TipTable({
  title,
  subtitle,
  tips,
  locked,
  onUnlock,
}: {
  title: string;
  subtitle: string;
  tips: Tip[];
  locked?: boolean;
  onUnlock?: () => void;
}) {
  const groupedTips = useMemo(() => groupTipsByDate(tips), [tips]);

  return (
    <div className="bg-zinc-950/90 border-2 border-zinc-800 rounded-sm overflow-hidden shadow-[4px_4px_0_rgb(39,39,42)]">
      <div className="p-5 border-b border-zinc-800 bg-zinc-900/70">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-wide">{title}</h3>
            <p className="mt-1 text-xs text-zinc-400">{subtitle}</p>
          </div>
          {locked && onUnlock ? (
            <button
              onClick={onUnlock}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-amber-400 hover:bg-amber-500/20"
            >
              <Lock className="w-4 h-4" />
              Unlock
            </button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              {locked ? 'Locked' : 'Open'}
            </span>
          )}
        </div>
      </div>

      {tips.length === 0 ? (
        <div className="p-10 text-center text-sm text-zinc-500">No tips available right now.</div>
      ) : (
        <div className="overflow-hidden">
          <div className="max-h-[36rem] overflow-auto scrollbar-thin scrollbar-thumb-zinc-800">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10 bg-zinc-900">
                <tr className="border-b border-zinc-800">
                  <th className="w-8 px-3 py-2 text-left font-bold uppercase tracking-wider text-zinc-500">#</th>
                  <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-zinc-500">Match</th>
                  <th className="w-28 px-3 py-2 text-center font-bold uppercase tracking-wider text-blue-400">Tip</th>
                  <th className="w-20 px-3 py-2 text-center font-bold uppercase tracking-wider text-zinc-500">Result</th>
                </tr>
              </thead>
              <tbody>
                {groupedTips.map(([label, items]) => (
                  <React.Fragment key={label}>
                    <tr className="border-b border-zinc-800 bg-zinc-800/30">
                      <td colSpan={4} className="px-3 py-1 text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        {label}
                      </td>
                    </tr>
                    {items.map((tip, index) => {
                      const isLocked = locked && tip.result === 'pending';
                      return (
                        <tr
                          key={tip.id}
                          className={`border-b border-zinc-800/50 last:border-0 ${
                            tip.result === 'won'
                              ? 'bg-emerald-500/5'
                              : tip.result === 'lost'
                                ? 'bg-red-500/5'
                                : tip.result === 'postponed'
                                  ? 'bg-orange-500/5'
                                  : ''
                          }`}
                        >
                          <td className="px-3 py-2 text-zinc-500">{index + 1}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                <LeagueLogo leagueName={tip.league} size={12} />
                                <span>{tip.league}</span>
                                <span className="opacity-50">•</span>
                                <Clock className="w-2.5 h-2.5" />
                                {new Date(tip.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <Link to={`/match/${tip.fixtureId}`} className="inline-flex items-center gap-1 text-zinc-300 transition-colors hover:text-blue-400">
                                <TeamWithLogo teamName={tip.homeTeam} size={14} textClassName="text-xs" />
                                <span className="mx-0.5 text-zinc-600">vs</span>
                                <TeamWithLogo teamName={tip.awayTeam} size={14} textClassName="text-xs" />
                              </Link>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            {isLocked ? (
                              <div className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-zinc-600">
                                <Lock className="w-3 h-3" />
                                Locked
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-bold text-blue-400">{tip.prediction}</span>
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 5 }).map((_, starIndex) => (
                                    <Star
                                      key={starIndex}
                                      className={`w-2.5 h-2.5 ${
                                        starIndex < tip.confidence ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${resultBadge(tip.result)}`}>
                              {tip.result === 'pending' ? '—' : tip.result}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function VipArchivesBoard({
  tips,
  premiumUnlocked,
}: {
  tips: Tip[];
  premiumUnlocked: boolean;
}) {
  const archiveTips = useMemo(() => buildVipArchiveTips(tips, premiumUnlocked), [tips, premiumUnlocked]);
  const groupedTips = useMemo(() => groupTipsByDate(archiveTips), [archiveTips]);
  const overallWon = archiveTips.filter((tip) => tip.result === 'won').length;
  const overallLost = archiveTips.filter((tip) => tip.result === 'lost').length;

  return (
    <div className="mb-8 rounded-sm border-2 border-zinc-800 bg-zinc-950/90 shadow-[4px_4px_0_rgb(39,39,42)] overflow-hidden">
      <div className="border-b border-zinc-800 bg-zinc-900/70 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">VIP Archives</p>
            <h2 className="mt-2 text-xl font-black uppercase tracking-wide text-white">Premium results archive</h2>
            <p className="mt-2 max-w-2xl text-sm text-zinc-300">
              Public archive of all settled premium results after each tip has been marked won or lost.
            </p>
          </div>
          <div className="inline-flex items-center justify-center gap-2 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-black uppercase tracking-widest text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            {overallWon}W/{overallLost}L
          </div>
        </div>
      </div>

      <div className="p-5">
        {archiveTips.length === 0 ? (
          <div className="rounded-sm border border-zinc-800 bg-zinc-900/50 px-4 py-8 text-center text-sm text-zinc-500">
            No settled premium results available yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-sm border border-zinc-800">
            <div className="max-h-[28rem] overflow-auto scrollbar-thin scrollbar-thumb-zinc-800">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-zinc-900">
                  <tr className="border-b border-zinc-800">
                    <th className="px-3 py-2 text-left font-bold uppercase tracking-wider text-zinc-500">Match</th>
                    <th className="w-28 px-3 py-2 text-center font-bold uppercase tracking-wider text-blue-400">Tip</th>
                    <th className="w-24 px-3 py-2 text-center font-bold uppercase tracking-wider text-zinc-500">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTips.map(([label, items]) => {
                    const wonCount = items.filter((tip) => tip.result === 'won').length;
                    const lostCount = items.filter((tip) => tip.result === 'lost').length;

                    return (
                      <React.Fragment key={label}>
                        <tr className="border-b border-zinc-800 bg-zinc-800/30">
                          <td colSpan={3} className="px-3 py-2">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                {label}
                              </span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                                {wonCount}W/{lostCount}L
                              </span>
                            </div>
                          </td>
                        </tr>
                        {items.map((tip) => (
                          <tr key={`archive-${tip.id}`} className="border-b border-zinc-800/50 last:border-0">
                            <td className="px-3 py-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                  <LeagueLogo leagueName={tip.league} size={12} />
                                  <span>{tip.league}</span>
                                  <span className="opacity-50">•</span>
                                  {new Date(tip.matchDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="inline-flex items-center gap-1 text-zinc-300">
                                  <TeamWithLogo teamName={tip.homeTeam} size={14} textClassName="text-xs" />
                                  <span className="mx-0.5 text-zinc-600">vs</span>
                                  <TeamWithLogo teamName={tip.awayTeam} size={14} textClassName="text-xs" />
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className="text-sm font-bold text-blue-400">{tip.prediction}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${resultBadge(tip.result)}`}>
                                {tip.result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TipsPage() {
  const [activeTab, setActiveTab] = useState<TipsTab>('free');
  const [freeTips, setFreeTips] = useState<Tip[]>([]);
  const [premiumTips, setPremiumTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScreenshotWarning, setShowScreenshotWarning] = useState(false);

  const premiumUnlocked = true;
  const pendingPremium = premiumTips.filter((tip) => tip.result === 'pending').length;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'PrintScreen' ||
        (event.metaKey && event.shiftKey && (event.key === '3' || event.key === '4' || event.key === '5'))
      ) {
        setShowScreenshotWarning(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadData = async (initial = false) => {
      if (initial) setLoading(true);
      const [freeData, premiumData] = await Promise.all([
        getFreeTips(),
        getPremiumTips(),
      ]);

      if (!mounted) return;
      setFreeTips(freeData);
      setPremiumTips(premiumData);
      if (initial) setLoading(false);
    };

    void loadData(true);
    const interval = window.setInterval(() => void loadData(false), 15000);

    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const seoData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Expert Football Betting Tips',
    description: 'Daily free football tips and premium predictions from Chama Yetu Pamoja.',
    publisher: {
      '@type': 'Organization',
      name: 'Chama Yetu Pamoja',
      logo: 'https://chamayetutips.com/cyp-logo.png',
    },
  };

  return (
    <div className="container mx-auto max-w-[1400px] px-4 py-6 sm:py-10">
      <SEO
        title="Expert Football Betting Tips"
        description="Daily free football tips and premium predictions from Chama Yetu Pamoja."
        keywords="football tips, premium football predictions, free football tips, betting tips"
        canonical="https://chamayetutips.com/"
        structData={seoData}
      />

      <div className="mb-6">
        <h1 className="text-2xl font-black uppercase tracking-wide text-white sm:text-3xl">Chama Predictions</h1>
        <p className="mt-2 text-sm text-zinc-400">Exclusive winning strategies for the Chama Yetu community</p>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="w-full shrink-0 lg:sticky lg:top-24 lg:w-64">
          <h3 className="mb-3 hidden px-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 lg:block">
            Platform Navigation
          </h3>
          <div className="grid grid-cols-3 gap-2 rounded-sm border-2 border-zinc-900 bg-zinc-950 p-1 shadow-[4px_4px_0_rgba(24,24,27,0.8)] lg:grid-cols-1 lg:border-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <button
              onClick={() => setActiveTab('free')}
              className={`flex items-center justify-center gap-2 rounded-sm border-l-4 px-4 py-3 text-sm font-black uppercase tracking-widest transition-all lg:justify-start lg:px-5 ${
                activeTab === 'free'
                  ? 'border-amber-500 bg-zinc-900 text-amber-500 lg:shadow-[2px_2px_0_rgba(245,158,11,0.2)]'
                  : 'border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
              }`}
            >
              <Gift className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="flex-1 text-left">Free</span>
              {activeTab === 'free' && <ChevronRight className="hidden w-4 h-4 lg:block" />}
            </button>
            <button
              onClick={() => setActiveTab('premium')}
              className={`flex items-center justify-center gap-2 rounded-sm border-l-4 px-4 py-3 text-sm font-black uppercase tracking-widest transition-all lg:justify-start lg:px-5 ${
                activeTab === 'premium'
                  ? 'border-amber-500 bg-zinc-900 text-amber-500 lg:shadow-[2px_2px_0_rgba(245,158,11,0.2)]'
                  : 'border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
              }`}
            >
              <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="flex-1 text-left">Premium</span>
              {activeTab === 'premium' && <ChevronRight className="hidden w-4 h-4 lg:block" />}
            </button>
            <button
              onClick={() => setActiveTab('archive')}
              className={`flex items-center justify-center gap-2 rounded-sm border-l-4 px-3 py-3 text-[10px] sm:text-xs md:text-sm font-black uppercase tracking-widest transition-all lg:justify-start lg:px-5 ${
                activeTab === 'archive'
                  ? 'border-indigo-500 bg-zinc-900 text-indigo-500 lg:shadow-[2px_2px_0_rgba(99,102,241,0.2)]'
                  : 'border-transparent text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
              }`}
            >
              <Shield className="w-4 h-4 lg:w-5 lg:h-5" />
              <span className="flex-1 text-center lg:text-left truncate">Archive</span>
              {activeTab === 'archive' && <ChevronRight className="hidden w-4 h-4 lg:block" />}
            </button>
          </div>

        </div>

        <div className="min-w-0 flex-1">
          <div className={`mb-6 rounded-r-3xl rounded-l-md border-y border-r border-white/5 border-l-4 p-5 bg-gradient-to-r to-transparent ${
            activeTab === 'free' ? 'border-l-blue-500 from-blue-900/40 via-blue-800/20' : 
            activeTab === 'premium' ? 'border-l-amber-500 from-amber-900/40 via-amber-800/20' :
            'border-l-indigo-500 from-indigo-900/40 via-indigo-800/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`rounded-xl p-2.5 ${
                activeTab === 'free' ? 'bg-blue-600/20 text-blue-400' : 
                activeTab === 'premium' ? 'bg-amber-500/20 text-amber-400' :
                'bg-indigo-600/20 text-indigo-400'
              }`}>
                {activeTab === 'free' ? <Gift className="w-6 h-6" /> : 
                 activeTab === 'premium' ? <Crown className="w-6 h-6" /> :
                 <Shield className="w-6 h-6" />}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold uppercase tracking-wide text-white">
                  {activeTab === 'free' ? 'CYP Free Picks' : 
                   activeTab === 'premium' ? 'CYP Premium Picks' :
                   'VIP Archives'}
                </h2>
                <p className="mt-1 text-xs text-zinc-400">
                  {activeTab === 'free'
                    ? '100% unlocked predictions for our community'
                    : activeTab === 'premium' 
                      ? (premiumUnlocked
                          ? 'Full premium board unlocked for your account'
                          : 'One premium board. Subscribe once to unlock every paid tip')
                      : (premiumUnlocked
                          ? 'Full history of past premium results'
                          : 'Preview past premium performance. Subscribe to unlock history')}
                </p>
              </div>
            </div>
          </div>

          {activeTab === 'archive' && (
            <VipArchivesBoard
              tips={premiumTips}
              premiumUnlocked={premiumUnlocked}
            />
          )}

          {loading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="h-72 animate-pulse rounded-sm border border-zinc-800 bg-zinc-900/60" />
              <div className="h-72 animate-pulse rounded-sm border border-zinc-800 bg-zinc-900/60" />
            </div>
          ) : activeTab === 'free' ? (
            <TipTable
              title="CYP Free Picks"
              subtitle="100% unlocked predictions for our community"
              tips={freeTips}
            />
          ) : activeTab === 'premium' ? (
            <TipTable
              title="CYP Premium Picks"
              subtitle="Live premium board with pending matches visible to the public."
              tips={premiumTips.filter(tip => tip.result === 'pending')}
              locked={false}
            />
          ) : null}
        </div>
      </div>

      {showScreenshotWarning && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/90 p-4 backdrop-blur-3xl">
          <div className="relative w-full max-w-md rounded-2xl border border-blue-500/20 bg-zinc-950 p-6">
            <button
              onClick={() => setShowScreenshotWarning(false)}
              className="absolute right-4 top-4 rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h2 className="text-xl font-black text-white">Screenshot Detected</h2>
              <p className="mt-2 text-sm text-zinc-400">
                Premium content sharing is not allowed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
