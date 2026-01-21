
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { Clapperboard, ArrowRight, UserPlus, ShieldCheck } from 'lucide-react';
import { generateId } from '../services/utils';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Check for invite link immediately
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    if (pId) {
        setInviteProjectId(pId);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Logic: 
    // If inviting to a project via link -> Role is GUEST
    // If starting fresh (no link) -> Role is ADMIN
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
                           You've been invited to review a project. Enter your name to join the team.
                        </p>
                    </div>
                </div>
             ) : (
                <div className="flex items-start gap-3">
                     <div className="bg-indigo-500/10 p-2 rounded-lg text-indigo-400 shrink-0">
                        <ShieldCheck size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Admin Access</h2>
                        <p className="text-xs text-zinc-400 mt-1">
                           Create your workspace and start managing video projects.
                        </p>
                    </div>
                </div>
             )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1.5 ml-1">
                Your Name
              </label>
              <input 
                autoFocus
                type="text" 
                placeholder="e.g. Alex Smith" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all placeholder:text-zinc-600"
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={!name.trim()}
              className={`w-full p-3 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all shadow-lg
                ${inviteProjectId 
                    ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/20' 
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20'
                }
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
              `}
            >
              {inviteProjectId ? 'Join Session' : 'Enter Workspace'}
              <ArrowRight size={18} />
            </button>
          </form>

        </div>
        
        <div className="mt-8 text-center">
             <p className="text-[10px] text-zinc-600">
                {inviteProjectId ? 'Guest Mode Enabled' : 'v0.8.0 • Secure Workspace'}
             </p>
        </div>

      </div>
    </div>
  );
};