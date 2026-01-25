
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Clapperboard, ArrowRight, UserPlus, ShieldCheck, Mail, AlertCircle, Globe } from 'lucide-react';
import { generateId } from '../services/utils';
import { RoadmapBlock } from './RoadmapBlock';
import { useLanguage, LANGUAGES } from '../services/i18n';
import { LanguageSelector } from './LanguageSelector';

interface LoginProps {
  onLogin: (user: User) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const { t, language } = useLanguage();

  // Get Client ID from Environment Variables (Vite)
  const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
  
  const isInvite = !!inviteProjectId;
  const isGoogleConfigured = !!GOOGLE_CLIENT_ID;
  const showManualLogin = isInvite || !isGoogleConfigured;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    if (pId) {
        setInviteProjectId(pId);
    }

    if (!GOOGLE_CLIENT_ID) {
        console.warn("Google Client ID is missing.");
    }

    if (GOOGLE_CLIENT_ID && window.google) {
      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
          theme: "filled_black"
        });
        
        const btnContainer = document.getElementById("googleSignInDiv");
        if (btnContainer) {
            window.google.accounts.id.renderButton(
              btnContainer,
              { theme: "outline", size: "large", width: "100%", text: inviteProjectId ? "continue_with" : "signin_with" }
            );
        }
      } catch (e) {
        console.error("Google Auth Init Error", e);
      }
    }
  }, [inviteProjectId, GOOGLE_CLIENT_ID, language]); // Re-render Google button on lang change if needed

  const handleGoogleCallback = (response: any) => {
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        localStorage.setItem('smotree_auth_token', response.credential);
        const role = UserRole.ADMIN; 
        const googleUser: User = {
            id: payload.email, 
            name: payload.name,
            avatar: payload.picture,
            role: role
        };
        onLogin(googleUser);
    } catch (e) {
        console.error(e);
        setGoogleError("Failed to process Google Login.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    localStorage.removeItem('smotree_auth_token');
    const role = inviteProjectId ? UserRole.GUEST : UserRole.ADMIN;
    const newUser: User = {
      id: `${role.toLowerCase()}-${generateId()}`,
      name: name,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
      role: role 
    };
    onLogin(newUser);
  };

  // --- LOGIN CARD COMPONENT ---
  const LoginCard = () => (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden w-full max-w-sm mx-auto">
        <div className={`absolute top-0 left-0 right-0 h-1 ${inviteProjectId ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>
        <div className="mb-6">
            {inviteProjectId ? (
                <div className="flex items-start gap-3">
                    <div className="bg-orange-500/10 p-2 rounded-lg text-orange-400 shrink-0"><UserPlus size={20} /></div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">{t('auth.card.join')}</h2>
                        <p className="text-xs text-zinc-400 mt-1">{t('auth.card.desc_join')}</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-3">
                    <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 shrink-0"><ShieldCheck size={20} /></div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">{t('auth.card.login')}</h2>
                        <p className="text-xs text-zinc-400 mt-1">{t('auth.card.desc_login')}</p>
                    </div>
                </div>
            )}
        </div>

        <div className="space-y-4">
            {!isGoogleConfigured ? (
                <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-500 text-xs flex items-center gap-2">
                    <AlertCircle size={16} /><span>Google Client ID missing</span>
                </div>
            ) : (
                <div id="googleSignInDiv" className="h-[44px] w-full min-h-[44px]"></div>
            )}
            
            {showManualLogin && (
                <>
                    <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">{t('auth.manual')}</span></div>
                    </div>
                    <form onSubmit={handleManualSubmit} className="space-y-3">
                        <div className="relative">
                            <Mail size={16} className="absolute top-3.5 left-3 text-zinc-600" />
                            <input type="text" placeholder={isInvite ? t('auth.placeholder.guest') : t('auth.placeholder.admin')} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600" />
                        </div>
                        <button type="submit" disabled={!name.trim()} className={`w-full p-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700 hover:bg-zinc-800 text-zinc-300`}>
                            {isInvite ? t('auth.btn.join') : t('auth.btn.login')} <ArrowRight size={14} />
                        </button>
                    </form>
                </>
            )}
        </div>
        {googleError && <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs text-center">{googleError}</div>}
    </div>
  );

  return (
    // FIX SCROLL: Using h-screen overflow-y-auto enables internal scrolling even if body is hidden
    <div className="h-screen w-full overflow-y-auto bg-black text-white selection:bg-green-500/30">
      
      {/* Navbar Placeholder */}
      <nav className="border-b border-zinc-900 p-4 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
             <div className="bg-indigo-600 p-1.5 rounded-lg"><Clapperboard size={20} /></div>
             <span className="font-bold text-lg tracking-tight">{t('app.name')}</span>
          </div>
          <div className="flex items-center gap-4">
            
            <LanguageSelector />

            {!inviteProjectId && (
                <button 
                    onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    {t('nav.login')}
                </button>
            )}
          </div>
      </nav>

      {/* HERO SECTION */}
      <div className="relative py-20 px-4 md:py-32">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none"></div>
          <div className="absolute top-20 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none"></div>

          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              {/* Text Content */}
              <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                  <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter">
                      {t('hero.title.1')} <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">{t('hero.title.2')}</span>
                  </h1>
                  
                  <div className="space-y-6 text-lg text-zinc-400 max-w-xl leading-relaxed">
                      <p>{t('hero.desc')}</p>
                      <p className="text-sm border-l-2 border-green-500 pl-4 italic">
                          {t('hero.quote')}
                      </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button 
                        onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-2"
                      >
                          {t('hero.cta')} <ArrowRight size={20} />
                      </button>
                  </div>
              </div>

              {/* Login Card (Floating) */}
              <div id="auth-section" className="relative z-10 animate-in fade-in zoom-in-95 duration-1000 delay-200">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-30"></div>
                  <LoginCard />
                  <div className="text-center mt-4 md:hidden flex justify-center gap-2">
                       {/* Mobile Lang Selector fallback or removed as it's in header now */}
                  </div>
              </div>
          </div>
      </div>

      {/* ROADMAP SECTION */}
      <div className="py-20 px-4 border-t border-zinc-900 bg-zinc-950/50">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">{t('roadmap.title')}</h2>
              <p className="text-zinc-400">{t('roadmap.subtitle')}</p>
          </div>
          <RoadmapBlock />
      </div>

      <footer className="py-12 border-t border-zinc-900 text-center text-zinc-600 text-sm">
          <p>© {new Date().getFullYear()} {t('app.name')} Video Collaboration. {t('footer.rights')}</p>
      </footer>

    </div>
  );
};
