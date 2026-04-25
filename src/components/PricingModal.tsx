import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Shield, Zap, Star, Crown, Smartphone, CreditCard, Wallet, Lock } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { getPricingTiers, type TierConfig, type SubscriptionTier } from '../services/pricingService';
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

const TIER_ICONS: Record<string, React.ElementType> = { basic: Zap, standard: Star, premium: Crown, '5day': Zap, '10day': Star, '30day': Crown };

const MOBILE_TIER_NAMES: Record<string, string> = {
  '5day': '5 Days',
  '10day': '10 Days',
  '30day': '30 Days',
};

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
  const { user, refreshUser, targetCategory, targetTierId } = useUser();
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  const [loadingGeo, setLoadingGeo] = useState(true);
  
  const [selectedTier, setSelectedTier] = useState<TierConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'mpesa' | 'paypal' | 'skrill' | 'paystack' | null>(null);
  const [phone, setPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
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
      setPhone('');
      setGuestEmail('');
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
      } else if (data.length > 0) {
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
  }, [isOpen, targetTierId]);

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
    if (!selectedTier) { toast.error('Please select a plan'); return; }
    if (!selectedMethod) { toast.error('Please select a payment method'); return; }
    if (!user?.email && !guestEmail.trim()) { toast.error('Enter your email to continue'); return; }

    setProcessing(true);
    try {
      const payload = {
        item_type: 'subscription' as const,
        item_id: selectedTier.id,
        duration_days: selectedTier.durationDays,
        phone: undefined,
        email: user?.email || guestEmail.trim(),
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
          email: user?.email || guestEmail.trim(),
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
            className="relative w-full max-w-lg bg-zinc-950 border-2 border-zinc-800 rounded-sm shadow-[8px_8px_0_rgba(245,158,11,0.3)] overflow-hidden flex flex-col max-h-[88vh] sm:max-h-[90vh]"
          >
            <div className="bg-amber-500 px-3 py-2.5 relative flex items-center gap-2.5 sm:px-4 sm:py-3 sm:gap-3">
              <Shield className="w-6 h-6 text-black/70 shrink-0 sm:w-7 sm:h-7" />
              <div className="flex-1">
                <h2 className="text-base font-black text-black uppercase tracking-wide leading-tight sm:text-lg">Premium Access</h2>
                <p className="text-black/60 text-[10px] font-bold uppercase tracking-wider sm:text-[11px]">Join the winning chama today.</p>
              </div>
              <button onClick={onClose} className="text-black/50 hover:text-black transition-colors p-0.5" disabled={processing}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto sm:p-4">
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
                    <div className="mb-2.5 sm:mb-3">
                      <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest sm:text-[10px]">{selectedTier ? 'Selected Plan' : 'Choose Plan'}</h3>
                        {selectedTier && (
                          <button onClick={() => setSelectedTier(null)} className="text-[9px] text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider py-1 transition-colors sm:text-[10px]">
                            Change Plan
                          </button>
                        )}
                      </div>
                      <div className="rounded-sm border-2 border-zinc-800 bg-zinc-900/40 p-2.5 shadow-[4px_4px_0_rgb(39,39,42)] sm:p-3">
                      <div className="mb-2 flex items-start justify-between gap-2 border-b border-zinc-800 pb-2 sm:mb-3 sm:gap-3 sm:pb-3">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-amber-400 sm:text-[10px]">Premium Plans Board</p>
                          <p className="mt-1 text-[11px] text-zinc-400 sm:text-xs">Same board, shorter access plans.</p>
                        </div>
                        <div className="rounded-sm border border-zinc-800 bg-zinc-950 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-zinc-400 sm:text-[10px]">
                          3 Plans
                        </div>
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                      {tiers.filter(t => {
                        if (t.id === 'free') return false; 
                        if (selectedTier) return selectedTier.id === t.id;
                        return t.id === '5day' || t.id === '10day' || t.id === '30day';
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
                            className={`w-full flex items-center gap-2 p-2.5 rounded-sm border-2 transition-all text-left sm:gap-3 sm:p-3 ${
                              isSelected 
                                ? 'border-amber-500 bg-amber-500/10 shadow-[3px_3px_0_rgba(245,158,11,0.2)]' 
                                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/70 shadow-[3px_3px_0_rgb(39,39,42)]'
                            }`}
                          >
                            <div className={`p-1.5 rounded-sm shrink-0 ${isSelected ? 'bg-amber-500 text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white text-[13px] sm:text-sm">{MOBILE_TIER_NAMES[tier.id] || tier.name}</span>
                                {tier.popular && (
                                  <span className="bg-amber-500 text-black text-[7px] font-black px-1 py-0.5 rounded-sm uppercase tracking-widest sm:text-[8px] sm:px-1.5">Popular</span>
                                )}
                              </div>
                              <div className="mt-0.5 hidden text-[10px] text-zinc-500 truncate sm:block">{tier.description}</div>
                            </div>
                            <div className="text-right shrink-0 pl-1">
                              {originalPrice ? (
                                <div className="text-[10px] text-zinc-500 line-through decoration-red-500/50">{tier.currency_symbol} {defaultOriginalPrice.toLocaleString()}</div>
                              ) : null}
                              <div className={`font-bold text-[13px] sm:text-sm ${isSelected ? 'text-amber-400' : 'text-white'}`}>{tier.currency_symbol} {dprice.toLocaleString()}</div>
                              <div className="text-[8px] text-zinc-500 font-bold uppercase sm:text-[9px]">{tier.durationDays} Days</div>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-amber-500 shrink-0" />}
                          </button>
                        );
                      })}
                      </div>
                      </div>
                    </div>

                    <div className="mb-2.5 sm:mb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest sm:text-[10px]">Pay With</h3>
                        {selectedMethod && <button onClick={() => setSelectedMethod(null)} className="text-[10px] text-gold-400 hover:text-gold-300 font-bold uppercase tracking-wider py-1 pl-4">Change</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                        {(!selectedMethod || selectedMethod === 'mpesa') && allowMpesa && (
                          <button onClick={() => setSelectedMethod('mpesa')} className={`relative w-full flex items-center justify-center p-2 rounded-lg border-2 transition-all sm:p-2.5 sm:rounded-xl ${selectedMethod === 'mpesa' ? 'border-blue-500 bg-blue-600/10 col-span-2' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/mpesa.svg" alt="M-Pesa" className="h-5 object-contain sm:h-6" />
                            {selectedMethod === 'mpesa' && <Check className="absolute right-2.5 w-3.5 h-3.5 text-blue-500 sm:right-3 sm:w-4 sm:h-4" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'paystack') && (
                          <button onClick={() => toast.info('Paystack integration is coming soon!')} className={`relative w-full flex items-center justify-center p-2 rounded-lg border-2 transition-all border-zinc-800 hover:border-zinc-700 opacity-50 cursor-not-allowed sm:p-2.5 sm:rounded-xl ${selectedMethod === 'paystack' ? 'col-span-2' : ''}`}>
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
                          <button onClick={() => setSelectedMethod('paypal')} className={`relative w-full flex items-center justify-center p-2 rounded-lg border-2 transition-all sm:p-2.5 sm:rounded-xl ${selectedMethod === 'paypal' ? 'border-blue-500 bg-blue-500/10 col-span-2' : 'border-zinc-800 hover:border-zinc-700'}`}>
                            <img src="/paypal.svg" alt="PayPal" className="h-4.5 object-contain sm:h-5" />
                            {selectedMethod === 'paypal' && <Check className="absolute right-2.5 w-3.5 h-3.5 text-blue-500 sm:right-3 sm:w-4 sm:h-4" />}
                          </button>
                        )}
                        {(!selectedMethod || selectedMethod === 'skrill') && (
                          <button onClick={() => toast.info('Skrill integration is coming soon!')} className={`relative w-full flex items-center justify-center p-2 rounded-lg border-2 transition-all border-zinc-800 hover:border-zinc-700 opacity-50 cursor-not-allowed sm:p-2.5 sm:rounded-xl ${selectedMethod === 'skrill' ? 'col-span-2' : ''}`}>
                            <img src="/skrill.svg" alt="Skrill" className="h-6 object-contain sm:h-7" />
                            <div className="absolute right-2 text-[8px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Soon</div>
                          </button>
                        )}
                      </div>
                    </div>

                    <AnimatePresence>
                      {selectedMethod === 'mpesa' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden sm:mb-4">
                          <div className="bg-amber-500/10 border-2 border-amber-500/30 rounded-sm p-3 text-center mb-3 text-zinc-300 shadow-[2px_2px_0_rgba(245,158,11,0.15)] sm:p-4 sm:mb-4">
                            <p className="text-[9px] uppercase tracking-widest font-black text-amber-500 mb-1.5 sm:text-[10px] sm:mb-2">Manual M-Pesa Payment</p>
                            <p className="text-[10px] mb-1.5 font-bold opacity-80 sm:text-[11px] sm:mb-2">Lipa na M-Pesa • Buy Goods and Services</p>
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1 mt-3 sm:text-[10px] sm:mt-4">Enter Till Number</p>
                            <p className="text-3xl font-black text-white tracking-[0.08em] mb-3 sm:text-4xl sm:tracking-[0.1em] sm:mb-4">806277</p>
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500 mb-1 opacity-70">Amount to Pay</p>
                            <p className="text-lg font-black text-amber-400 mb-4 sm:text-xl sm:mb-6">{selectedTier?.currency_symbol || 'KES'} {selectedTier?.price.toLocaleString()}</p>
                            <div className="bg-zinc-950/80 p-2.5 rounded-sm border border-zinc-800 sm:p-3">
                              <p className="text-[8px] text-zinc-400 uppercase font-black tracking-wider leading-relaxed sm:text-[9px]">Please complete your payment to the Till Number above. Your account will be upgraded.</p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <AnimatePresence>
                      {!user?.email && selectedMethod !== 'mpesa' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden sm:mb-4">
                          <label className="block text-[9px] font-bold text-zinc-500 uppercase mb-1 pl-1 sm:text-[10px] sm:mb-1.5">Email Address</label>
                          <div className="flex bg-zinc-900 border-2 border-zinc-800 rounded-sm overflow-hidden focus-within:border-amber-500 transition-colors shadow-[2px_2px_0_rgb(39,39,42)]">
                            <input
                              type="email"
                              value={guestEmail}
                              onChange={(e) => setGuestEmail(e.target.value)}
                              placeholder="you@example.com"
                              className="w-full bg-transparent px-3 py-2.5 text-white text-sm focus:outline-none placeholder:text-zinc-700 sm:py-3"
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {selectedMethod !== 'mpesa' && (
                      <>
                        <button
                          onClick={handleCheckout}
                          disabled={processing || !selectedTier || !selectedMethod || loadingGeo}
                          className="w-full bg-amber-500 text-black font-black py-2.5 rounded-sm border-2 border-amber-600 shadow-[4px_4px_0_rgb(217,119,6)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(217,119,6)] transition-all disabled:opacity-50 uppercase tracking-wider sm:py-3"
                        >
                          {processing ? 'Processing...' : `Get ${selectedTier?.name || 'Started'}`}
                        </button>
                        <p className="text-center text-[8px] text-zinc-500 mt-1.5 uppercase tracking-widest font-bold sm:text-[9px] sm:mt-2">Instant access granted after payment</p>
                      </>
                    )}
                  </motion.div>
                )}

                {paymentView === 'waiting' && (
                  <motion.div key="waiting" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col items-center justify-center py-10">
                    <div className="w-16 h-16 border-4 border-zinc-800 border-t-amber-500 rounded-full animate-spin mb-6" />
                    <h3 className="text-xl font-bold text-white mb-2 text-center">Verifying Payment...</h3>
                    <p className="text-zinc-400 text-center text-sm max-w-xs mb-8">
                      Verifying your payment with the provider. Please do not close this window.
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
                    <button onClick={onClose} className="w-full bg-amber-500 text-black font-black py-4 rounded-sm border-2 border-amber-600 shadow-[4px_4px_0_rgb(217,119,6)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(217,119,6)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider">Start Winning</button>
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
