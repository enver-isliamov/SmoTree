
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Clapperboard, ArrowRight, UserPlus, ShieldCheck, Mail, AlertCircle, Timer, History, Lock, Menu, X } from 'lucide-react';
import { generateId } from '../services/utils';
import { RoadmapBlock } from './RoadmapBlock';
import { useLanguage } from '../services/i18n';
import { LanguageSelector } from './LanguageSelector';

interface LoginProps {
  onLogin: (user: User) => void;
  onNavigate: (page: string) => void;
}

declare global {
  interface Window {
    google: any;
  }
}

// --- EXTRACTED COMPONENT TO FIX RE-RENDER FOCUS ISSUE ---
interface LoginCardProps {
    inviteProjectId: string | null;
    isGoogleConfigured: boolean;
    showManualLogin: boolean;
    name: string;
    setName: (name: string) => void;
    handleManualSubmit: (e: React.FormEvent) => void;
    googleError: string | null;
}

const LoginCard: React.FC<LoginCardProps> = ({ 
    inviteProjectId, isGoogleConfigured, showManualLogin, name, setName, handleManualSubmit, googleError 
}) => {
    const { t } = useLanguage();

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden w-full max-w-sm mx-auto animate-in zoom-in-95 duration-300">
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
                                <input 
                                    type="text" 
                                    placeholder={inviteProjectId ? t('auth.placeholder.guest') : t('auth.placeholder.admin')} 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600" 
                                />
                            </div>
                            <button type="submit" disabled={!name.trim()} className={`w-full p-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700 hover:bg-zinc-800 text-zinc-300`}>
                                {inviteProjectId ? t('auth.btn.join') : t('auth.btn.login')} <ArrowRight size={14} />
                            </button>
                        </form>
                    </>
                )}
            </div>
            {googleError && <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs text-center">{googleError}</div>}
        </div>
    );
};

