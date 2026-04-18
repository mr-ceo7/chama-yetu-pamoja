import React from 'react';
import { useUser } from '../context/UserContext';
import { X, User, Shield, Mail, Phone, Calendar, Crown, LogOut, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfile({ isOpen, onClose }: UserProfileProps) {
  const { user, logout, setShowPricingModal } = useUser();

  const handleLogout = () => {
    logout();
    onClose();
  };

  const hasSubscription = user?.subscription_tier && user.subscription_tier !== 'free';
  const subExpiry = user?.subscription_expiry ? new Date(user.subscription_expiry) : null;
  const isExpired = subExpiry ? subExpiry < new Date() : true;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[90vh] overflow-hidden bg-zinc-950 border-2 border-zinc-800 rounded-sm shadow-[8px_8px_0_rgba(245,158,11,0.3)] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b-2 border-zinc-800 bg-zinc-900/50">
              <div className="flex items-center gap-3">
                {user?.profile_picture ? (
                  <img src={user.profile_picture} alt={user.username} className="w-12 h-12 rounded-sm object-cover border-2 border-zinc-700 shadow-[3px_3px_0_rgb(39,39,42)]" />
                ) : (
                  <div className="w-12 h-12 rounded-sm bg-amber-500/20 border-2 border-amber-500/30 flex items-center justify-center text-amber-500 shadow-[3px_3px_0_rgba(245,158,11,0.2)]">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h2 className="text-base font-black text-white uppercase tracking-wide">{user?.username || 'Member'}</h2>
                  <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Chama Member</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white transition-all rounded-sm hover:bg-zinc-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Admin Link */}
              {user?.is_admin && (
                <Link 
                  to="/admin" 
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500/10 border-2 border-amber-500/20 text-amber-400 rounded-sm hover:bg-amber-500/20 transition-all text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_rgba(245,158,11,0.2)]"
                >
                  <Shield className="w-4 h-4" /> Admin Panel
                </Link>
              )}

              {/* Account Details */}
              <div>
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Account Details</h3>
                <div className="space-y-2">
                  {user?.email && (
                    <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-800 rounded-sm p-3 shadow-[2px_2px_0_rgb(39,39,42)]">
                      <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Email</p>
                        <p className="text-sm text-white font-bold truncate">{user.email}</p>
                      </div>
                    </div>
                  )}
                  {user?.phone && (
                    <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-800 rounded-sm p-3 shadow-[2px_2px_0_rgb(39,39,42)]">
                      <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Phone</p>
                        <p className="text-sm text-white font-bold">{user.phone}</p>
                      </div>
                    </div>
                  )}
                  {user?.created_at && (
                    <div className="flex items-center gap-3 bg-zinc-900 border-2 border-zinc-800 rounded-sm p-3 shadow-[2px_2px_0_rgb(39,39,42)]">
                      <Calendar className="w-4 h-4 text-zinc-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Joined</p>
                        <p className="text-sm text-white font-bold">{new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Subscription Status */}
              <div>
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">Subscription</h3>
                {hasSubscription && !isExpired ? (
                  <div className="bg-amber-500/5 border-2 border-amber-500/20 rounded-sm p-4 shadow-[3px_3px_0_rgba(245,158,11,0.15)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-5 h-5 text-amber-500" />
                      <span className="text-sm font-black text-amber-400 uppercase tracking-wider">{user?.subscription_tier} Plan</span>
                    </div>
                    {subExpiry && (
                      <p className="text-xs text-zinc-400">
                        Expires: <span className="text-white font-bold">{subExpiry.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-zinc-900 border-2 border-zinc-800 rounded-sm p-4 shadow-[2px_2px_0_rgb(39,39,42)]">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-zinc-600" />
                      <span className="text-sm font-black text-zinc-500 uppercase tracking-wider">Free Plan</span>
                    </div>
                    <p className="text-xs text-zinc-500 mb-3">Upgrade to unlock premium predictions.</p>
                    <button
                      onClick={() => { onClose(); setShowPricingModal(true); }}
                      className="w-full bg-amber-500 text-black py-2 rounded-sm font-black text-xs uppercase tracking-wider border-2 border-amber-600 shadow-[3px_3px_0_rgb(217,119,6)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_rgb(217,119,6)] transition-all"
                    >
                      Upgrade Now
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer — Logout */}
            <div className="p-5 border-t-2 border-zinc-800">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-900 border-2 border-zinc-800 rounded-sm text-red-400 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/5 transition-all text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_rgb(39,39,42)] hover:shadow-[3px_3px_0_rgba(239,68,68,0.2)]"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
