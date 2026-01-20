import React, { useState, useRef } from 'react';
import { Project, ProjectAsset, User, UserRole } from '../types';
import { ChevronLeft, Upload, Clock, Loader2, Share2, Copy, Check, X, Clapperboard, ChevronRight, Link as LinkIcon } from 'lucide-react';
import { upload } from '@vercel/blob/client';

interface ProjectViewProps {
  project: Project;
  currentUser: User;
  onBack: () => void;
  onSelectAsset: (asset: ProjectAsset) => void;
  onUpdateProject: (project: Project) => void;
}

export const ProjectView: React.FC<ProjectViewProps> = ({ project, currentUser, onBack, onSelectAsset, onUpdateProject }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  // Share / Team View State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{type: 'project' | 'asset', id: string, name: string} | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isClient = currentUser.role === UserRole.CLIENT;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isClient) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // Prevent client uploads
    if (isClient) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleRealUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleRealUpload(e.target.files[0]);
    }
  };

  // Real Upload to Vercel Blob
  const handleRealUpload = async (file: File) => {
    setIsUploading(true);

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      // Once uploaded, add to project assets
      const newAsset: ProjectAsset = {
        id: `a-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ""),
        thumbnail: `https://images.unsplash.com/photo-1574717024653-61fd2cf4d44c?w=600&q=80`, // Placeholder thumb, real thumbnail gen requires server
        currentVersionIndex: 0,
        versions: [
          {
            id: `v-${Date.now()}`,
            versionNumber: 1,
            filename: file.name,
            url: newBlob.url, // Real URL from Vercel Blob
            uploadedAt: 'Just now',
            comments: []
          }
        ]
      };

      const updatedProject = {
        ...project,
        assets: [...project.assets, newAsset],
        updatedAt: 'Just now'
      };
      
      onUpdateProject(updatedProject);

    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Make sure Vercel Blob is configured.");
    } finally {
      setIsUploading(false);
    }
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
    <div className="flex flex-col h-screen bg-zinc-950" onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* Unified Header */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between px-2 md:px-4 shrink-0 z-20">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          {/* Hide Back Button for Clients to prevent navigation to Dashboard */}
          {!isClient && (
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
          >
             {project.team.slice(0, 3).map((member) => (
                <img key={member.id} src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border-2 border-zinc-950" />
             ))}
             <div className="w-8 h-8 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">
               +
             </div>
          </div>

          <div className="h-6 w-px bg-zinc-800 mx-1"></div>

          <button 
            onClick={handleShareProject}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium"
            title="Share Project"
          >
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-[1600px] mx-auto">
            {/* Action Bar */}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-sm md:text-base font-semibold text-zinc-200">Assets <span className="text-zinc-500 ml-1">{project.assets.length}</span></h2>
                
                {/* Hide Upload Controls for Clients */}
                {!isClient && (
                    <div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="video/*"
                        onChange={handleFileSelect}
                    />
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
                    className="group cursor-pointer bg-zinc-900 rounded-lg overflow-hidden border border-zinc-800 hover:border-indigo-500/50 transition-all shadow-sm"
                >
                    <div className="aspect-video bg-zinc-950 relative overflow-hidden">
                    {/* Fallback for thumbnail if not generated */}
                    <img 
                        src={asset.thumbnail} 
                        alt={asset.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80'; // Dark abstract fallback
                        }}
                    />
                    
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1">
                        <button 
                            onClick={(e) => handleShareAsset(e, asset)}
                            className="p-1.5 bg-black/60 hover:bg-indigo-600 text-white rounded-md backdrop-blur-sm transition-colors"
                            title="Share Link"
                        >
                            <LinkIcon size={12} />
                        </button>
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

                {/* Hide Drop Zone for Clients */}
                {!isClient && (
                    <div 
                    onClick={() => fileInputRef.current?.click()}
                    onDragLeave={handleDragLeave}
                    className={`border border-dashed rounded-lg flex flex-col items-center justify-center gap-2 transition-all cursor-pointer aspect-video
                        ${isDragging 
                        ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                        : 'border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/50'
                        }
                    `}
                    >
                    <Upload size={24} />
                    <span className="font-medium text-xs text-center">Drop video</span>
                    </div>
                )}
            </div>
          </div>
      </div>

      {/* Share Modal */}
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
                  <h2 className="text-lg font-bold text-white mb-1">Share {shareTarget.type === 'project' ? 'Project' : 'Asset'}</h2>
                  <p className="text-sm font-medium text-indigo-400 mb-2 truncate">{shareTarget.name}</p>
                  <p className="text-xs text-zinc-400 mb-4">Anyone with the link can view and comment.</p>
                  <div className="bg-zinc-950 border border-zinc-800 rounded p-1.5 flex items-center gap-2 mb-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}?projectId=${project.id}${shareTarget.type === 'asset' ? `&assetId=${shareTarget.id}` : ''}`} 
                      className="bg-transparent flex-1 text-xs text-zinc-400 px-2 outline-none truncate" 
                    />
                    <button onClick={handleCopyLink} className="bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded text-xs transition-colors shrink-0 flex items-center gap-1">
                      {isCopied ? <Check size={12} /> : <Copy size={12} />}
                      {isCopied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </>
              )}

              {isParticipantsModalOpen && (
                <>
                  <h2 className="text-lg font-bold text-white mb-4">Team</h2>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {project.team.map(member => (
                        <div key={member.id} className="flex items-center justify-between p-2 rounded hover:bg-zinc-800/50">
                          <div className="flex items-center gap-2">
                              <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-full border border-zinc-800" />
                              <div>
                                <div className="text-sm text-zinc-200 font-medium">{member.name}</div>
                                <div className="text-[10px] text-zinc-500 uppercase">{member.role}</div>
                              </div>
                          </div>
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
