
import React, { useState } from 'react';
import { Project, User, UserRole } from '../types';
import { Plus, X, Loader2, FileVideo, Clapperboard, LogOut, ChevronRight, Lock, Trash2, AlertTriangle, CalendarClock, Edit2, Share2, Unlock, Copy, Check, Save } from 'lucide-react';
import { generateId, isExpired, getDaysRemaining } from '../services/utils';
import { ToastType } from './Toast';
import { useLanguage } from '../services/i18n';

interface DashboardProps {
  projects: Project[];
  currentUser: User;
  onSelectProject: (project: Project) => void;
  onAddProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onEditProject: (projectId: string, data: Partial<Project>) => void;
  onLogout: () => void;
  notify: (msg: string, type: ToastType) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ projects, currentUser, onSelectProject, onAddProject, onDeleteProject, onEditProject, onLogout, notify }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { t } = useLanguage();
  
  // Edit State
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editName, setEditName] = useState('');
  const [editClient, setEditClient] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Share State
  const [sharingProject, setSharingProject] = useState<Project | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Deletion State
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Form State (Create)
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');

  // Role Checks
  const isGuest = currentUser.role === UserRole.GUEST;
  // Admin in global scope means "Registered User". 
  const isAccountHolder = currentUser.role === UserRole.ADMIN;

  // --- FILTERING LOGIC ---
  const myProjects = projects.filter(p => p.ownerId === currentUser.id);
  const sharedProjects = projects.filter(p => p.ownerId !== currentUser.id && p.team.some(member => member.id === currentUser.id));

  // PERMISSION CHECKS
  const canCreateProject = isAccountHolder;
  const isOwner = (project: Project) => project.ownerId === currentUser.id;

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !client) return;

    setIsCreating(true);

    setTimeout(() => {
      const newProject: Project = {
        id: generateId(), 
        name,
        client,
        description,
        createdAt: Date.now(), 
        updatedAt: 'Just now',
        team: [currentUser],
        ownerId: currentUser.id,
        assets: [],
        isLocked: false
      };

      onAddProject(newProject);
      setIsCreating(false);
      setIsModalOpen(false);
      
      setName('');
      setClient('');
      setDescription('');
    }, 800);
  };

  const handleOpenEdit = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setEditingProject(project);
      setEditName(project.name);
      setEditClient(project.client);
      setEditDesc(project.description);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingProject) return;
      onEditProject(editingProject.id, {
          name: editName,
          client: editClient,
          description: editDesc
      });
      setEditingProject(null);
  };

  const handleToggleLock = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      onEditProject(project.id, { isLocked: !project.isLocked });
  };

  const handleShareClick = (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      setSharingProject(project);
  };

  const handleCopyLink = () => {
      if (!sharingProject) return;
      const url = `${window.location.origin}?projectId=${sharingProject.id}`;
      navigator.clipboard.writeText(url);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      notify("Link copied!", "success");
  };

  const handleDeleteClick = async (e: React.MouseEvent, project: Project) => {
      e.stopPropagation();
      if (!confirm(`Are you sure you want to delete "${project.name}"?\nThis will permanently delete ALL videos and comments.`)) {
          return;
      }

      setIsDeleting(project.id);
      
      const urlsToDelete: string[] = [];
      project.assets.forEach(asset => {
          asset.versions.forEach(v => {
              if (v.url.startsWith('http')) {
                  urlsToDelete.push(v.url);
              }
          });
      });

      if (urlsToDelete.length > 0) {
          try {
              const token = localStorage.getItem('smotree_auth_token');
              await fetch('/api/delete', {
                  method: 'POST',
                  headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': token ? `Bearer ${token}` : ''
                  },
                  body: JSON.stringify({ urls: urlsToDelete })
              });
          } catch (err) {
              console.error("Failed to delete blobs", err);
              notify("Warning: Could not delete video files from cloud. Project entry will be removed.", "error");
          }
      }

      onDeleteProject(project.id);
      setIsDeleting(null);
  };

  const renderProjectGrid = (projectList: Project[], title: string, showEmptyMessage = false) => {
      if (projectList.length === 0 && !showEmptyMessage) return null;

      return (
          <div className="mb-8">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2 mb-4">
                  {title}
                  <span className="text-xs font-normal text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                      {projectList.length}
                  </span>
              </h2>
              
              {projectList.length === 0 && showEmptyMessage ? (
                  <div className="flex flex-col items-center justify-center h-[20vh] text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                        <Lock size={32} className="mb-2 opacity-50" />
                        <h3 className="text-base font-medium text-zinc-400">{t('dash.no_projects')}</h3>
                 </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {projectList.map((project) => {
                        const expired = project.createdAt ? isExpired(project.createdAt) : false;
                        const daysLeft = project.createdAt ? getDaysRemaining(project.createdAt) : 7;
                        const locked = project.isLocked;
                        const userIsOwner = isOwner(project);
                        
                        return (
                        <div 
                            key={project.id} 
                            onClick={() => !expired && onSelectProject(project)}
                            className={`group bg-zinc-900 border rounded-lg p-4 transition-all relative flex flex-col h-[180px]
                                ${expired 
                                    ? 'border-red-900/30 opacity-70 hover:opacity-100 cursor-not-allowed' 
                                    : 'border-zinc-800 hover:border-indigo-500/50 cursor-pointer shadow-sm hover:shadow-md'
                                }
                            `}
                        >
                            {isDeleting === project.id && (
                                <div className="absolute inset-0 bg-black/80 z-20 flex items-center justify-center rounded-lg">
                                    <Loader2 className="animate-spin text-red-500" />
                                </div>
                            )}

                            {/* Status Badges */}
                            <div className="absolute top-2 right-2 z-10 flex gap-1">
                                {locked && (
                                     <div className="bg-red-500/10 text-red-500 p-1 rounded border border-red-500/20" title="Project Locked">
                                        <Lock size={12} />
                                    </div>
                                )}
                                {project.createdAt && daysLeft <= 2 && !expired && (
                                    <div className="bg-orange-500/10 text-orange-500 text-[9px] px-1.5 py-0.5 rounded border border-orange-500/20 flex items-center gap-1">
                                        <CalendarClock size={10} />
                                        {daysLeft}d left
                                    </div>
                                )}
                                {expired && (
                                    <div className="bg-red-500/10 text-red-500 text-[9px] px-1.5 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                                        <AlertTriangle size={10} />
                                        Expired
                                    </div>
                                )}
                            </div>


                            <div className="flex justify-between items-start mb-2 pr-12">
                                <div className="text-[10px] uppercase font-bold tracking-wider text-indigo-400 mb-0.5 truncate max-w-[120px]">
                                    {project.client}
                                </div>
                            </div>

                            <h3 className={`text-base font-bold mb-1 truncate transition-colors pr-8 ${expired ? 'text-zinc-500' : 'text-zinc-100 group-hover:text-indigo-400'}`}>
                                {project.name}
                            </h3>
                            <p className="text-xs text-zinc-500 mb-4 line-clamp-2 leading-relaxed">
                                {project.description || 'No description provided.'}
                            </p>

                            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
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
                                
                                {userIsOwner && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={(e) => handleToggleLock(e, project)}
                                            className={`p-1.5 rounded hover:bg-zinc-800 ${project.isLocked ? 'text-red-400' : 'text-zinc-500 hover:text-white'}`}
                                            title={project.isLocked ? "Unlock Project" : "Lock Project"}
                                        >
                                            {project.isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                        </button>
                                        <button 
                                            onClick={(e) => handleOpenEdit(e, project)}
                                            className="p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded"
                                            title="Edit Details"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleShareClick(e, project)}
                                            className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-800 rounded"
                                            title="Share Project"
                                        >
                                            <Share2 size={14} />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteClick(e, project)}
                                            className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded"
                                            title="Delete Project"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                                
                                {!userIsOwner && (
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                                        <FileVideo size={12} />
                                        <span>{project.assets.length}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
              )}
          </div>
      );
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      
      <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 z-20">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 rounded-lg shrink-0">
             <Clapperboard size={18} className="text-white" />
          </div>
          
          <div className="flex flex-col">
             <h1 className="font-semibold text-sm md:text-base leading-tight text-zinc-100">{t('app.name')}</h1>
             <div className="flex items-center gap-1 text-[10px] text-zinc-400 leading-none">
                <span>Dashboard</span>
                <ChevronRight size={10} />
                <span>{currentUser.name.split(' ')[0]}</span>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Clickable Profile Section */}
           <div 
             onClick={() => window.dispatchEvent(new CustomEvent('NAVIGATE_PROFILE'))}
             className="hidden md:flex items-center gap-2 text-right cursor-pointer hover:bg-zinc-800 py-1 px-2 rounded-lg transition-colors group"
           >
              <div>
                 <div className="text-xs font-medium text-white group-hover:text-indigo-400 transition-colors">{currentUser.name}</div>
                 <div className="text-[10px] text-zinc-500 uppercase">{currentUser.role}</div>
              </div>
              <img src={currentUser.avatar} className="w-8 h-8 rounded-full border border-zinc-700 group-hover:border-indigo-500 transition-colors" alt="User" />
           </div>

           <div className="h-6 w-px bg-zinc-800 hidden md:block"></div>

           <button onClick={onLogout} className="text-zinc-500 hover:text-white p-1" title={t('logout')}>
              <LogOut size={18} />
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex justify-end items-center mb-6">
            {canCreateProject && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors text-sm font-medium shadow-lg shadow-indigo-900/20"
              >
                <Plus size={16} />
                {t('dash.new_project')}
              </button>
            )}
          </div>

          {myProjects.length === 0 && sharedProjects.length === 0 && isGuest && (
             <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/30">
                <Lock size={48} className="mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-zinc-300">{t('dash.no_projects')}</h3>
                <p className="max-w-xs text-center mt-2 text-sm text-zinc-500">
                   {t('dash.no_access')}
                </p>
             </div>
          )}

          {renderProjectGrid(myProjects, t('dash.my_projects'))}
          {renderProjectGrid(sharedProjects, t('dash.shared_projects'))}
          
        </div>
      </div>

      {/* CREATE MODAL */}
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
              <h2 className="text-xl font-bold text-white mb-6">{t('dash.new_project')}</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Project Name</label>
                  <input autoFocus type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Campaign 2024" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Client Name</label>
                  <input type="text" required value={client} onChange={(e) => setClient(e.target.value)} placeholder="e.g. Acme Corp" className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief details about the project..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all resize-none h-24" />
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">{t('cancel')}</button>
                <button type="submit" disabled={isCreating || !name || !client} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors">{isCreating && <Loader2 size={14} className="animate-spin" />}{isCreating ? t('loading') : t('dash.new_project')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
                <button onClick={() => setEditingProject(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white"><X size={20} /></button>
                <form onSubmit={handleSubmitEdit} className="p-6">
                    <h2 className="text-xl font-bold text-white mb-6">{t('edit')}</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Project Name</label>
                            <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Client Name</label>
                            <input type="text" required value={editClient} onChange={(e) => setEditClient(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Description</label>
                            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none resize-none h-24" />
                        </div>
                    </div>
                    <div className="mt-8 flex justify-end gap-3">
                        <button type="button" onClick={() => setEditingProject(null)} className="px-4 py-2 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800">{t('cancel')}</button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2"><Save size={14} /> {t('save')}</button>
                    </div>
                </form>
            </div>
          </div>
      )}

      {/* SHARE MODAL */}
      {sharingProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl relative animate-in zoom-in-95 duration-200 p-6">
                <button onClick={() => setSharingProject(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-white"><X size={20} /></button>
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400"><Share2 size={18} /></div>
                    <h2 className="text-lg font-bold text-white">Share Project</h2>
                </div>
                <p className="text-xs text-zinc-400 mb-4">Share this link with your client or team.</p>
                <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-2">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Project Link</div>
                    <div className="flex items-center gap-2">
                        <input type="text" readOnly value={`${window.location.origin}?projectId=${sharingProject.id}`} className="bg-transparent flex-1 text-xs text-zinc-300 outline-none truncate font-mono" />
                        <button onClick={handleCopyLink} className={`px-3 py-1.5 rounded text-xs transition-all shrink-0 flex items-center gap-1 font-medium ${isCopied ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}{isCopied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            </div>
          </div>
      )}

    </div>
  );
};
