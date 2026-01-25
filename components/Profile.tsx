
import React, { useEffect } from 'react';
import { User, UserRole } from '../types';
import { ChevronLeft, LogOut, ShieldCheck, Mail, Crown, Globe, AlertCircle } from 'lucide-react';
import { RoadmapBlock } from './RoadmapBlock';
import { useLanguage, LANGUAGES } from '../services/i18n';

interface ProfileProps {
  currentUser: User;
  onBack: () => void;
  onLogout: () => void;
  onMigrate?: (googleCredential: string) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export const Profile: React.FC<ProfileProps> = ({ currentUser, onBack, onLogout, onMigrate }) => {
  const isFounder = currentUser.role === UserRole.ADMIN;
  const isGuest = currentUser.role === UserRole.GUEST;
  const { t } = useLanguage();

  // Get Client ID from Environment Variables (Vite)
  const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";

  useEffect(() => {
    if (isGuest && GOOGLE_CLIENT_ID && window.google && onMigrate) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => {
              onMigrate(response.credential);
          },
          auto_select: false,
          theme: "filled_black"
        });
        
        const btnContainer = document.getElementById("googleMigrationDiv");
        if (btnContainer) {
            window.google.accounts.id.renderButton(
              btnContainer,
              { theme: "outline", size: "large", width: "100%", text: "continue_with" } // 'continue_with' implies merging/proceeding
            );
        }
      } catch (e) {
        console.error("Google Auth Init Error in Profile", e);
      }
    }
  }, [isGuest, GOOGLE_CLIENT_ID, onMigrate]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
        <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-4 shrink-0 z-20">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="text-zinc-400 hover:text-white p-1">
                    <ChevronLeft size={24} />
                </button>
                <h1 className="font-semibold text-zinc-100">{t('profile.title')}</h1>
            </div>
            <button onClick={onLogout} className="text-zinc-500 hover:text-red-400 flex items-center gap-2 text-sm px-3 py-1.5 rounded hover:bg-zinc-800 transition-colors bg-zinc-900 border border-zinc-800">
                <LogOut size={16} />
                <span>{t('logout')}</span>
            </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                
                {/* Profile Card */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl relative overflow-hidden">
                    <img 
                        src={currentUser.avatar} 
                        alt={currentUser.name} 
                        className="w-24 h-24 rounded-full border-4 border-zinc-800 shadow-lg"
                    />
                    <div className="flex-1 text-center md:text-left w-full">
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center justify-center md:justify-start gap-2">
                            {currentUser.name}
                            {isFounder && <Crown size={20} className="text-yellow-500" fill="currentColor" />}
                        </h2>
                        <div className="flex flex-col md:flex-row items-center md:justify-start gap-4 text-sm text-zinc-400 mb-4">
                            <span className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1 rounded-full border border-zinc-800">
                                <Mail size={14} /> {currentUser.id.includes('@') ? currentUser.id : 'No email'}
                            </span>
                            <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${isFounder ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/30' : 'bg-zinc-800 border-zinc-700'}`}>
                                <ShieldCheck size={14} /> {currentUser.role}
                            </span>
                        </div>
                        
                        {isFounder && (
                            <p className="text-sm text-green-400">
                                {t('profile.founder_msg')}
                            </p>
                        )}
                    </div>
                </div>

                {/* MIGRATION BLOCK FOR GUESTS */}
                {isGuest && (
                    <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-2xl p-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-50">
                            <AlertCircle size={64} className="text-orange-500/20" />
                        </div>
                        
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-white mb-2">{t('profile.migrate_title')}</h3>
                            <p className="text-zinc-400 mb-6 max-w-xl text-sm leading-relaxed">
                                {t('profile.migrate_desc')}
                            </p>
                            
                            <div className="max-w-xs">
                                {!GOOGLE_CLIENT_ID ? (
                                    <div className="text-red-400 text-xs">Google Client ID missing in config.</div>
                                ) : (
                                    <div id="googleMigrationDiv" className="h-[44px] w-full min-h-[44px]"></div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Roadmap Info for User */}
                <div>
                    <h3 className="text-lg font-bold text-white mb-4 px-2">{t('profile.tiers')}</h3>
                    <RoadmapBlock />
                </div>

            </div>
        </div>
    </div>
  );
};
