
import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../constants';
import { Clapperboard, ChevronRight, User as UserIcon, ArrowRight } from 'lucide-react';
import { generateId } from '../services/utils';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [guestName, setGuestName] = useState('');

  const handleGuestLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) return;

    const guestUser: User = {
      id: `guest-${generateId()}`,
      name: guestName,
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${guestName}`,
      role: UserRole.GUEST 
    };

    onLogin(guestUser);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4 shadow-xl shadow-indigo-500/20">
            <Clapperboard size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Welcome to SmoTree</h1>
          <p className="text-zinc-400">Collaboration made simple.</p>
        </div>

        {/* Guest / Link Access Section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 mb-6 shadow-xl">
          <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
            <UserIcon size={18} className="text-indigo-400" />
            Guest Access
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            Received a review link? Enter your name to start commenting.
          </p>
          <form onSubmit={handleGuestLogin} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter your name..." 
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 outline-none transition-colors"
              required
            />
            <button 
              type="submit"
              disabled={!guestName.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white p-2 rounded-lg transition-colors"
            >
              <ArrowRight size={20} />
            </button>
          </form>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-zinc-950 px-2 text-zinc-500">Or sign in as team member</span>
          </div>
        </div>

        <div className="space-y-3">
          {MOCK_USERS.map((user) => (
            <button
              key={user.id}
              onClick={() => onLogin(user)}
              className="w-full group bg-zinc-900/50 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 p-3 rounded-xl flex items-center gap-3 transition-all duration-300"
            >
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-10 h-10 rounded-full border border-zinc-700 object-cover"
              />
              <div className="flex-1 text-left">
                <div className="font-medium text-zinc-300 group-hover:text-white text-sm">{user.name}</div>
                <div className="text-xs text-zinc-500 uppercase">{user.role}</div>
              </div>
              <ChevronRight className="text-zinc-700 group-hover:text-zinc-400" size={16} />
            </button>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-zinc-600">
          <p>SmoTree v0.7.1 • Permission Refactor</p>
        </div>
      </div>
    </div>
  );
};