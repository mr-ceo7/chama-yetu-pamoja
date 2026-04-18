import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn, Phone, Smartphone, ChevronDown, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

const COUNTRY_CODES = [
  { code: '+254', country: 'KE', flag: '🇰🇪', name: 'Kenya' },
  { code: '+255', country: 'TZ', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+256', country: 'UG', flag: '🇺🇬', name: 'Uganda' },
  { code: '+234', country: 'NG', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+233', country: 'GH', flag: '🇬🇭', name: 'Ghana' },
  { code: '+27', country: 'ZA', flag: '🇿🇦', name: 'South Africa' },
  { code: '+44', country: 'GB', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+1', country: 'US', flag: '🇺🇸', name: 'United States' },
  { code: '+971', country: 'AE', flag: '🇦🇪', name: 'UAE' },
  { code: '+91', country: 'IN', flag: '🇮🇳', name: 'India' },
];

type AuthTab = 'google' | 'phone';
type PhoneStep = 'input' | 'otp';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, googleLogin, requestPhoneOtp, phoneLogin } = useUser();
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<AuthTab>('google');
  
  // Phone state
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('input');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      const result = await googleLogin(credentialResponse.credential);
      if (result.success) {
        toast.success(`Google Auth Successful! 🎉`);
        handleClose();
      } else {
        setError(result.error || 'Google Authentication failed');
      }
    }
  };

  const handleClose = () => {
    setShowAuthModal(false);
    setError('');
    setPhoneNumber('');
    setOtpCode('');
    setPhoneStep('input');
    setShowCountryPicker(false);
  };

  const handleRequestOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 6) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    
    const fullPhone = `${countryCode.code}${phoneNumber.replace(/^0+/, '')}`;
    const result = await requestPhoneOtp(fullPhone);
    
    setLoading(false);
    if (result.success) {
      setPhoneStep('otp');
      toast.success('OTP code sent to your phone!');
    } else {
      setError(result.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }
    setError('');
    setLoading(true);
    
    const fullPhone = `${countryCode.code}${phoneNumber.replace(/^0+/, '')}`;
    const result = await phoneLogin(fullPhone, otpCode);
    
    setLoading(false);
    if (result.success) {
      toast.success('Login successful! 🎉');
      handleClose();
    } else {
      setError(result.error || 'Verification failed');
    }
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-zinc-950 border-2 border-zinc-800 rounded-sm shadow-[8px_8px_0_rgba(245,158,11,0.3)] z-50 overflow-hidden"
          >
            {/* Header — Brutalist amber stripe */}
            <div className="relative bg-amber-500 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black/20 rounded-sm flex items-center justify-center border-2 border-black/10">
                  <LogIn className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-black uppercase tracking-wide">
                    Join the Chama
                  </h2>
                  <p className="text-[11px] text-black/60 font-bold uppercase tracking-wider">
                    Sign in to access your picks
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-black/60 hover:text-black transition-all rounded-sm hover:bg-black/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher — Solid segmented control */}
            <div className="grid grid-cols-2 border-b-2 border-zinc-800">
              <button
                onClick={() => { setActiveTab('google'); setError(''); }}
                className={`py-3.5 text-xs font-black uppercase tracking-widest text-center transition-all border-b-[3px] ${
                  activeTab === 'google' ? 'text-amber-500 border-amber-500 bg-zinc-900/50' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                Google
              </button>
              <button
                onClick={() => { setActiveTab('phone'); setError(''); }}
                className={`py-3.5 text-xs font-black uppercase tracking-widest text-center transition-all flex items-center justify-center gap-1.5 border-b-[3px] ${
                  activeTab === 'phone' ? 'text-amber-500 border-amber-500 bg-zinc-900/50' : 'text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Phone
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === 'google' ? (
                <div className="flex flex-col items-center">
                  <div className="w-full flex justify-center mb-4">
                    <GoogleLogin 
                      onSuccess={handleGoogleSuccess}
                      onError={() => setError('Google Authentication Failed')}
                      theme="filled_black"
                      shape="rectangular"
                      size="large"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {phoneStep === 'input' ? (
                    <>
                      <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Phone Number</label>
                        <div className="flex gap-2">
                          {/* Country Code Picker */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowCountryPicker(!showCountryPicker)}
                              className="flex items-center gap-1.5 bg-zinc-900 border-2 border-zinc-800 rounded-sm px-3 py-3 text-sm font-medium text-white hover:border-zinc-700 transition-colors min-w-[100px] shadow-[2px_2px_0_rgb(39,39,42)]"
                            >
                              <span className="text-base">{countryCode.flag}</span>
                              <span>{countryCode.code}</span>
                              <ChevronDown className="w-3 h-3 text-zinc-400" />
                            </button>
                            
                            {showCountryPicker && (
                              <div className="absolute top-full mt-1 left-0 bg-zinc-900 border-2 border-zinc-800 rounded-sm shadow-[4px_4px_0_rgb(39,39,42)] z-10 w-64 max-h-48 overflow-y-auto">
                                {COUNTRY_CODES.map(cc => (
                                  <button
                                    key={cc.code}
                                    onClick={() => { setCountryCode(cc); setShowCountryPicker(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-zinc-800 transition-colors ${
                                      cc.code === countryCode.code ? 'bg-amber-500/10 text-amber-400' : 'text-zinc-300'
                                    }`}
                                  >
                                    <span className="text-base">{cc.flag}</span>
                                    <span className="flex-1 text-left">{cc.name}</span>
                                    <span className="text-zinc-500 text-xs">{cc.code}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Phone Input */}
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                            placeholder="712345678"
                            className="flex-1 bg-zinc-900 border-2 border-zinc-800 rounded-sm px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 transition-colors shadow-[2px_2px_0_rgb(39,39,42)]"
                            autoFocus
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleRequestOtp}
                        disabled={loading || !phoneNumber}
                        className="w-full bg-amber-500 text-black py-3 rounded-sm font-black text-sm uppercase tracking-wider border-2 border-amber-600 shadow-[4px_4px_0_rgb(217,119,6)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(217,119,6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send OTP Code <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="text-center mb-2">
                        <div className="w-14 h-14 mx-auto bg-amber-500/10 border-2 border-amber-500/30 rounded-sm flex items-center justify-center mb-3 shadow-[3px_3px_0_rgba(245,158,11,0.2)]">
                          <Phone className="w-7 h-7 text-amber-500" />
                        </div>
                        <p className="text-sm text-zinc-300">
                          Enter the 6-digit code sent to
                        </p>
                        <p className="text-sm font-black text-white mt-0.5">
                          {countryCode.flag} {countryCode.code} {phoneNumber}
                        </p>
                      </div>

                      <div>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={otpCode}
                          onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="000000"
                          className="w-full bg-zinc-900 border-2 border-zinc-800 rounded-sm px-4 py-4 text-center text-2xl font-mono font-black text-amber-500 tracking-[0.5em] placeholder-zinc-700 focus:outline-none focus:border-amber-500 transition-colors shadow-[3px_3px_0_rgb(39,39,42)]"
                          autoFocus
                        />
                      </div>

                      <button
                        onClick={handleVerifyOtp}
                        disabled={loading || otpCode.length !== 6}
                        className="w-full bg-amber-500 text-black py-3 rounded-sm font-black text-sm uppercase tracking-wider border-2 border-amber-600 shadow-[4px_4px_0_rgb(217,119,6)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(217,119,6)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          'Verify & Login'
                        )}
                      </button>

                      <div className="flex items-center justify-between">
                        <button
                          onClick={() => { setPhoneStep('input'); setOtpCode(''); setError(''); }}
                          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-bold"
                        >
                          ← Change number
                        </button>
                        <button
                          onClick={handleRequestOtp}
                          disabled={loading}
                          className="text-xs text-amber-500 hover:text-amber-400 font-black transition-colors uppercase tracking-wider"
                        >
                          Resend code
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {error && (
                <p className="w-full text-xs text-red-400 bg-red-500/10 border-2 border-red-500/20 rounded-sm px-3 py-2 text-center mt-3 font-bold">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 text-center border-t-2 border-zinc-900 pt-4">
              <button
                onClick={handleClose}
                className="text-xs text-zinc-600 font-black hover:text-zinc-400 transition-colors uppercase tracking-widest"
              >
                Continue as guest →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
