
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { ArrowRight, UserPlus, ShieldCheck, Mail, AlertCircle, Timer, History, Lock, Sparkles, Play, PlayCircle } from 'lucide-react';
import { generateId } from '../services/utils';
import { RoadmapBlock } from './RoadmapBlock';
import { useLanguage } from '../services/i18n';
import { AppHeader } from './AppHeader';

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
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200/50 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden w-full max-w-sm mx-auto animate-in zoom-in-95 duration-300 transition-colors">
            <div className={`absolute top-0 left-0 right-0 h-1 ${inviteProjectId ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>
            <div className="mb-6">
                {inviteProjectId ? (
                    <div className="flex items-start gap-3">
                        <div className="bg-orange-50 dark:bg-orange-500/10 p-2 rounded-lg text-orange-600 dark:text-orange-400 shrink-0"><UserPlus size={20} /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('auth.card.join')}</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('auth.card.desc_join')}</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-start gap-3">
                        <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg text-indigo-600 dark:text-indigo-400 shrink-0"><ShieldCheck size={20} /></div>
                        <div>
                            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{t('auth.card.login')}</h2>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('auth.card.desc_login')}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {!isGoogleConfigured ? (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg text-yellow-700 dark:text-yellow-500 text-xs flex items-center gap-2">
                        <AlertCircle size={16} /><span>Google Client ID missing</span>
                    </div>
                ) : (
                    <div id="googleSignInDiv" className="h-[44px] w-full min-h-[44px]"></div>
                )}
                
                {showManualLogin && (
                    <>
                        <div className="relative py-2">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 dark:text-zinc-500">{t('auth.manual')}</span></div>
                        </div>
                        <form onSubmit={handleManualSubmit} className="space-y-3">
                            <div className="relative">
                                <Mail size={16} className="absolute top-3.5 left-3 text-zinc-400 dark:text-zinc-500" />
                                <input 
                                    type="text" 
                                    placeholder={inviteProjectId ? t('auth.placeholder.guest') : t('auth.placeholder.admin')} 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white focus:border-indigo-500 focus:bg-white dark:focus:bg-zinc-900 outline-none transition-all placeholder:text-zinc-400 dark:placeholder:text-zinc-600" 
                                />
                            </div>
                            <button type="submit" disabled={!name.trim()} className={`w-full p-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white`}>
                                {inviteProjectId ? t('auth.btn.join') : t('auth.btn.login')} <ArrowRight size={14} />
                            </button>
                        </form>
                    </>
                )}
            </div>
            {googleError && <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-lg text-red-600 dark:text-red-400 text-xs text-center">{googleError}</div>}
        </div>
    );
};

export const Login: React.FC<LoginProps> = ({ onLogin, onNavigate }) => {
  const [name, setName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const { t, language } = useLanguage();

  const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || "";
  
  const isGoogleConfigured = !!GOOGLE_CLIENT_ID;
  const showManualLogin = !!inviteProjectId || !isGoogleConfigured;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    if (pId) {
        setInviteProjectId(pId);
    }

    if (GOOGLE_CLIENT_ID && window.google) {
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
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-black text-zinc-900 dark:text-white selection:bg-indigo-500/30 transition-colors duration-500">
      
      {/* Unified Header */}
      <AppHeader 
        currentUser={null}
        currentView="LANDING"
        onNavigate={onNavigate}
        onBack={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        onLoginClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
        hideNav={!!inviteProjectId}
        className={inviteProjectId ? 'bg-transparent border-transparent absolute w-full top-0' : undefined}
      />

      {inviteProjectId ? (
          // --- INVITE MODE LAYOUT (FOCUSED) ---
          <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center p-4 relative">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-100 via-white to-white dark:from-indigo-900/20 dark:via-black dark:to-black pointer-events-none"></div>
              
              <div className="relative z-10 w-full max-w-sm">
                  <div className="text-center mb-8">
                      <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">{t('hero.title.1')} {t('app.name')}</h1>
                      <p className="text-zinc-500 dark:text-zinc-400 text-sm">You have been invited to collaborate.</p>
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
            <div className="relative py-20 px-4 md:py-32 overflow-hidden">
                {/* Background Gradients */}
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-300/20 dark:bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-normal"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply dark:mix-blend-normal"></div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                    
                    {/* Text Content (Wider) */}
                    <div className="lg:col-span-7 space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold tracking-widest text-zinc-600 dark:text-zinc-400 shadow-sm">
                            <Sparkles size={12} className="text-indigo-600 dark:text-indigo-400" />
                            <span>SmoTree v1.0</span>
                        </div>

                        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                            <span className="block text-zinc-900 dark:text-white mb-2">
                                {t('hero.title.speed').split('.')[0]}.
                            </span>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 dark:from-indigo-400 dark:via-purple-400 dark:to-indigo-400 animate-gradient-x">
                                {t('hero.title.speed').split('.')[1]}
                            </span>
                        </h1>
                        
                        <div className="space-y-6 text-xl md:text-2xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed font-light">
                            <p>{t('hero.desc_new')}</p>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-4 items-start">
                             <button 
                                onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/10 dark:shadow-none"
                            >
                                {t('hero.cta')} <ArrowRight size={20} />
                            </button>
                            <button 
                                onClick={() => onNavigate('LIVE_DEMO')}
                                className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 px-8 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl group"
                            >
                                <PlayCircle size={20} className="text-red-500 group-hover:scale-110 transition-transform" />
                                {t('hero.demo')}
                            </button>
                        </div>
                        <div className="text-sm text-zinc-500 max-w-xs mt-2 italic border-l-2 border-zinc-300 dark:border-zinc-800 pl-4">
                            {t('hero.quote')}
                        </div>
                    </div>

                    {/* Login Card (Narrower, Floating) */}
                    <div id="auth-section" className="lg:col-span-5 relative z-10 animate-in fade-in zoom-in-95 duration-1000 delay-200 flex justify-center lg:justify-end">
                         {/* Card Glow */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 blur-2xl rounded-full transform scale-90"></div>
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

            {/* BLOCK 1: SPEED GRAPH & STATS */}
            <div className="py-24 bg-white dark:bg-black border-y border-zinc-100 dark:border-zinc-900 transition-colors">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">{t('land.speed.title')}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">{t('land.speed.sub')}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        {/* Graph Card */}
                        <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 md:p-10 relative overflow-hidden h-[300px] md:h-[400px]">
                            {/* Simple CSS Line Chart Visual */}
                            <div className="absolute bottom-10 left-10 right-10 top-20">
                                {/* Grid Lines */}
                                <div className="border-b border-zinc-300/20 dark:border-white/10 h-1/4 w-full absolute top-0"></div>
                                <div className="border-b border-zinc-300/20 dark:border-white/10 h-1/4 w-full absolute top-1/4"></div>
                                <div className="border-b border-zinc-300/20 dark:border-white/10 h-1/4 w-full absolute top-2/4"></div>
                                <div className="border-b border-zinc-300/20 dark:border-white/10 h-1/4 w-full absolute top-3/4"></div>
                                
                                {/* Curve line SVG */}
                                <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                                    <path d="M0,0 Q150,250 500,280" stroke="#6366f1" strokeWidth="4" fill="none" className="drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                                    {/* Points */}
                                    <circle cx="0" cy="0" r="4" fill="#818cf8" />
                                    <circle cx="120" cy="140" r="4" fill="#818cf8" />
                                    <circle cx="250" cy="220" r="4" fill="#818cf8" />
                                    <circle cx="380" cy="260" r="4" fill="#818cf8" />
                                    <circle cx="500" cy="280" r="4" fill="#818cf8" />
                                </svg>

                                {/* Labels X */}
                                <div className="absolute -bottom-6 flex justify-between w-full text-xs text-zinc-500 font-mono">
                                    <span>v1</span>
                                    <span>v2</span>
                                    <span>v3</span>
                                    <span>v4</span>
                                    <span>v5</span>
                                    <span>v6</span>
                                </div>
                                {/* Label Y */}
                                <div className="absolute -left-6 top-0 bottom-0 flex flex-col justify-between text-xs text-zinc-500 font-mono h-full">
                                    <span>50</span>
                                    <span>40</span>
                                    <span>30</span>
                                    <span>20</span>
                                    <span>10</span>
                                    <span>0</span>
                                </div>
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="space-y-12">
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="text-6xl font-bold text-indigo-600 dark:text-indigo-500">92%</span>
                                    <span className="text-xl font-bold text-zinc-900 dark:text-white">{t('land.stat.92')}</span>
                                </div>
                                <p className="text-zinc-600 dark:text-zinc-500 italic max-w-sm pl-2 border-l-2 border-zinc-300 dark:border-zinc-700">
                                    {t('land.stat.92.desc')}
                                </p>
                            </div>
                            <div>
                                <div className="flex items-center gap-4 mb-2">
                                    <span className="text-6xl font-bold text-orange-500">0</span>
                                    <span className="text-xl font-bold text-zinc-900 dark:text-white">{t('land.stat.0')}</span>
                                </div>
                                <p className="text-zinc-600 dark:text-zinc-500 text-sm max-w-sm">
                                    {t('land.stat.0.desc')}
                                </p>
                            </div>

                            <button 
                                onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                                className="bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 px-8 py-4 rounded-full font-bold text-lg transition-colors shadow-xl shadow-indigo-500/10"
                            >
                                {t('land.try_now')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* BLOCK 2: WORKFLOW PLAYER MOCKUP */}
            <div className="py-24 bg-zinc-50 dark:bg-zinc-950 transition-colors">
                 <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-3xl text-zinc-700 dark:text-zinc-300 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
                        {t('land.flow.title')}
                        <span className="block text-zinc-500 text-lg mt-2">{t('land.flow.sub')}</span>
                    </h2>

                    {/* Mockup Container */}
                    <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl p-2 shadow-2xl overflow-hidden aspect-video group mx-auto">
                        {/* Fake Header */}
                        <div className="absolute top-6 left-6 right-6 flex justify-between items-center text-[10px] font-mono text-zinc-500 z-10">
                            <div>PROJECT: BRAND_STORY_V4.MP4 <span className="bg-zinc-800 text-indigo-400 px-1 rounded ml-2">4K PROXY</span></div>
                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                        </div>

                        {/* Play Button */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 bg-zinc-800/50 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 group-hover:scale-110 transition-transform">
                                <Play size={24} fill="currentColor" className="text-white ml-1" />
                            </div>
                        </div>

                        {/* Fake Timeline */}
                        <div className="absolute bottom-10 left-10 right-10">
                            <div className="w-full h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                                <div className="absolute left-0 top-0 bottom-0 bg-indigo-500 w-[30%] shadow-[0_0_10px_#6366f1]"></div>
                            </div>
                            {/* Markers */}
                            <div className="absolute -top-1 left-[15%] w-0.5 h-3 bg-indigo-400 shadow-[0_0_5px_#6366f1]"></div>
                            <div className="absolute -top-1 left-[45%] w-0.5 h-3 bg-zinc-600"></div>
                            <div className="absolute -top-1 left-[70%] w-0.5 h-3 bg-zinc-600"></div>
                        </div>

                        {/* Background Gradient simulating video */}
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 to-purple-900/10 opacity-50"></div>
                    </div>
                 </div>
            </div>

            {/* BLOCK 3: ROI BAR CHART */}
            <div className="py-24 bg-white dark:bg-black border-y border-zinc-100 dark:border-zinc-900 transition-colors">
                <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                     <div>
                         <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-12 leading-tight">
                            {t('land.roi.title')}
                         </h2>
                         
                         <div className="space-y-6">
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">94%</div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('land.roi.94')}</p>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl">
                                <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">0ms</div>
                                <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('land.roi.0ms')}</p>
                            </div>
                         </div>
                     </div>

                     {/* Bar Chart Visual */}
                     <div className="h-[400px] flex items-end justify-center gap-4 md:gap-12 px-4 md:px-0">
                         {/* Bar 1 */}
                         <div className="flex flex-col items-center gap-3 w-20 md:w-24 group">
                             <div className="w-full bg-zinc-200 dark:bg-zinc-800 rounded-t-lg h-[280px] relative group-hover:bg-zinc-300 dark:group-hover:bg-zinc-700 transition-colors"></div>
                             <span className="text-[10px] md:text-xs font-bold text-zinc-500 text-center">{t('land.chart.wa')}</span>
                         </div>
                         {/* Bar 2 */}
                         <div className="flex flex-col items-center gap-3 w-20 md:w-24 group">
                             <div className="w-full bg-zinc-300 dark:bg-zinc-700 rounded-t-lg h-[120px] relative group-hover:bg-zinc-400 dark:group-hover:bg-zinc-600 transition-colors"></div>
                             <span className="text-[10px] md:text-xs font-bold text-zinc-500 text-center">{t('land.chart.cloud')}</span>
                         </div>
                         {/* Bar 3 (SmoTree) */}
                         <div className="flex flex-col items-center gap-3 w-20 md:w-24">
                             <div className="w-full bg-indigo-500 rounded-t-lg h-[20px] relative shadow-[0_0_20px_rgba(99,102,241,0.4)] animate-pulse"></div>
                             <span className="text-[10px] md:text-xs font-bold text-zinc-900 dark:text-white text-center">{t('land.chart.pro')}</span>
                         </div>
                     </div>
                </div>
            </div>

            {/* WHY SMOTREE SECTION */}
            <div className="py-24 bg-zinc-50 dark:bg-zinc-900/30 border-y border-zinc-200 dark:border-zinc-900 relative transition-colors">
                <div className="max-w-5xl mx-auto px-4 relative z-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white text-center mb-16">{t('why.title')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center hover:border-indigo-500/30 transition-all hover:-translate-y-1 duration-300 group shadow-lg">
                            <div className="p-4 bg-orange-50 dark:bg-zinc-900 rounded-2xl mb-6 text-orange-500 dark:text-yellow-500 group-hover:scale-110 transition-transform shadow-lg shadow-orange-500/10">
                                <Timer size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-white mb-4 text-xl">{t('why.feat1.title')}</h3>
                            <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{t('why.feat1.desc')}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center hover:border-indigo-500/30 transition-all hover:-translate-y-1 duration-300 group shadow-lg">
                            <div className="p-4 bg-blue-50 dark:bg-zinc-900 rounded-2xl mb-6 text-blue-500 group-hover:scale-110 transition-transform shadow-lg shadow-blue-500/10">
                                <History size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-white mb-4 text-xl">{t('why.feat2.title')}</h3>
                            <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{t('why.feat2.desc')}</p>
                        </div>
                        <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 p-8 rounded-3xl flex flex-col items-center text-center hover:border-indigo-500/30 transition-all hover:-translate-y-1 duration-300 group shadow-lg">
                            <div className="p-4 bg-green-50 dark:bg-zinc-900 rounded-2xl mb-6 text-green-500 group-hover:scale-110 transition-transform shadow-lg shadow-green-500/10">
                                <Lock size={32} strokeWidth={1.5} />
                            </div>
                            <h3 className="font-bold text-zinc-900 dark:text-white mb-4 text-xl">{t('why.feat3.title')}</h3>
                            <p className="text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">{t('why.feat3.desc')}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ROADMAP SECTION */}
            <div className="py-20 px-4 bg-white dark:bg-zinc-950/50 transition-colors">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-4 text-zinc-900 dark:text-white">{t('roadmap.title')}</h2>
                    <p className="text-zinc-600 dark:text-zinc-400">{t('roadmap.subtitle')}</p>
                </div>
                <RoadmapBlock />
            </div>

            <footer className="py-12 border-t border-zinc-100 dark:border-zinc-900 text-center text-zinc-500 dark:text-zinc-600 text-sm bg-zinc-50 dark:bg-black transition-colors">
                <p>© {new Date().getFullYear()} {t('app.name')} Video Collaboration. {t('footer.rights')}</p>
            </footer>
          </>
      )}
    </div>
  );
};
