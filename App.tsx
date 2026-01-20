import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { Player } from './components/Player';
import { Login } from './components/Login';
import { Project, ProjectAsset, User } from './types';
import { MOCK_PROJECTS } from './constants';

type ViewState = 
  | { type: 'DASHBOARD' }
  | { type: 'PROJECT_VIEW', projectId: string }
  | { type: 'PLAYER', assetId: string, projectId: string };

const STORAGE_KEY = 'smotree_projects_data';
const SYNC_DEBOUNCE_MS = 2000;

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // App Data State
  const [projects, setProjects] = useState<Project[]>(() => {
    // Initial load from local storage to prevent flash
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });

  const [view, setView] = useState<ViewState>({ type: 'DASHBOARD' });
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Initial Data Fetch from Cloud (Vercel Blob DB)
  useEffect(() => {
    const fetchCloudData = async () => {
       try {
         setIsSyncing(true);
         const res = await fetch('/api/data');
         if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data)) {
                setProjects(data);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
         }
       } catch (e) {
         console.warn("Offline or no backend detected, using local data.");
       } finally {
         setIsSyncing(false);
       }
    };
    fetchCloudData();
  }, []);

  // 2. Persist data changes to Cloud + LocalStorage (Debounced)
  useEffect(() => {
    // Immediate Local Save
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

    // Debounced Cloud Save
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(async () => {
        try {
            setIsSyncing(true);
            await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projects)
            });
        } catch (e) {
            console.error("Failed to sync to cloud", e);
        } finally {
            setIsSyncing(false);
        }
    }, SYNC_DEBOUNCE_MS);

    return () => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [projects]);

  // 3. Handle Deep Linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    const aId = params.get('assetId');

    if (pId) {
      // Logic runs after projects might have updated from cloud or local
      // We need to wait for projects to settle ideally, but for now we check available state
      // If projects are loaded async, we might miss this check initially if projects is empty
      // But we initialize with MOCK or LocalStorage, so it's usually fine.
      
      const projectExists = projects.find(p => p.id === pId);
      
      if (projectExists) {
        if (aId) {
           const assetExists = projectExists.assets.find(a => a.id === aId);
           if (assetExists) {
             setView({ type: 'PLAYER', projectId: pId, assetId: aId });
           } else {
             setView({ type: 'PROJECT_VIEW', projectId: pId });
           }
        } else {
           setView({ type: 'PROJECT_VIEW', projectId: pId });
        }
      }
    }
  }, [projects]); // Re-run when projects load/change to catch the link if data arrived late

  // Navigation handlers
  const handleSelectProject = (project: Project) => {
    setView({ type: 'PROJECT_VIEW', projectId: project.id });
    const newUrl = `${window.location.pathname}?projectId=${project.id}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const handleSelectAsset = (asset: ProjectAsset) => {
    if (view.type === 'PROJECT_VIEW') {
      setView({ type: 'PLAYER', assetId: asset.id, projectId: view.projectId });
      const newUrl = `${window.location.pathname}?projectId=${view.projectId}&assetId=${asset.id}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleBackToDashboard = () => {
    setView({ type: 'DASHBOARD' });
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleBackToProject = () => {
    if (view.type === 'PLAYER') {
      setView({ type: 'PROJECT_VIEW', projectId: view.projectId });
      const newUrl = `${window.location.pathname}?projectId=${view.projectId}`;
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setView({ type: 'DASHBOARD' });
    window.history.pushState({}, '', window.location.pathname);
  };

  // State Update Handlers
  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleAddProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const currentProject = view.type !== 'DASHBOARD' 
    ? projects.find(p => p.id === view.projectId) 
    : null;

  const currentAsset = (view.type === 'PLAYER' && currentProject)
    ? currentProject.assets.find(a => a.id === view.assetId)
    : null;

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <main className="h-full">
        {/* Sync Indicator */}
        {isSyncing && (
            <div className="fixed top-2 right-2 z-[100] px-2 py-1 bg-zinc-900 rounded text-[10px] text-zinc-500 flex items-center gap-2 border border-zinc-800">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
                Syncing...
            </div>
        )}

        {view.type === 'DASHBOARD' && (
          <Dashboard 
            projects={projects} 
            currentUser={currentUser}
            onSelectProject={handleSelectProject}
            onAddProject={handleAddProject}
            onLogout={handleLogout}
          />
        )}

        {view.type === 'PROJECT_VIEW' && currentProject && (
          <ProjectView 
            project={currentProject} 
            currentUser={currentUser}
            onBack={handleBackToDashboard}
            onSelectAsset={handleSelectAsset}
            onUpdateProject={handleUpdateProject}
          />
        )}

        {view.type === 'PLAYER' && currentProject && currentAsset && (
          <Player 
            asset={currentAsset} 
            project={currentProject}
            currentUser={currentUser}
            onBack={handleBackToProject}
            users={currentProject.team}
            onUpdateProject={handleUpdateProject}
          />
        )}
      </main>
    </div>
  );
};

export default App;