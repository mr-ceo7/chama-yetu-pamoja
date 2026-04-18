import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Shield, Zap, Star, Crown, Smartphone, CreditCard, Wallet, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getPricingTiers, CATEGORY_LABELS, hasAccessToCategory, type TierConfig, type SubscriptionTier } from '../services/pricingService';
import { paymentService } from '../services/paymentService';
import { toast } from 'sonner';

interface GeoData {
  country_code: string;
  currency: string;
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIER_ICONS: Record<string, React.ElementType> = { basic: Zap, standard: Star, premium: Crown };

// ── Module-level cache: pre-fetch on page load so modal opens instantly ──
let _cachedTiers: TierConfig[] | null = null;
let _cachedGeo: GeoData | null = null;

// Pre-fetch tiers immediately on module load
getPricingTiers().then(data => { _cachedTiers = data; }).catch(() => {});

// Pre-fetch geo immediately on module load
fetch('https://ipapi.co/json/')
  .then(res => res.json())
  .then(data => { _cachedGeo = data; })
  .catch(() => { _cachedGeo = { country_code: 'KE', currency: 'KES' }; });

// Pre-load Paystack script
if (typeof document !== 'undefined' && !document.getElementById('paystack-script')) {
  const script = document.createElement('script');
  script.id = 'paystack-script';
  script.src = 'https://js.paystack.co/v2/inline.js';
  script.async = true;
  document.body.appendChild(script);
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { user, refreshUser, setShowAuthModal, targetCategory, targetTierId } = useUser();
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  
  const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'paypal' | 'skrill' | 'paystack' | null>(null);
  const [phone, setPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [tiers, setTiers] = useState<TierConfig[]>([]);
  const [paymentView, setPaymentView] = useState<'selection' | 'waiting' | 'success'>('selection');
  const [currentPaymentId, setCurrentPaymentId] = useState<number | null>(null);
  const [showAllTiers, setShowAllTiers] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setPaymentView('selection');
      setCurrentPaymentId(null);
      setSelectedMethod(null);
      setSelectedTier(null);
      setShowAllTiers(false);
      return;
    }

    // Use cached data if available, otherwise fetch (fallback)
    const loadTiers = _cachedTiers ? Promise.resolve(_cachedTiers) : getPricingTiers();
    loadTiers.then(data => {
      _cachedTiers = data;
      setTiers(data);
      if (targetTierId && data.length > 0) {
        const directTier = data.find(t => t.id === targetTierId) || data[0];
        setSelectedTier(directTier);
      } else if (targetCategory && data.length > 0) {
        const validTiers = data.filter(t => t.categories.includes(targetCategory));
        validTiers.sort((a,b) => a.categories.length - b.categories.length);
        const autoTier = validTiers[0] || data.find(t => t.id === '30day') || data[0];
        setSelectedTier(autoTier);
      } else if (!targetCategory && data.length > 0) {
        const premiumTier = data.find(t => t.id === '30day') || data[0];
        setSelectedTier(premiumTier);
      }
    });

    // Use cached geo, or fetch as fallback
    if (_cachedGeo) {
      setGeoData(_cachedGeo);
      setLoadingGeo(false);
      if (_cachedGeo.currency === 'KES' || _cachedGeo.country_code === 'KE') setSelectedMethod('mpesa');
    } else {
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => { 
          _cachedGeo = data;
          setGeoData(data); 
          setLoadingGeo(false); 
          if (data.currency === 'KES' || data.country_code === 'KE') setSelectedMethod('mpesa');
        })
        .catch(() => { 
          _cachedGeo = { country_code: 'KE', currency: 'KES' };
          setGeoData(_cachedGeo); 
          setLoadingGeo(false); 
          setSelectedMethod('mpesa');
        });
    }
  }, [isOpen, targetCategory, targetTierId]);

  // Polling for payment status
  useEffect(() => {
    if (paymentView !== 'waiting' || !currentPaymentId) return;

    let pollCount = 0;
    const interval = setInterval(async () => {
      try {
        pollCount++;
        const statusResponse = await paymentService.checkStatus(currentPaymentId);
        if (statusResponse.status === 'completed') {
          clearInterval(interval);
          await refreshUser();
          setPaymentView('success');
        } else if (statusResponse.status === 'failed') {
          clearInterval(interval);
          setPaymentView('selection');
          toast.error('Payment failed or was cancelled.');
        }
        
        if (pollCount > 60) { // 2.5 minutes timeout
          clearInterval(interval);
          toast.error('Verification timed out. Please refresh if you have paid.');
          setPaymentView('selection');
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [paymentView, currentPaymentId, refreshUser]);

  const allowMpesa = (selectedTier?.currency === 'KES') || (!selectedTier && geoData?.currency === 'KES');

  const handleCheckout = async () => {
    if (!user) {
      onClose();
      setShowAuthModal(true);
      toast.error('Please sign in first');
      return;
    }
    if (!selectedTier) { toast.error('Please select a plan'); return; }
    if (!selectedMethod) { toast.error('Please select a payment method'); return; }
    if (selectedMethod === 'mpesa' && (!phone || phone.length < 9)) { toast.error('Enter a valid phone number'); return; }

    setProcessing(true);
    try {
      const payload = {
        item_type: 'subscription' as const,
        item_id: selectedTier.id,
        duration_days: selectedTier.durationDays,
        phone: selectedMethod === 'mpesa' ? `254${phone.replace(/^0/, '')}` : undefined,
      };

      let response;
      if (selectedMethod === 'mpesa') response = await paymentService.payMpesa(payload);
      else if (selectedMethod === 'paypal') response = await paymentService.payPaypal(payload);
      else if (selectedMethod === 'skrill') response = await paymentService.paySkrill(payload);
      else response = await paymentService.payPaystack(payload);

      if (selectedMethod === 'paystack' && response.access_code) {
        const paystackKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
        if (!paystackKey) {
          toast.error("Paystack configuration missing. Restart your development wrapper.");
          setProcessing(false);
          return;
        }

        const paystack = new (window as any).PaystackPop();
        paystack.newTransaction({
          key: paystackKey,
          email: user?.email,
          accessCode: response.access_code,
          channels: ['card'],
          onSuccess: (transaction: any) => {
            setCurrentPaymentId(response.id);
            setPaymentView('waiting');
          },
          onCancel: () => {
            toast.error('Payment cancelled');
            setProcessing(false);
          }
        });
        return; // Keep modal in selection view until success
      }

      if (response.auth_url && (selectedMethod === 'paypal' || selectedMethod === 'skrill')) {
        window.location.href = response.auth_url;
        return;
      }

      if (response.status === 'completed') {
        await refreshUser();
        setPaymentView('success');
      } else {
        setCurrentPaymentId(response.id);
        setPaymentView('waiting');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-150 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-pitch/90 backdrop-blur-sm" />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-zinc-950 border-2 border-zinc-800 rounded-sm shadow-[8px_8px_0_rgba(245,158,11,0.3)] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="bg-amber-500 px-4 py-3 relative flex items-center gap-3">
              <Shield className="w-7 h-7 text-black/70 shrink-0" />
              <div className="flex-1">
                <h2 className="text-lg font-black text-black uppercase tracking-wide leading-tight">Premium Access</h2>
                <p className="text-black/60 text-[11px] font-bold uppercase tracking-wider">Join the winning chama today.</p>
              </div>
              <button onClick={onClose} className="text-black/50 hover:text-black transition-colors" disabled={processing}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto">
              <AnimatePresence mode="wait">
                {paymentView === 'selection' && tiers.length === 0 && (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 space-y-3">
                    <div className="flex justify-center mb-4">
                      <div className="w-8 h-8 border-2 border-blue-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    </div>
                    <div className="h-10 bg-zinc-800 rounded-lg animate-pulse" />
                    <div className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
                    <div className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
                    <div className="h-16 bg-zinc-800 rounded-xl animate-pulse" />
                    <p className="text-center text-[10px] text-zinc-500 uppercase tracking-widest">Loading packages...</p>
                  </motion.div>
                )}
                {paymentView === 'selection' && tiers.length > 0 && (
                  <motion.div key="selection" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{targetCategory || targetTierId ? 'Selected Plan' : 'Choose Plan'}</h3>
                        {(targetCategory || targetTierId) && (
                          <button onClick={() => setShowAllTiers(prev => !prev)} className="text-[10px] text-blue-400 hover:text-emerald-300 font-bold uppercase tracking-wider">
                            {showAllTiers ? 'Show Best' : 'View All Plans'}
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                      {tiers.filter(t => {
                        if (t.id === 'free') return false; // never show the free tier as a purchasable option
                        // If opened generically (no target), show only the 3 bundle plans
                        if (!targetCategory && !targetTierId) return t.id === '5day' || t.id === '10day' || t.id === '30day';
                        // If user toggled "View All Plans", show all paid tiers
                        if (showAllTiers) return true;
                        // Show the selected tier, or fall back to matching by target
                        if (selectedTier) return selectedTier.id === t.id;
                        // selectedTier not yet set — match directly
                        if (targetTierId) return t.id === targetTierId;
                        if (targetCategory) return t.categories.includes(targetCategory);
                        return true;
                      }).map(tier => {
                        const Icon = TIER_ICONS[tier.id] || Zap;
                        const dprice = tier.price;
                        const originalPrice = tier.originalPrice;
                        const defaultOriginalPrice = originalPrice || (dprice * 1.5); // Provide standard markdown logic since no duration discount toggle now
                        const isSelected = selectedTier?.id === tier.id;
                        return (
                          <button
                            key={tier.id}
                            onClick={() => setSelectedTier(tier)}
                            className={`w-full flex items-center gap-3 p-2.5 rounded-sm border-2 transition-all text-left ${
                              isSelected 
                                ? 'border-amber-500 bg-amber-500/10 shadow-[3px_3px_0_rgba(245,158,11,0.2)]' 
                                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-800/30'
                            }`}
                          >
                            <div className={`p-1.5 rounded-sm shrink-0 ${isSelected ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-sm">{tier.name}</span>
                                {tier.popular && (
                                  <span className="bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-sm uppercase">Popular</span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate">
                                {tier.categories.filter(c => c !== 'free').map(c => CATEGORY_LABELS[c]?.label || c).join(', ')}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              {originalPrice ? (
                                <div className="text-[10px] text-zinc-500 line-through decoration-red-500/50">{tier.currency_symbol} {defaultOriginalPrice.toLocaleString()}</div>
                              ) : null}
                              <div className={`font-bold text-sm ${isSelected ? 'text-amber-400' : 'text-white'}`}>{tier.currency_symbol} {dprice.toLocaleString()}</div>
                              <div className="text-[9px] text-zinc-500 font-bold uppercase">{tier.durationDays} Days</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                          </button>
                        );
                      })}
                      </div>
                    </div>

                    {targetCategory && selectedTier && !selectedTier.categories.includes(targetCategory) && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mb-3 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                        <p className="text-[11px] text-amber-100/70 flex-1">
                          <span className="text-white font-bold">{CATEGORY_LABELS[targetCategory].label}</span> is not included in this plan.
                        </p>
                        <button onClick={() => setSelectedTier(tiers.filter(t => t.categories.includes(targetCategory)).sort((a,b) => a.categories.length - b.categories.length)[0] || selectedTier)} className="text-[10px] font-bold text-amber-400 uppercase shrink-0 flex items-center gap-1">Fix <ArrowRight className="w-3 h-3"/></button>
                      </div>
                    )}

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pay With</h3>
                        {selectedMethod && <button onClick={() => setSelectedMethod(null)} className="text-[10px] text-gold-400 hover:text-gold-300 font-bold uppercase tracking-wider py-1 pl-4">Change</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {(!selectedMethod || selectedMethod === 'mpesa') && allowMpesa && (
                          <button onClick={() => setSelectedMethod('mpesa')} className={`relative w-full flex items-center justify-center p-2.5 rounded-xl border-2 transition-all ${selectedMethod === 'mpesa' ? 'border-blue-500 bg-blue-600/10 col-span-2' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/mpesa.svg" alt="M-Pesa" className="h-6 object-contain" />
                            {selectedMethod === 'mpesa' && <Check className="absolute right-3 w-4 h-4 text-blue-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'paystack') && (
                          <button onClick={() => toast.info('Paystack integration is coming soon!')} className={`relative w-full flex items-center justify-center p-2.5 rounded-xl border-2 transition-all border-zinc-800 hover:border-zinc-700 opacity-50 cursor-not-allowed ${selectedMethod === 'paystack' ? 'col-span-2' : ''}`}>
                            <div className="flex items-center gap-2">
                              <div className="flex gap-1.5">
                                <div className="bg-linear-to-r from-blue-700 to-blue-900 rounded-[3px] px-1.5 py-0.5 shadow-xs border border-blue-600 flex items-center justify-center">
                                  <span className="text-[9px] font-black italic text-white tracking-widest leading-none">VISA</span>
                                </div>
                                <div className="bg-zinc-100 rounded-[3px] px-1 py-0.5 flex items-center justify-center shadow-xs border border-zinc-200">
                                  <svg width="18" height="12" viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="10" cy="10" r="10" fill="#EB001B" />
                                    <circle cx="22" cy="10" r="10" fill="#F79E1B" fillOpacity="0.8" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                            <div className="absolute right-2 text-[8px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Soon</div>
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'paypal') && (
                          <button onClick={() => setSelectedMethod('paypal')} className={`relative w-full flex items-center justify-center p-2.5 rounded-xl border-2 transition-all ${selectedMethod === 'paypal' ? 'border-blue-500 bg-blue-500/10 col-span-2' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/paypal.svg" alt="PayPal" className="h-5 object-contain" />
                            {selectedMethod === 'paypal' && <Check className="absolute right-3 w-4 h-4 text-blue-500" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'skrill') && (
                          <button onClick={() => toast.info('Skrill integration is coming soon!')} className={`relative w-full flex items-center justify-center p-2.5 rounded-xl border-2 transition-all border-zinc-800 hover:border-zinc-700 opacity-50 cursor-not-allowed ${selectedMethod === 'skrill' ? 'col-span-2' : ''}`}>
                            <img src="/skrill.svg" alt="Skrill" className="h-7 object-contain" />
                            <div className="absolute right-2 text-[8px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Soon</div>
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedMethod === 'mpesa' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1.5">Safaricom Number</label>
                          <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-blue-500 transition-all">
                            <div className="px-3 py-2.5 bg-zinc-900 border-r border-zinc-700 text-xs text-zinc-400 flex items-center gap-1.5">
                              <span>🇰🇪</span>
                              <span>+254</span>
                            </div>
                            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="712345678" className="w-full bg-transparent px-3 py-2.5 text-white text-sm focus:outline-hidden font-mono" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button
                      onClick={handleCheckout}
                      disabled={processing || !selectedTier || !selectedMethod || loadingGeo}
                      className="w-full bg-amber-500 text-black font-black py-3 rounded-sm border-2 border-amber-600 shadow-[4px_4px_0_rgb(217,119,6)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(217,119,6)] transition-all disabled:opacity-50 uppercase tracking-wider"
                    >
                      {processing ? 'Processing...' : `Get ${selectedTier?.name || 'Started'}`}
                    </button>
                    <p className="text-center text-[9px] text-zinc-500 mt-2 uppercase tracking-widest font-bold">Instant access granted after payment</p>
                  </motion.div>
                )}

                {paymentView === 'waiting' && (
                  <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-10">
                    <div className="w-16 h-16 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2 text-center">Verifying Payment...</h3>
                    <p className="text-zinc-400 text-center text-sm max-w-xs mb-8">
                      {selectedMethod === 'mpesa' 
                        ? 'Please check your phone for the M-Pesa PIN prompt to complete your order.' 
                        : 'Verifying your payment with the provider. Please do not close this window.'}
                    </p>
                  </motion.div>
                )}

                {paymentView === 'success' && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="w-20 h-20 bg-amber-500 rounded-sm flex items-center justify-center mb-6 shadow-[6px_6px_0_rgb(217,119,6)]">
                      <Check className="w-10 h-10 text-black" strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-wide">Access Unlocked!</h3>
                    <p className="text-zinc-400 text-sm max-w-xs mb-8">Payment confirmed. Your premium access has been activated instantly.</p>
                    <button onClick={onClose} className="w-full bg-amber-500 text-black font-black py-4 rounded-sm border-2 border-amber-600 shadow-[4px_4px_0_rgb(217,119,6)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(217,119,6)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider">Start Winning <ArrowRight className="w-5 h-5" /></button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
