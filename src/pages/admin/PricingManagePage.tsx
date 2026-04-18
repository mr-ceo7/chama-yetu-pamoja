import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Check, X, Star, Calendar, DollarSign } from 'lucide-react';
import { getPricingTiers, updatePricingTier, addPricingTier, deletePricingTier, type TierConfig } from '../../services/pricingService';
import { toast } from 'sonner';

const TIER_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '5day': { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
  '10day': { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
  '30day': { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400' },
  // Legacy keys for backwards compatibility
  basic: { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-400' },
  standard: { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-400' },
  premium: { bg: 'bg-yellow-500/5', border: 'border-yellow-500/20', text: 'text-yellow-400' },
};

export function PricingManagePage() {
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [tierForm, setTierForm] = useState({ price: 0, durationDays: 0 });
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState({
    tier_id: '', name: '', description: '',
    price: 200, durationDays: 5,
    categories: ['free', 'premium'] as string[],
    popular: false,
  });

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = () => {
    getPricingTiers().then(setTiers);
  };

  const startEdit = (tier: TierConfig) => {
    setEditingTier(tier.id);
    setTierForm({ 
      price: tier.price, 
      durationDays: tier.durationDays,
    });
  };

  const saveEdit = async (tierId: string) => {
    await updatePricingTier(tierId, {
      price: tierForm.price,
      durationDays: tierForm.durationDays,
    });
    loadTiers();
    setEditingTier(null);
    toast.success('Pricing updated');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForm.tier_id || !newForm.name) {
      toast.error('Tier ID and Name are required');
      return;
    }
    if (newForm.durationDays <= 0) {
      toast.error('Duration must be at least 1 day');
      return;
    }
    const result = await addPricingTier(newForm as any);
    if (result) {
      loadTiers();
      setShowNewForm(false);
      setNewForm({ tier_id: '', name: '', description: '', price: 200, durationDays: 5, categories: ['free', 'premium'], popular: false });
      toast.success('New plan created');
    }
  };

  const handleDelete = async (tierId: string) => {
    if (!confirm(`Delete the "${tierId}" plan? This cannot be undone.`)) return;
    const success = await deletePricingTier(tierId);
    if (success) {
      loadTiers();
      toast.success('Plan deleted');
    }
  };

  return (
    <div className="space-y-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-display">Pricing Plans</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage duration-based subscription pricing. Changes reflect immediately.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm shrink-0"
        >
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* ─── New Tier Form ───────────────────────────────── */}
      {showNewForm && (
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-sm">
          <h3 className="text-lg font-bold text-white mb-4 font-display">Create Subscription Plan</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Tier ID <span className="text-emerald-400">*</span></label>
              <input value={newForm.tier_id} onChange={e => setNewForm({ ...newForm, tier_id: e.target.value })} placeholder="e.g. 7day" className="admin-input" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Display Name <span className="text-emerald-400">*</span></label>
              <input value={newForm.name} onChange={e => setNewForm({ ...newForm, name: e.target.value })} placeholder="e.g. 7 Days Weekly Plan" className="admin-input" required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Price (KES)</label>
              <input type="number" value={newForm.price} onChange={e => setNewForm({ ...newForm, price: parseInt(e.target.value) || 0 })} className="admin-input" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Duration (Days)</label>
              <input type="number" min="1" value={newForm.durationDays} onChange={e => setNewForm({ ...newForm, durationDays: parseInt(e.target.value) || 0 })} className="admin-input" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1 tracking-wider">Description</label>
              <input value={newForm.description} onChange={e => setNewForm({ ...newForm, description: e.target.value })} placeholder="e.g. 7 days of full access to all tips" className="admin-input" />
            </div>
            <div className="flex items-center gap-3 py-2">
              <input type="checkbox" id="isPopularNew" checked={newForm.popular} onChange={e => setNewForm({ ...newForm, popular: e.target.checked })} className="w-4 h-4 accent-emerald-500" />
              <label htmlFor="isPopularNew" className="text-sm text-zinc-300">Highlight as "Popular"</label>
            </div>
            <div className="sm:col-span-2 flex gap-3 mt-2">
              <button type="submit" className="flex-1 py-2.5 bg-emerald-500 text-zinc-950 font-bold rounded-xl hover:bg-emerald-400 transition-all text-sm">Create Plan</button>
              <button type="button" onClick={() => setShowNewForm(false)} className="px-6 py-2.5 bg-zinc-800 text-zinc-300 rounded-xl hover:bg-zinc-700 transition-all text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* ─── Tier Cards ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {tiers.filter(t => t.id !== 'free').map(tier => {
          const colors = TIER_COLORS[tier.id] || { bg: 'bg-zinc-900/60', border: 'border-zinc-800/60', text: 'text-zinc-400' };
          return (
            <div key={tier.id} className={`${colors.bg} border ${colors.border} rounded-2xl p-5 transition-all hover:scale-[1.01]`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className={`text-lg font-bold ${colors.text} font-display`}>{tier.name}</h4>
                    {tier.popular && (
                      <span className="bg-emerald-500 text-emerald-950 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">Popular</span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Premium tips access
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {editingTier === tier.id ? (
                    <>
                      <button onClick={() => saveEdit(tier.id)} className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-all">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingTier(null)} className="p-1.5 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(tier)} className="p-1.5 bg-zinc-800/60 text-zinc-400 rounded-lg hover:bg-zinc-700 hover:text-white transition-all">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(tier.id)} className="p-1.5 bg-zinc-800/60 text-zinc-400 rounded-lg hover:bg-red-500/10 hover:text-red-400 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {editingTier === tier.id ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                        <DollarSign className="w-3 h-3 inline mr-0.5 mb-0.5" />Price (KES)
                      </label>
                      <input type="number" value={tierForm.price} onChange={e => setTierForm({ ...tierForm, price: parseInt(e.target.value) || 0 })} className="admin-input py-1.5 px-3 text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">
                        <Calendar className="w-3 h-3 inline mr-0.5 mb-0.5" />Duration (Days)
                      </label>
                      <input type="number" min="1" value={tierForm.durationDays} onChange={e => setTierForm({ ...tierForm, durationDays: parseInt(e.target.value) || 0 })} className="admin-input py-1.5 px-3 text-sm" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-end justify-between bg-zinc-950/50 p-3 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1">Price</span>
                        <span className="text-xl font-bold text-white">{tier.currency_symbol || 'KES'} {tier.price.toLocaleString()}</span>
                      </div>
                      <div className="w-px h-8 bg-zinc-800" />
                      <div className="text-center">
                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1">Duration</span>
                        <span className="text-xl font-bold text-white">{tier.durationDays} <span className="text-sm text-zinc-400">Days</span></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold block mb-1">Per Day</span>
                      <span className={`text-sm font-bold ${colors.text}`}>
                        {tier.durationDays > 0 ? `${(tier.price / tier.durationDays).toFixed(0)} KES` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
