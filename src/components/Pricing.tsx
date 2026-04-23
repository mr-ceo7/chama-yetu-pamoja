import React, { useEffect, useMemo, useState } from 'react';
import { Check, Zap, Star, Crown } from 'lucide-react';
import { getPricingTiers, type TierConfig } from '../services/pricingService';
import { useUser } from '../context/UserContext';

const TIER_ICONS: Record<string, React.ElementType> = {
  '5day': Zap,
  '10day': Star,
  '30day': Crown,
};

const MOBILE_TIER_NAMES: Record<string, string> = {
  '5day': '5D Trial',
  '10day': '10D Premium',
  '30day': '30D VIP',
};

const TIER_STYLES: Record<string, { border: string; icon: string; price: string; button: string; badge: string }> = {
  '5day': {
    border: 'border-zinc-700',
    icon: 'bg-zinc-800 text-zinc-300',
    price: 'text-white',
    button: 'bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700',
    badge: 'bg-zinc-800 text-zinc-200',
  },
  '10day': {
    border: 'border-blue-500/50 shadow-lg shadow-blue-500/10',
    icon: 'bg-blue-500/15 text-blue-300',
    price: 'text-blue-300',
    button: 'bg-blue-600 text-white hover:bg-blue-500',
    badge: 'bg-blue-600 text-white',
  },
  '30day': {
    border: 'border-amber-500/40 shadow-lg shadow-amber-500/10',
    icon: 'bg-amber-500/15 text-amber-300',
    price: 'text-amber-300',
    button: 'bg-amber-500 text-zinc-950 hover:bg-amber-400',
    badge: 'bg-amber-500 text-zinc-950',
  },
};

export function Pricing() {
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const { setShowPricingModal } = useUser();

  useEffect(() => {
    getPricingTiers().then(setTiers);
  }, []);

  const paidTiers = useMemo(
    () => tiers.filter((tier) => tier.id !== 'free').sort((a, b) => a.durationDays - b.durationDays),
    [tiers]
  );

  const handleSelect = (tier: TierConfig) => {
    setShowPricingModal(true, 'premium', String(tier.id));
  };

  return (
    <section className="rounded-sm border border-zinc-800 bg-zinc-950/85 p-2.5 shadow-[4px_4px_0_rgb(39,39,42)] sm:p-5">
      <div className="mb-2.5 flex items-center gap-2 sm:mb-4">
        <div className="rounded-lg bg-amber-500/15 p-2 text-amber-300">
          <Crown className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-white sm:text-xl">Choose Your Plan</h2>
          <p className="text-[9px] text-zinc-500 sm:text-xs">Unlock premium before the tips board below.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-4">
        {paidTiers.map((tier) => {
          const Icon = TIER_ICONS[tier.id] || Zap;
          const style = TIER_STYLES[tier.id] || TIER_STYLES['5day'];
          const billingLabel = tier.durationDays === 1 ? '1 day' : `${tier.durationDays} days`;

          return (
            <article
              key={tier.id}
              className={`relative flex min-w-0 flex-col rounded-lg border bg-zinc-950/70 p-2 sm:rounded-2xl sm:p-4 ${style.border}`}
            >
              {tier.popular && (
                <div className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider sm:right-3 sm:top-3 sm:px-2 sm:text-[9px] ${style.badge}`}>
                  Popular
                </div>
              )}

              <div className="mb-1.5 flex items-start gap-1.5 sm:mb-3 sm:gap-2">
                <div className={`rounded-md p-1.5 sm:rounded-lg sm:p-2 ${style.icon}`}>
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                </div>
                <div className="min-w-0 pt-0.5">
                  <h3 className="text-[11px] font-bold leading-tight text-white sm:hidden">{MOBILE_TIER_NAMES[tier.id] || tier.name}</h3>
                  <h3 className="hidden text-base font-bold leading-tight text-white sm:block">{tier.name}</h3>
                  <p className="mt-1 hidden text-xs leading-5 text-zinc-400 sm:block">{tier.description}</p>
                </div>
              </div>

              <div className="mb-2 sm:mb-4">
                {tier.originalPrice ? (
                  <div className="mb-1 text-[9px] text-zinc-500 line-through sm:text-xs">
                    {tier.currency_symbol || 'KES'} {tier.originalPrice.toLocaleString()}
                  </div>
                ) : null}
                <div className="flex flex-col items-start gap-0.5 sm:flex-row sm:items-end sm:gap-2">
                  <div className={`text-sm font-black leading-none tracking-tight sm:text-3xl ${style.price}`}>
                    {(tier.currency_symbol || 'KES') === 'KES' ? 'KES ' : `${tier.currency_symbol || 'KES'} `}
                    {tier.price.toLocaleString()}
                  </div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-zinc-500 sm:pb-1 sm:text-[10px]">
                    / {billingLabel}
                  </div>
                </div>
              </div>

              <div className="mb-2 flex-1 text-[9px] text-zinc-400 sm:mb-4 sm:text-xs">
                <div className="hidden sm:block">
                  <div className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0 text-blue-400" />
                    <span>Premium Tips</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Check className="h-3 w-3 shrink-0 text-blue-400" />
                    <span>Free tips included</span>
                  </div>
                </div>
                <div className="sm:hidden text-[8px] font-medium leading-tight text-zinc-500">Premium + Free</div>
              </div>

              <button
                onClick={() => handleSelect(tier)}
                className={`mt-auto w-full rounded-lg px-1.5 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-xs ${style.button}`}
              >
                <span className="sm:hidden">Get</span>
                <span className="hidden sm:inline">Get {tier.name}</span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
