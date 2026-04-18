import type { TipCategory } from './tipsService';
import apiClient from './apiClient';
import { toast } from 'sonner';

export type SubscriptionTier = 'free' | '5day' | '10day' | '30day' | string; // Use string as fallback for regional/dynamic tiers

export interface TierConfig {
  id: SubscriptionTier;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  categories: TipCategory[];
  popular: boolean;
  currency?: string;
  currency_symbol?: string;
  regional_prices?: Record<string, any>;
  originalPrice?: number;
}

const FREE_TIER: TierConfig = {
  id: 'free',
  name: 'Free',
  description: 'Free access tier.',
  price: 0,
  durationDays: 0,
  categories: ['free'],
  popular: false,
  currency: 'KES',
  currency_symbol: 'KES',
};

const DEFAULT_TIERS: TierConfig[] = [
  FREE_TIER,
  {
    id: '5day' as SubscriptionTier,
    name: '5 Days Trial Plan',
    description: '5 days of immediate full access to all premium tips and odds.',
    price: 200,
    durationDays: 5,
    categories: ['free', '2+', '4+', 'gg', '10+', 'vip'],
    popular: false,
  },
  {
    id: '10day' as SubscriptionTier,
    name: '10 Days Premium Plan',
    description: '10 days of full access to all our premium football predictions.',
    price: 500,
    durationDays: 10,
    categories: ['free', '2+', '4+', 'gg', '10+', 'vip'],
    popular: true,
  },
  {
    id: '30day' as SubscriptionTier,
    name: '30 Days Monthly VIP',
    description: 'Full 30 days of VIP access. Best value for serious players.',
    price: 1000,
    durationDays: 30,
    categories: ['free', '2+', '4+', 'gg', '10+', 'vip'],
    popular: false,
  },
];

export const CATEGORY_LABELS: Record<TipCategory, { label: string; minTier: SubscriptionTier }> = {
  'free': { label: 'Free Tips', minTier: 'free' },
  '2+': { label: '2+ Odds', minTier: 'basic' },
  '4+': { label: '4+ Odds', minTier: 'standard' },
  'gg': { label: 'GG (BTTS)', minTier: 'standard' },
  '10+': { label: '10+ Odds', minTier: 'premium' },
    'vip': { label: 'VIP Special (80+)', minTier: 'premium' },
};

let cachedTiers: TierConfig[] = [...DEFAULT_TIERS];

function ensureFreeTier(tiers: TierConfig[]): TierConfig[] {
  if (tiers.some((tier) => tier.id === 'free')) {
    return tiers;
  }
  return [FREE_TIER, ...tiers];
}

export function hasAccessToCategory(userTier: SubscriptionTier, category: TipCategory): boolean {
    if (category === 'free') return true;
    if (userTier === '30day' || userTier === '10day' || userTier === '5day' || userTier === 'premium') return true;
    
    // Check if the current tier explicitly contains the category
    const tierConfig = cachedTiers.find(t => t.id === userTier);
    if (tierConfig && tierConfig.categories.includes(category)) {
        return true;
    }
    
    // Fallback logic for legacy users
    const TIER_RANK: Record<string, number> = { free: 0, basic: 1, standard: 2, premium: 3, '5day': 3, '10day': 3, '30day': 3 };
    const requiredTier = CATEGORY_LABELS[category]?.minTier || 'premium';
    return (TIER_RANK[userTier] || 0) >= (TIER_RANK[requiredTier] || 3);
}

const detectUserCountry = async () => 'KE';

export async function getPricingTiers(): Promise<TierConfig[]> {
  try {
    const country = await detectUserCountry();
    const query = country ? `?country=${country}` : '';
    const response = await apiClient.get(`/subscriptions/tiers${query}`);
    if (response.data && response.data.length > 0) {
      const mappedTiers = response.data.map((t: any) => ({
        id: t.tier_id,
        name: t.name,
        description: t.description,
        price: t.price,
        durationDays: t.duration_days,
        categories: Array.isArray(t.categories) ? t.categories : JSON.parse(t.categories || '[]'),
        popular: t.popular,
        currency: t.currency || 'KES',
        currency_symbol: t.currency_symbol || 'KES',
        regional_prices: t.regional_prices || {},
        originalPrice: t.original_price,
      }));
      cachedTiers = ensureFreeTier(mappedTiers);
      return cachedTiers;
    }
    cachedTiers = ensureFreeTier(cachedTiers);
    return cachedTiers;
  } catch (error) {
    console.error('Failed to fetch pricing tiers, falling back to default', error);
    cachedTiers = ensureFreeTier(cachedTiers);
    return cachedTiers;
  }
}

export async function updatePricingTier(tierId: string, updates: Partial<TierConfig>): Promise<TierConfig | null> {
  try {
    const payload = {
      name: updates.name,
      description: updates.description,
      price: updates.price,
      duration_days: updates.durationDays,
      categories: updates.categories,
      popular: updates.popular,
      regional_prices: updates.regional_prices,
    };
    const response = await apiClient.put(`/subscriptions/tiers/${tierId}`, payload);
    const t = response.data;
    return {
      id: t.tier_id,
      name: t.name,
      description: t.description,
      price: t.price,
      durationDays: t.duration_days,
      categories: Array.isArray(t.categories) ? t.categories : JSON.parse(t.categories || '[]'),
      popular: t.popular,
    };
  } catch (error) {
    console.error('Failed to update tier', error);
    toast.error('Failed to update pricing tier');
    return null;
  }
}

export async function addPricingTier(tierData: Omit<TierConfig, 'id'> & { tier_id: string }): Promise<TierConfig | null> {
  try {
    const payload = {
      tier_id: tierData.tier_id,
      name: tierData.name,
      description: tierData.description,
      price: tierData.price,
      duration_days: tierData.durationDays,
      categories: tierData.categories,
      popular: tierData.popular || false,
    };
    const response = await apiClient.post('/subscriptions/tiers', payload);
    const t = response.data;
    return {
      id: t.tier_id,
      name: t.name,
      description: t.description,
      price: t.price,
      durationDays: t.duration_days,
      categories: t.categories,
      popular: t.popular,
    };
  } catch (error) {
    console.error('Failed to add tier', error);
    toast.error('Failed to create new tier');
    return null;
  }
}

export async function deletePricingTier(tierId: string): Promise<boolean> {
  try {
    await apiClient.delete(`/subscriptions/tiers/${tierId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete tier', error);
    toast.error('Failed to delete tier');
    return false;
  }
}
