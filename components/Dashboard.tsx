import React, { useState } from 'react';
import { Project, User, UserRole } from '../types';
import { Clock, Plus, X, Loader2, MoreVertical, FileVideo, Clapperboard, LogOut, ChevronRight, Lock } from 'lucide-react';

interface DashboardProps {
  projects: Project[];
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onAddProject: (project: Project) => void;
  onLogout: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, currentUser, onSelectProject, onAddProject, onLogout }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');

  const isClient = currentUser.role === UserRole.CLIENT;

  // STRICT FILTERING: Clients only see projects they are members of
  const visibleProjects = isClient
    ? projects.filter(p => p.team.some(member => member.id === currentUser.id))
    : projects;

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !client) return;

    setIsCreating(true);

    setTimeout(() => {
      const newProject: Project = {
        id: `p-${Date.now()}`,
        name,
        client,
        description,
        updatedAt: 'Just now',
        team: [currentUser],
        ownerId: currentUser.id,
        assets: []
      };

      onAddProject(newProject);
      setIsCreating(false);
      setIsModalOpen(false);
      
      setName('');
      setClient('');
      setDescription('');
    }, 800);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      
      {/* Unified Header - Player Style */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 z-20">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg shrink-0">
             <Clapperboard size={18} className="text-white" />
          </div>
          
          <div className="flex flex-col">
             <h1 className="font-semibold text-sm md:text-base leading-tight text-zinc-100">SmoTree</h1>
             <div className="flex items-center gap-1 text-[10px] text-zinc-400 leading-none">
                <span>Dashboard</span>
                <ChevronRight size={10} />
                <span>{currentUser.name.split(' ')[0]}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* User Profile Tiny */}
           <div className="hidden md:flex items-center gap-2 text-right">
              <div>
                 <div className="text-xs font-medium text-white">{currentUser.name}</div>
                 <div className="text-[10px] text-zinc-500">{currentUser.role}</div>
              </div>
              <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-zinc-700" alt="User" />
           </div>

           <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>

           <button onClick={onLogout} className="text-zinc-500 hover:text-white p-1" title="Logout">
              <LogOut size={18} />
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          {/* Toolbar */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              {isClient ? 'Shared with Me' : 'All Projects'}
              <span className="text-xs font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                {visibleProjects.length}
              </span>
            </h2>
            
            {!isClient && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-indigo-900/20"
              >
                <Plus size={16} />
                New Project
              </button>
            )}
          </div>

          {/* EMPTY STATE FOR CLIENTS */}
          {visibleProjects.length === 0 && isClient && (
             <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                <Lock size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-zinc-300">No Projects Found</h3>
                <p className="max-w-xs text-center mt-2 text-sm text-zinc-500">
                   You don't have access to any projects here. Please open the specific link provided to you by the editor.
                </p>
             </div>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Create New Card (First item for visibility - Admin Only) */}
            {!isClient && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="group border border-dashed border-zinc-800 rounded-lg p-4 flex flex-col items-center justify-center text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all min-h-[180px]"
              >
                <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-indigo-500/20 mb-2 transition-colors">
                  <Plus size={24} />
                </div>
                <span className="font-medium text-sm">Create Project</span>
              </button>
            )}

            {visibleProjects.map((project) => (
              <div 
                key={project.id} 
                onClick={() => onSelectProject(project)}
                className="group bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-indigo-500/50 transition-all cursor-pointer shadow-sm hover:shadow-md relative flex flex-col h-[180px]"
              >
                {/* Top Row: Client & Menu */}
                <div className="flex justify-between items-start mb-2">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 mb-0.5">
                      {project.client}
                  </div>
                  {!isClient && (
                    <button className="text-zinc-600 hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical size={14} />
                    </button>
                  )}
                </div>

                {/* Title & Desc */}
                <h3 className="text-base font-bold text-zinc-100 mb-1 group-hover:text-indigo-400 transition-colors truncate">
                  {project.name}
                </h3>
                <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">
                  {project.description || 'No description provided.'}
                </p>

                {/* Bottom Row: Team & Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
                  {/* Avatar Stack */}
                  <div className="flex -space-x-2">
                    {project.team.slice(0, 4).map((member) => (
                        <img 
                          key={member.id} 
                          src={member.avatar} 
                          alt={member.name} 
                          title={member.name}
                          className="w-6 h-6 rounded-full border border-zinc-900 object-cover"
                        />
                    ))}
                    {project.team.length > 4 && (
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[9px] text-zinc-400 font-medium">
                          +{project.team.length - 4}
                        </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                        <FileVideo size={12} />
                        <span>{project.assets.length}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                        <Clock size={10} />
                        <span>{project.updatedAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <form onSubmit={handleCreateProject} className="p-6">
              <h2 className="text-xl font-bold text-white mb-6">New Project</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Project Name</label>
                  <input 
                    autoFocus
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Summer Campaign 2024"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Client Name</label>
                  <input 
                    type="text" 
                    required
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief details about the project..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-none h-24"
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isCreating || !name || !client}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
                >
                  {isCreating && <Loader2 size={14} className="animate-spin" />}
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
