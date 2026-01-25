
import React from 'react';
import { Clapperboard, ChevronLeft } from 'lucide-react';
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
  const isLoggedIn = !!currentUser;

  // Determine Subtitle and Back Logic
  let subtitle = '';
  let isBackLink = false;

  switch (currentView) {
      case 'DASHBOARD':
          subtitle = t('nav.dashboard');
          break;
      case 'PROFILE':
          subtitle = t('profile.title'); // Or "PROFILE"
          isBackLink = true;
          break;
      case 'WORKFLOW':
          subtitle = t('nav.workflow');
          isBackLink = isLoggedIn; // Only back link if logged in, otherwise just a title
          break;
      case 'PRICING':
          subtitle = t('nav.pricing');
          isBackLink = isLoggedIn;
          break;
      case 'ABOUT':
          subtitle = t('nav.about');
          isBackLink = isLoggedIn;
          break;
      default:
          subtitle = currentView;
  }

  const handleLogoClick = () => {
      if (isBackLink) onBack();
  };

  const navItems = ['workflow', 'pricing', 'about'];

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4 overflow-hidden flex-1">
            
            {/* LOGO AREA */}
            <div 
                className={`flex items-center gap-3 select-none ${isBackLink ? 'cursor-pointer hover:opacity-80 group' : ''}`}
                onClick={handleLogoClick}
            >
                <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg shrink-0">
                    <Clapperboard size={18} className="text-white" />
                </div>
                
                <div className="flex flex-col justify-center h-8">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none mb-1">SmoTree</span>
                    
                    <span className={`text-sm font-bold uppercase tracking-wide leading-none flex items-center gap-0.5 ${isBackLink ? 'text-indigo-400 group-hover:text-white transition-colors' : 'text-zinc-100'}`}>
                        {isBackLink && <ChevronLeft size={12} className="-ml-1" />}
                        {subtitle}
                    </span>
                </div>
            </div>

            <div className="h-6 w-px bg-zinc-800 hidden lg:block"></div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
                {navItems.map(page => {
                   const pageKey = page.toUpperCase();
                   const isActive = currentView === pageKey;
                   return (
                       <button 
                         key={page}
                         onClick={() => onNavigate(pageKey)}
                         className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors uppercase tracking-wide
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
        <div className="flex items-center gap-2 md:gap-4">
             {/* Mobile Scroll Nav (Visible only on mobile) */}
             <div className="lg:hidden flex items-center gap-1 overflow-x-auto scrollbar-hide max-w-[150px]">
                {navItems.map(page => {
                   const pageKey = page.toUpperCase();
                   const isActive = currentView === pageKey;
                   return (
                       <button 
                         key={page}
                         onClick={() => onNavigate(pageKey)}
                         className={`whitespace-nowrap px-2.5 py-1.5 text-[10px] font-bold rounded-lg uppercase tracking-wide
                            ${isActive 
                                ? 'text-white bg-zinc-800' 
                                : 'text-zinc-400 hover:text-white'
                            }
                         `}
                       >
                           {t(`nav.${page}`)}
                       </button>
                   );
                })}
            </div>

            <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>
            
            {/* User Profile Chip (If Logged In) */}
            {currentUser && (
                <div 
                    onClick={() => onNavigate('PROFILE')}
                    className="hidden md:flex items-center gap-2 text-right cursor-pointer hover:bg-zinc-800 py-1 px-2 rounded-lg transition-colors group"
                >
                    <div>
                        <div className="text-xs font-bold text-white group-hover:text-indigo-400 transition-colors uppercase">{currentUser.name}</div>
                        <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{currentUser.role}</div>
                    </div>
                    <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-zinc-700 group-hover:border-indigo-500 transition-colors" alt="User" />
                </div>
            )}

            <LanguageSelector />
        </div>
    </header>
  );
};
