import React, { useEffect, useState } from 'react';
import { ShieldAlert, LogIn } from 'lucide-react';
import { useUser } from '../context/UserContext';

export function DeviceConflictModal() {
  const [isOpen, setIsOpen] = useState(false);
  const { logout, setShowAuthModal } = useUser();

  useEffect(() => {
    const handleConflict = () => {
      logout(); // clear state locally
      setIsOpen(true);
    };

    window.addEventListener('auth:conflict', handleConflict);
    return () => window.removeEventListener('auth:conflict', handleConflict);
  }, [logout]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-3xl p-4">
      <div className="bg-zinc-950 border-2 border-red-500/30 rounded-sm p-6 sm:p-8 max-w-md w-full relative shadow-[8px_8px_0_rgba(239,68,68,0.3)] overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/20 rounded-full blur-3xl opacity-50"></div>
        
        <div className="relative z-10 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-sm flex items-center justify-center mx-auto mb-5 border-2 border-red-500/20 shadow-[4px_4px_0_rgba(239,68,68,0.2)]">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          
          <h2 className="text-xl sm:text-2xl font-black text-white mb-2 tracking-wide uppercase">Session Halted</h2>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            Your active session has expired. This can happen when your account is accessed from too many devices or when your session becomes inactive. Please log in again to continue.
          </p>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                setIsOpen(false);
                setShowAuthModal(true); // Open the normal Google Auth modal
              }}
              className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black py-3 px-4 rounded-sm border-2 border-red-600 shadow-[4px_4px_0_rgb(153,27,27)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_rgb(153,27,27)] transition-all uppercase tracking-wider"
            >
              <LogIn className="w-4 h-4" />
              Reclaim This Device
            </button>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              Doing this will log the other device out immediately.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