export const Login: React.FC<LoginProps> = ({ onLogin, onNavigate }) => {
  const [name, setName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, language } = useLanguage();

  // Get Client ID from Environment Variables (Vite)
  const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
  
  const isGoogleConfigured = !!GOOGLE_CLIENT_ID;
  const showManualLogin = !!inviteProjectId || !isGoogleConfigured;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    if (pId) {
        setInviteProjectId(pId);
    }

    if (!GOOGLE_CLIENT_ID) {
        console.warn("Google Client ID is missing.");
    }

    // Google Auth Init
    if (GOOGLE_CLIENT_ID && window.google) {
      // Small delay to ensure DOM element exists if rendering conditionally
      setTimeout(() => {
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
                  { theme: "outline", size: "large", width: "100%", text: pId ? "continue_with" : "signin_with" }
                );
            }
          } catch (e) {
            console.error("Google Auth Init Error", e);
          }
      }, 100);
    }
  }, [inviteProjectId, GOOGLE_CLIENT_ID, language]);

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

  return (
    <div className="h-screen w-full overflow-y-auto bg-black text-white selection:bg-green-500/30">
      
      {/* Navbar */}
      <nav className={`h-16 border-b border-zinc-900 px-4 flex justify-between items-center z-50 transition-all ${inviteProjectId ? 'bg-transparent border-transparent absolute w-full top-0' : 'bg-black/50 backdrop-blur-md sticky top-0'}`}>
          <div className="flex items-center gap-2">
             <div className="bg-indigo-600 p-1.5 rounded-lg"><Clapperboard size={20} /></div>
             <span className="font-bold text-lg tracking-tight">{t('app.name')}</span>
             
             {/* Desktop Nav Links */}
             {!inviteProjectId && (
                 <div className="hidden md:flex items-center gap-1 ml-4">
                     {['workflow', 'pricing', 'about'].map(page => (
                       <button 
                         key={page}
                         onClick={() => onNavigate(page.toUpperCase())}
                         className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
                       >
                           {t(`nav.${page}`)}
                       </button>
                     ))}
                 </div>
             )}
          </div>
          
          <div className="flex items-center gap-4">
            <LanguageSelector />
            
            {/* Desktop Login Link */}
            {!inviteProjectId && (
                <button 
                    onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="hidden md:block text-sm text-zinc-400 hover:text-white transition-colors"
                >
                    {t('nav.login')}
                </button>
            )}

            {/* Mobile Menu Toggle */}
            {!inviteProjectId && (
                <button 
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="md:hidden text-zinc-400 hover:text-white p-1"
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            )}
          </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && !inviteProjectId && (
          <div className="md:hidden fixed top-16 left-0 right-0 bg-zinc-900 border-b border-zinc-800 z-40 p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2">
                {['workflow', 'pricing', 'about'].map(page => (
                    <button 
                        key={page}
                        onClick={() => {
                            setIsMobileMenuOpen(false);
                            onNavigate(page.toUpperCase());
                        }}
                        className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                        {t(`nav.${page}`)}
                    </button>
                ))}
                <div className="h-px bg-zinc-800 my-1"></div>
                <button 
                    onClick={() => {
                        setIsMobileMenuOpen(false);
                        document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
                >
                    {t('nav.login')}
                </button>
          </div>
      )}

      {inviteProjectId ? (
          // --- INVITE MODE LAYOUT (FOCUSED) ---
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black pointer-events-none"></div>
              
              <div className="relative z-10 w-full max-w-sm">
                  <div className="text-center mb-8">
                      <h1 className="text-2xl font-bold text-white mb-2">{t('hero.title.1')} {t('app.name')}</h1>
                      <p className="text-zinc-400 text-sm">You have been invited to collaborate.</p>
                  </div>
                  <LoginCard 
                      inviteProjectId={inviteProjectId}
                      isGoogleConfigured={isGoogleConfigured}
                      showManualLogin={showManualLogin}
                      name={name}
                      setName={setName}
                      handleManualSubmit={handleManualSubmit}
                      googleError={googleError}
                  />
              </div>
          </div>
      ) : (
          // --- STANDARD LANDING LAYOUT ---
          <>
            <div className="relative py-20 px-4 md:py-32">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-indigo-900/20 to-transparent pointer-events-none"></div>
                <div className="absolute top-20 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[128px] pointer-events-none"></div>

                <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    
                    {/* Text Content */}
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                        <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter">
                            {t('hero.title.speed')}
                        </h1>
                        
                        <div className="space-y-6 text-lg text-zinc-400 max-w-xl leading-relaxed">
                            <p>{t('hero.desc_new')}</p>
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
                        <LoginCard 
                            inviteProjectId={inviteProjectId}
                            isGoogleConfigured={isGoogleConfigured}
                            showManualLogin={showManualLogin}
                            name={name}
                            setName={setName}
                            handleManualSubmit={handleManualSubmit}
                            googleError={googleError}
                        />
                    </div>
                </div>
            </div>

            {/* WHY SMOTREE SECTION */}
            <div className="py-20 bg-zinc-900/30 border-y border-zinc-900">
                <div className="max-w-5xl mx-auto px-4">
                    <h2 className="text-3xl font-bold text-white text-center mb-12">{t('why.title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center hover:border-indigo-500/30 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-xl mb-4 text-yellow-500 group-hover:scale-110 transition-transform shadow-lg shadow-yellow-500/10">
                                <Timer size={24} />
                            </div>
                            <h3 className="font-bold text-white mb-3 text-lg">{t('why.feat1.title')}</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">{t('why.feat1.desc')}</p>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center hover:border-indigo-500/30 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-xl mb-4 text-blue-500 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
                                <History size={24} />
                            </div>
                            <h3 className="font-bold text-white mb-3 text-lg">{t('why.feat2.title')}</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">{t('why.feat2.desc')}</p>
                        </div>
                        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl flex flex-col items-center text-center hover:border-indigo-500/30 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-xl mb-4 text-green-500 group-hover:scale-110 transition-transform shadow-lg shadow-green-500/10">
                                <Lock size={24} />
                            </div>
                            <h3 className="font-bold text-white mb-3 text-lg">{t('why.feat3.title')}</h3>
                            <p className="text-sm text-zinc-400 leading-relaxed">{t('why.feat3.desc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROADMAP SECTION */}
            <div className="py-20 px-4 bg-zinc-950/50">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4">{t('roadmap.title')}</h2>
                    <p className="text-zinc-400">{t('roadmap.subtitle')}</p>
                </div>
                <RoadmapBlock />
            </div>

            <footer className="py-12 border-t border-zinc-900 text-center text-zinc-600 text-sm">
                <p>© {new Date().getFullYear()} {t('app.name')} Video Collaboration. {t('footer.rights')}</p>
            </footer>
          </>
      )}
    </div>
  );
};
