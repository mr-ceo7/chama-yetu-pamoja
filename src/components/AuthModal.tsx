import React, { useState } from 'react';
import { useUser } from '../context/UserContext';
import { motion, AnimatePresence } from 'motion/react';
import { X, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, googleLogin } = useUser();
  const [error, setError] = useState('');

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) return;

    const result = await googleLogin(credentialResponse.credential);
    if (result.success) {
      toast.success('Admin sign-in successful');
      handleClose();
    } else {
      setError(result.error || 'Google Authentication failed');
    }
  };

  const handleClose = () => {
    setShowAuthModal(false);
    setError('');
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
            <div className="relative bg-amber-500 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black/20 rounded-sm flex items-center justify-center border-2 border-black/10">
                  <LogIn className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-black uppercase tracking-wide">
                    Admin Sign In
                  </h2>
                  <p className="text-[11px] text-black/60 font-bold uppercase tracking-wider">
                    Authorized administrators only
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

            <div className="p-6">
              <div className="mb-4 text-center">
                <p className="text-sm text-zinc-300">
                  Use the approved Google account to access the Chama admin console.
                </p>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Authentication Failed')}
                  theme="filled_black"
                  shape="rectangular"
                  size="large"
                />
              </div>

              {error && (
                <div className="mt-4 border-2 border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 rounded-sm">
                  {error}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
