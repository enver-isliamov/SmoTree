
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Clapperboard, ArrowRight, UserPlus, ShieldCheck, Mail, AlertCircle } from 'lucide-react';
import { generateId } from '../services/utils';

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

  // Get Client ID from Environment Variables (set in Vercel Dashboard)
  // Casting to any to avoid TypeScript error 'Property env does not exist on type ImportMeta'
  const GOOGLE_CLIENT_ID = (import.meta as any).env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    if (pId) {
        setInviteProjectId(pId);
    }

    if (!GOOGLE_CLIENT_ID) {
        console.warn("Google Client ID is missing. Check VITE_GOOGLE_CLIENT_ID environment variable.");
        return;
    }

    // Initialize Google Auth
    if (window.google) {
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
    // This is the JWT token from Google
    // Ideally, we send this to backend (api/auth) to verify and get user data.
    // For now (Step 2 of SaaS plan), we will decode it on client to simulate login.
    
    try {
        const payload = JSON.parse(atob(response.credential.split('.')[1]));
        
        const role = inviteProjectId ? UserRole.GUEST : UserRole.ADMIN;
        
        const googleUser: User = {
            id: payload.email, // Use email as persistent ID for SaaS
            name: payload.name,
            avatar: payload.picture,
            role: role
        };

        console.log("Logged in via Google:", googleUser);
        onLogin(googleUser);

    } catch (e) {
        setGoogleError("Failed to process Google Login.");
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="z-10 w-full max-w-sm animate-in fade-in zoom-in-95 duration-300">
        
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-xl shadow-indigo-500/20">
            <Clapperboard size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">SmoTree</h1>
          <p className="text-zinc-400 text-sm">Professional Video Review Platform</p>
        </div>

        {/* Login Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          
          {/* Top Bar Indicator */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${inviteProjectId ? 'bg-orange-500' : 'bg-indigo-500'}`}></div>

          <div className="mb-6">
             {inviteProjectId ? (
                <div className="flex items-start gap-3">
                    <div className="bg-orange-500/10 p-2 rounded-lg text-orange-400 shrink-0">
                        <UserPlus size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Join Project</h2>
                        <p className="text-xs text-zinc-400 mt-1">
                           You've been invited to review a project.
                        </p>
                    </div>
                </div>
             ) : (
                <div className="flex items-start gap-3">
                     <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Welcome Back</h2>
                        <p className="text-xs text-zinc-400 mt-1">
                           Sign in to manage your workspace.
                        </p>
                    </div>
                </div>
             )}
          </div>

          <div className="space-y-4">
            {/* GOOGLE BUTTON CONTAINER */}
            {!GOOGLE_CLIENT_ID ? (
                <div className="p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-yellow-500 text-xs flex items-center gap-2">
                    <AlertCircle size={16} />
                    <span>Google Login not configured (Missing Client ID).</span>
                </div>
            ) : (
                <div id="googleSignInDiv" className="h-[44px] w-full min-h-[44px]"></div>
            )}
            
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-zinc-800"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-zinc-900 px-2 text-zinc-500">Or continue with name</span>
                </div>
            </div>

            {/* Manual Fallback (Legacy) */}
            <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="relative">
                    <Mail size={16} className="absolute top-3.5 left-3 text-zinc-600" />
                    <input 
                        type="text" 
                        placeholder="Your Name (Guest Mode)" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all placeholder:text-zinc-600"
                    />
                </div>
                
                <button 
                type="submit"
                disabled={!name.trim()}
                className={`w-full p-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors border border-zinc-700 hover:bg-zinc-800 text-zinc-300`}
                >
                Continue as Guest
                <ArrowRight size={14} />
                </button>
            </form>
          </div>

        </div>
        
        {googleError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-xs text-center">
                {googleError}
            </div>
        )}

      </div>
    </div>
  );
};
