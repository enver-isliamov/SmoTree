
import React, { useState, useRef } from 'react';
import { Project, ProjectAsset, User, UserRole } from '../types';
import { ChevronLeft, Upload, Clock, Loader2, Share2, Copy, Check, X, Clapperboard, ChevronRight, Link as LinkIcon, Trash2, UserPlus, Info, UserMinus } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import { generateId } from '../services/utils';

interface ProjectViewProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onSelectAsset: (asset: ProjectAsset) => void;
  onUpdateProject: (project: Project) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project, currentUser, onBack, onSelectAsset, onUpdateProject }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeletingAsset, setIsDeletingAsset] = useState<string | null>(null);
  
  // Share / Team View State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{type: 'project' | 'asset', id: string, name: string} | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isGuest = currentUser.role === UserRole.GUEST;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleRealUpload(e.target.files[0]);
    }
  };

  // Real Upload to Vercel Blob with Local Fallback
  const handleRealUpload = async (file: File) => {
    setIsUploading(true);

    try {
      let assetUrl = '';
      let isLocalFallback = false;

      try {
        const newBlob = await upload(file.name, file, {
          access: 'public',
          handleUploadUrl: '/api/upload',
        });
        assetUrl = newBlob.url;
      } catch (uploadError) {
        console.warn("Cloud upload failed. Switching to Local Mode.", uploadError);
        assetUrl = URL.createObjectURL(file);
        isLocalFallback = true;
      }

      const newAsset: ProjectAsset = {
        id: generateId(),
        title: file.name.replace(/\.[^/.]+$/, ""),
        thumbnail: `https://images.unsplash.com/photo-1574717024653-61fd2cf4d44c?w=600&q=80`,
        currentVersionIndex: 0,
        versions: [
          {
            id: generateId(),
            versionNumber: 1,
            filename: file.name,
            url: assetUrl,
            uploadedAt: 'Just now',
            comments: [],
            localFileUrl: isLocalFallback ? assetUrl : undefined,
            localFileName: isLocalFallback ? file.name : undefined
          }
        ]
      };

      const updatedProject = {
        ...project,
        assets: [...project.assets, newAsset],
        updatedAt: 'Just now'
      };
      
      onUpdateProject(updatedProject);
      if (isLocalFallback) console.info("Using local file for preview (Offline Mode)");

    } catch (error) {
      console.error("Critical error adding asset", error);
      alert("Unexpected error handling file.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteAsset = async (e: React.MouseEvent, asset: ProjectAsset) => {
    e.stopPropagation();
    if (!confirm(`Delete asset "${asset.title}"?`)) return;

    setIsDeletingAsset(asset.id);

    // 1. Collect Blob URLs
    const urlsToDelete: string[] = [];
    asset.versions.forEach(v => {
        if (v.url.startsWith('http')) urlsToDelete.push(v.url);
    });

    // 2. Delete Blobs
    if (urlsToDelete.length > 0) {
        try {
            await fetch('/api/delete', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ urls: urlsToDelete })
            });
        } catch (err) {
            console.error("Failed to delete blobs", err);
        }
    }

    // 3. Update Project State
    const updatedAssets = project.assets.filter(a => a.id !== asset.id);
    onUpdateProject({ ...project, assets: updatedAssets });
    setIsDeletingAsset(null);
  };

  const handleShareProject = () => {
    setShareTarget({ type: 'project', id: project.id, name: project.name });
    setIsShareModalOpen(true);
  };

  const handleShareAsset = (e: React.MouseEvent, asset: ProjectAsset) => {
    e.stopPropagation(); 
    setShareTarget({ type: 'asset', id: asset.id, name: asset.title });
    setIsShareModalOpen(true);
  };

  const handleRemoveMember = (memberId: string) => {
      if (memberId === project.ownerId) {
          alert("Cannot remove the project owner.");
          return;
      }
      if (!confirm("Are you sure you want to remove this user from the team?")) return;

      const updatedTeam = project.team.filter(m => m.id !== memberId);
      onUpdateProject({ ...project, team: updatedTeam });
  };

  const handleCopyLink = () => {
    const origin = window.location.origin;
    let url = '';
    if (shareTarget?.type === 'project') {
       url = `${origin}?projectId=${shareTarget.id}`;
    } else {
       url = `${origin}?projectId=${project.id}&assetId=${shareTarget?.id}`;
    }
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950">
      {/* Unified Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 z-20">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {!isGuest && (
            <button onClick={onBack} className="text-zinc-400 hover:text-white shrink-0 p-1 mr-1">
                <ChevronLeft size={24} />
            </button>
          )}
          
          <div className="flex items-center justify-center w-8 h-8 bg-zinc-800 rounded-lg shrink-0 border border-zinc-700">
             <Clapperboard size={16} className="text-zinc-400" />
          </div>

          <div className="flex flex-col truncate">
            <div className="flex items-center gap-1 font-semibold text-sm md:text-base leading-tight text-zinc-100 truncate">
               <span className="truncate">{project.name}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-400 leading-none">
                <span>{project.client}</span>
                <ChevronRight size={10} />
                <span>{project.updatedAt}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div 
            onClick={() => setIsParticipantsModalOpen(true)}
            className="flex -space-x-2 cursor-pointer hover:opacity-80 transition-opacity"
            title="View Team"
          >
             {project.team.slice(0, 3).map((member) => (
                <img key={member.id} src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border-2 border-zinc-950" />
             ))}
             <div className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">
               {project.team.length > 3 ? `+${project.team.length - 3}` : '+'}
             </div>
          </div>
          <div className="h-6 w-px bg-zinc-800 mx-1"></div>
          <button 
            onClick={handleShareProject}
            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-xs md:text-sm font-medium"
            title="Invite Client"
          >
            <UserPlus size={16} />
            <span className="hidden md:inline">Invite</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm md:text-base font-semibold text-zinc-200">Assets <span className="text-zinc-500 ml-1">{project.assets.length}</span></h2>
                
                {!isGuest && (
                    <div>
                    <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileSelect}/>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors text-xs md:text-sm font-medium border border-zinc-700"
                    >
                        {isUploading ? <Loader2 size={14} className="animate-spin"/> : <Upload size={14} />}
                        {isUploading ? 'Uploading...' : 'Upload Asset'}
                    </button>
                    </div>
                )}
            </div>

            {/* Asset Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {project.assets.map((asset) => (
                <div 
                    key={asset.id}
                    onClick={() => onSelectAsset(asset)}
                    className="group cursor-pointer bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-indigo-500/50 transition-all shadow-sm relative"
                >
                    <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                    <img 
                        src={asset.thumbnail} 
                        alt={asset.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'; }}
                    />
                    
                    {/* Hover Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                        <button 
                            onClick={(e) => handleShareAsset(e, asset)}
                            className="p-1.5 bg-black/60 hover:bg-indigo-600 text-white rounded-md backdrop-blur-sm transition-colors"
                            title="Copy Direct Link"
                        >
                            <LinkIcon size={12} />
                        </button>
                        
                         {/* Asset Delete */}
                        {!isGuest && (
                             <button 
                                onClick={(e) => handleDeleteAsset(e, asset)}
                                className="p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-md backdrop-blur-sm transition-colors"
                                title="Delete Asset"
                             >
                                {isDeletingAsset === asset.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                             </button>
                        )}
                    </div>

                    <div className="absolute bottom-2 left-2 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white font-mono backdrop-blur-sm">
                        v{asset.versions.length}
                    </div>
                    </div>

                    <div className="p-3">
                    <h3 className="font-medium text-zinc-200 text-xs md:text-sm truncate mb-1">{asset.title}</h3>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span className="flex items-center gap-1">
                        <Clock size={10} />
                        {asset.versions[asset.versions.length-1]?.comments.length} comments
                        </span>
                        <span>{asset.versions[asset.versions.length-1]?.uploadedAt}</span>
                    </div>
                    </div>
                </div>
                ))}
            </div>
          </div>
      </div>

      {/* Modals */}
       {(isShareModalOpen || isParticipantsModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl relative p-6">
              <button 
                onClick={() => { setIsShareModalOpen(false); setIsParticipantsModalOpen(false); setShareTarget(null); }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white"
              >
                <X size={20} />
              </button>
              
              {isShareModalOpen && shareTarget && (
                <>
                  <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                          <UserPlus size={18} />
                      </div>
                      <h2 className="text-lg font-bold text-white">Invite to Review</h2>
                  </div>
                  
                  <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                     Share this link with your client or team. They will join as a <strong>Guest</strong> and can comment on this {shareTarget.type}.
                  </p>
                  
                  <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 mb-2">
                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-1">Review Link</div>
                    <div className="flex items-center gap-2">
                        <input 
                        type="text" 
                        readOnly 
                        value={`${window.location.origin}?projectId=${project.id}${shareTarget.type === 'asset' ? `&assetId=${shareTarget.id}` : ''}`} 
                        className="bg-transparent flex-1 text-xs text-zinc-300 outline-none truncate font-mono" 
                        />
                        <button onClick={handleCopyLink} className={`px-3 py-1.5 rounded text-xs transition-all shrink-0 flex items-center gap-1 font-medium ${isCopied ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}>
                        {isCopied ? <Check size={12} /> : <Copy size={12} />}
                        {isCopied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 bg-indigo-900/10 p-2 rounded border border-indigo-500/10">
                      <Info size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                      <p className="text-[10px] text-indigo-200/70">
                          Guests cannot delete files or create new projects.
                      </p>
                  </div>
                </>
              )}

              {isParticipantsModalOpen && (
                <>
                  <h2 className="text-lg font-bold text-white mb-4">Project Team</h2>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {project.team.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-800/50 group">
                          <div className="flex items-center gap-2">
                              <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-zinc-800" />
                              <div>
                                <div className="text-sm text-zinc-200 font-medium flex items-center gap-2">
                                    {member.name}
                                    {member.id === currentUser.id && <span className="text-[10px] text-zinc-500">(You)</span>}
                                    {member.id === project.ownerId && <span className="text-[10px] text-indigo-400 bg-indigo-950 px-1 rounded">Owner</span>}
                                </div>
                                <div className={`text-[10px] uppercase font-bold ${member.role === UserRole.GUEST ? 'text-orange-400' : 'text-indigo-400'}`}>
                                    {member.role}
                                </div>
                              </div>
                          </div>
                          
                          {/* REMOVE BUTTON - Only for non-guests, excluding owner and self */}
                          {!isGuest && member.id !== currentUser.id && member.id !== project.ownerId && (
                              <button 
                                onClick={() => handleRemoveMember(member.id)}
                                className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                title="Remove User"
                              >
                                <Trash2 size={14} />
                              </button>
                          )}
                        </div>
                    ))}
                  </div>
                </>
              )}
           </div>
        </div>
      )}
    </div>
  );
};
