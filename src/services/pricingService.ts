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
    categories: ['free', 'premium'],
    popular: false,
  },
  {
    id: '10day' as SubscriptionTier,
    name: '10 Days Premium Plan',
    description: '10 days of full access to all our premium football predictions.',
    price: 500,
    durationDays: 10,
    categories: ['free', 'premium'],
    popular: true,
  },
  {
    id: '30day' as SubscriptionTier,
    name: '30 Days Monthly VIP',
    description: 'Full 30 days of VIP access. Best value for serious players.',
    price: 1000,
    durationDays: 30,
    categories: ['free', 'premium'],
    popular: false,
  },
];

export const CATEGORY_LABELS: Record<TipCategory, { label: string; minTier: SubscriptionTier }> = {
  free: { label: 'Free Tips', minTier: 'free' },
  premium: { label: 'Premium Tips', minTier: '5day' },
  '2+': { label: 'Premium Tips', minTier: '5day' },
  '4+': { label: 'Premium Tips', minTier: '5day' },
  gg: { label: 'Premium Tips', minTier: '5day' },
  '10+': { label: 'Premium Tips', minTier: '5day' },
  vip: { label: 'Premium Tips', minTier: '5day' },
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
  return userTier !== 'free';
}

const detectUserCountry = async () => 'KE';

function normalizeTierCategories(categories: unknown, tierId: string): TipCategory[] {
  const parsed = Array.isArray(categories)
    ? categories
    : JSON.parse(String(categories || '[]'));
  if (tierId === 'free') {
    return ['free'];
  }
  const hasPaidAccess = parsed.some((value: unknown) => String(value).toLowerCase() !== 'free');
  return hasPaidAccess ? ['free', 'premium'] : ['premium'];
}

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
        categories: normalizeTierCategories(t.categories, t.tier_id),
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
        categories: normalizeTierCategories(t.categories, t.tier_id),
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
