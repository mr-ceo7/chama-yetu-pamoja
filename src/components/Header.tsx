import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Bell, BellRing, Menu, Shield, X, Star, HelpCircle, MessageCircle } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useUser } from '../context/UserContext';

const navItems = [
  { to: '/', label: 'Tips Board', icon: Star },
  { to: '/faq', label: 'FAQ', icon: HelpCircle },
  { to: '/contact', label: 'Support', icon: MessageCircle },
];

export function Header() {
  const { user, setShowAuthModal } = useUser();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleNotifications = () => {
    if (!notificationsEnabled) {
      alert("Push notifications enabled! You'll receive alerts for new tips.");
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 sm:h-16 items-center justify-between px-4 max-w-7xl">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group transition-all duration-500 hover:scale-[1.02]">
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 shrink-0">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-md opacity-40 group-hover:opacity-100 group-hover:bg-blue-400/30 transition-all duration-700 animate-pulse" />
              <img 
                src="/cyp-logo.png" 
                alt="Chama Yetu Pamoja Logo" 
                className="relative w-10 h-10 sm:w-12 sm:h-12 object-contain z-10 drop-shadow-[0_0_5px_rgba(37,99,235,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all duration-500 rounded-full" 
              />
            </div>

            <div className="flex flex-col items-start justify-center">
              <span className="text-sm sm:text-base font-display font-black tracking-tight text-white leading-tight">
                CHAMA YETU
              </span>
              <span className="text-sm sm:text-base font-display font-black tracking-tight bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent leading-tight">
                PAMOJA
              </span>
              <span className="text-[6px] sm:text-[7px] text-zinc-500 font-bold uppercase tracking-[0.2em]">
                Win Together, Grow Together
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    isActive
                      ? 'text-blue-400 bg-blue-500/10'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleNotifications}
              className="relative p-2 text-zinc-400 hover:text-white transition-all rounded-full hover:bg-zinc-800 hover:scale-110 active:scale-95"
              title={notificationsEnabled ? 'Disable Notifications' : 'Enable Notifications'}
            >
              {notificationsEnabled ? <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" /> : <Bell className="w-4 h-4 sm:w-5 sm:h-5" />}
              {notificationsEnabled && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-zinc-950" />}
            </button>

            <button
              onClick={() => (user?.is_admin ? setIsProfileOpen(true) : setShowAuthModal(true))}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 px-3 py-2 text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:border-blue-500/40 hover:text-white hover:bg-zinc-800/60"
              title={user?.is_admin ? 'Admin Panel' : 'Admin Sign In'}
            >
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">{user?.is_admin ? 'Admin' : 'Admin Login'}</span>
            </button>



            {/* Mobile menu toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 text-zinc-400 hover:text-white transition-all rounded-full hover:bg-zinc-800"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-800 bg-zinc-950/95 backdrop-blur-lg">
            <nav className="container mx-auto px-4 py-3 flex flex-col gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'text-blue-400 bg-blue-500/10'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>
      <UserProfile isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
}
