
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Clapperboard, ArrowRight, UserPlus, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { generateId } from '../services/utils';
import { RoadmapBlock } from './RoadmapBlock';

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
  }, [inviteProjectId, GOOGLE_CLIENT_ID]);

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
                        <h2 className="text-lg font-semibold text-white">Join Project</h2>
                        <p className="text-xs text-zinc-400 mt-1">You've been invited to collaborate.</p>
                    </div>
                </div>
            ) : (
                <div className="flex items-start gap-3">
                    <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 shrink-0"><ShieldCheck size={20} /></div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Вход в аккаунт</h2>
                        <p className="text-xs text-zinc-400 mt-1">Управляйте своими видео проектами.</p>
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
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-zinc-900 px-2 text-zinc-500">{isGoogleConfigured ? 'Или как гость' : 'Dev Mode'}</span></div>
                    </div>
                    <form onSubmit={handleManualSubmit} className="space-y-3">
                        <div className="relative">
                            <Mail size={16} className="absolute top-3.5 left-3 text-zinc-600" />
                            <input type="text" placeholder={isInvite ? "Ваше Имя (Гость)" : "Имя Админа"} value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600" />
                        </div>
                        <button type="submit" disabled={!name.trim()} className={`w-full p-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700 hover:bg-zinc-800 text-zinc-300`}>
                            {isInvite ? 'Присоединиться' : 'Войти'} <ArrowRight size={14} />
                        </button>
                    </form>
                </>
            )}
        </div>
        {googleError && <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs text-center">{googleError}</div>}
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-green-500/30">
      
      {/* Navbar Placeholder */}
      <nav className="border-b border-zinc-900 p-4 flex justify-between items-center bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="flex items-center gap-2">
             <div className="bg-indigo-600 p-1.5 rounded-lg"><Clapperboard size={20} /></div>
             <span className="font-bold text-lg tracking-tight">SmoTree</span>
          </div>
          {!inviteProjectId && (
              <button 
                onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                  Войти
              </button>
          )}
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
                      Присоединяйтесь <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">к мозговому</span> <br />
                      ткацкому станку.
                  </h1>
                  
                  <div className="space-y-6 text-lg text-zinc-400 max-w-xl leading-relaxed">
                      <p>
                          Получите пожизненный доступ к самой продвинутой платформе для ревью видео. 
                          Ваши инструменты будут с вами всегда, без необходимости оформлять подписку.
                      </p>
                      <p className="text-sm border-l-2 border-green-500 pl-4 italic">
                          "Я разрабатываю SmoTree в одиночку. Вы финансируете разработку, а я дарю вам инструмент навсегда."
                      </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-4">
                      <button 
                        onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-white text-black hover:bg-zinc-200 px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-2"
                      >
                          Стать Основателем <ArrowRight size={20} />
                      </button>
                  </div>
              </div>

              {/* Login Card (Floating) */}
              <div id="auth-section" className="relative z-10 animate-in fade-in zoom-in-95 duration-1000 delay-200">
                  <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-30"></div>
                  <LoginCard />
                  <p className="text-center text-zinc-500 text-xs mt-4">
                      Безопасная аутентификация через Google
                  </p>
              </div>
          </div>
      </div>

      {/* ROADMAP SECTION */}
      <div className="py-20 px-4 border-t border-zinc-900 bg-zinc-950/50">
          <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">Выбирайте своё будущее</h2>
              <p className="text-zinc-400">Прозрачная модель ценообразования для ранних пользователей.</p>
          </div>
          <RoadmapBlock />
      </div>

      <footer className="py-12 border-t border-zinc-900 text-center text-zinc-600 text-sm">
          <p>© {new Date().getFullYear()} SmoTree Video Collaboration. All rights reserved.</p>
      </footer>

    </div>
  );
};
