
import React, { useState } from 'react';
import { Clapperboard, Menu, X } from 'lucide-react';
import { useLanguage } from '../services/i18n';
import { LanguageSelector } from './LanguageSelector';
import { User } from '../types';

interface AppHeaderProps {
  currentUser: User | null;
  currentView: string;
  onNavigate: (page: string) => void;
  onBack: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ currentUser, currentView, onNavigate, onBack }) => {
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogoClick = () => {
      // If user is null, back to Dashboard means back to Login/Landing
      if (!currentUser) {
          onBack(); 
      } else {
          onNavigate('DASHBOARD');
      }
  };

  const navItems = ['workflow', 'pricing', 'about'];

  return (
    <>
        <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md flex items-center justify-between px-4 sticky top-0 z-30 transition-all">
            <div className="flex items-center gap-6 overflow-hidden flex-1">
                
                {/* LOGO AREA - Clean Single Brand */}
                <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity group"
                    onClick={handleLogoClick}
                >
                    <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg shrink-0 shadow-lg shadow-indigo-900/20 group-hover:scale-105 transition-transform">
                        <Clapperboard size={18} className="text-white" />
                    </div>
                    <span className="text-lg font-bold text-zinc-100 tracking-tight">SmoTree</span>
                </div>

                <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-2">
                    {navItems.map(page => {
                    const pageKey = page.toUpperCase();
                    const isActive = currentView === pageKey;
                    return (
                        <button 
                            key={page}
                            onClick={() => onNavigate(pageKey)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all
                                ${isActive 
                                    ? 'text-white bg-zinc-800' 
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                                }
                            `}
                        >
                            {t(`nav.${page}`)}
                        </button>
                    );
                })}
                </div>
            </div>
            
            {/* Right Side */}
            <div className="flex items-center gap-3 md:gap-5">
                {/* User Profile Chip (If Logged In) */}
                {currentUser && (
                    <div 
                        onClick={() => onNavigate('PROFILE')}
                        className="hidden md:flex items-center gap-3 cursor-pointer hover:bg-zinc-800 py-1.5 px-2 rounded-lg transition-colors group"
                    >
                        <div className="text-right">
                            <div className="text-xs font-semibold text-white group-hover:text-indigo-400 transition-colors">{currentUser.name}</div>
                            <div className="text-[10px] text-zinc-500">{currentUser.role}</div>
                        </div>
                        <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-zinc-700 group-hover:border-indigo-500 transition-colors object-cover" alt="User" />
                    </div>
                )}

                {/* Login Button (If Logged Out) */}
                {!currentUser && (
                    <button 
                        onClick={() => onBack()} // Back to Dashboard (Login)
                        className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg transition-colors hidden md:block"
                    >
                        {t('nav.login')}
                    </button>
                )}

                <LanguageSelector />

                {/* Mobile Menu Toggle */}
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden text-zinc-400 hover:text-white p-1"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>
        </header>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
            <div className="md:hidden fixed top-16 left-0 right-0 bg-zinc-900 border-b border-zinc-800 z-40 p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2">
                {navItems.map(page => {
                    const pageKey = page.toUpperCase();
                    const isActive = currentView === pageKey;
                    return (
                        <button 
                            key={page}
                            onClick={() => {
                                setIsMobileMenuOpen(false);
                                onNavigate(pageKey);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors
                                ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'}
                            `}
                        >
                            {t(`nav.${page}`)}
                        </button>
                    );
                })}
                
                <div className="h-px bg-zinc-800 my-1"></div>
                
                {currentUser ? (
                    <button 
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            onNavigate('PROFILE');
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold text-white bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center gap-2"
                    >
                        <img src={currentUser.avatar} className="w-6 h-6 rounded-full" alt="User" />
                        {currentUser.name}
                    </button>
                ) : (
                    <button 
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            onBack();
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                    >
                        {t('nav.login')}
                    </button>
                )}
            </div>
        )}
    </>
  );
};
