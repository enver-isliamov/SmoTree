
import React, { useState, useEffect, useRef } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { Player } from './components/Player';
import { Login } from './components/Login';
import { Project, ProjectAsset, User, UserRole } from './types';
import { MOCK_PROJECTS } from './constants';

type ViewState = 
  | { type: 'DASHBOARD' }
  | { type: 'PROJECT_VIEW', projectId: string }
  | { type: 'PLAYER', assetId: string, projectId: string };

const STORAGE_KEY = 'smotree_projects_data';
const SYNC_DEBOUNCE_MS = 2000;
const POLLING_INTERVAL_MS = 5000; // Sync every 5 seconds

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
  // Flag to prevent saving back to server when the update came FROM the server
  const isRemoteUpdate = useRef(false);

  // 1. Initial Data Fetch from Cloud (Vercel Blob DB)
  useEffect(() => {
    const fetchCloudData = async () => {
       try {
         setIsSyncing(true);
         const res = await fetch('/api/data');
         if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data)) {
                // Initial load is treated as remote update to prevent immediate save-back
                isRemoteUpdate.current = true;
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

  // 2. Polling Mechanism (Real-time-ish updates)
  useEffect(() => {
    const interval = setInterval(async () => {
        // If we are currently uploading/syncing our own changes, don't pull
        // to avoid overwriting our pending work with old server data (race condition mitigation).
        if (isSyncing) return;

        try {
            const res = await fetch('/api/data');
            if (res.ok) {
                const cloudData = await res.json();
                if (cloudData && Array.isArray(cloudData)) {
                    setProjects(prevCurrent => {
                        // Only update if data is actually different to avoid re-renders
                        // Using JSON.stringify is acceptable for this dataset size
                        if (JSON.stringify(prevCurrent) !== JSON.stringify(cloudData)) {
                            // Mark as remote update so we don't save it back in step 3
                            isRemoteUpdate.current = true;
                            console.log("☁️ Received remote updates");
                            return cloudData;
                        }
                        return prevCurrent;
                    });
                }
            }
        } catch (e) {
            // Silent fail on polling errors
        }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isSyncing]);

  // 3. Persist data changes to Cloud + LocalStorage (Debounced)
  useEffect(() => {
    // Always save to local storage for immediate offline safety
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

    // If this change came from the server (Polling), do NOT save it back.
    if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }

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

  // 4. Handle Deep Linking with SECURITY CHECK
  useEffect(() => {
    if (!currentUser) return; // Wait for login

    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    const aId = params.get('assetId');

    if (pId) {
      const projectExists = projects.find(p => p.id === pId);
      
      if (projectExists) {
        // SECURITY CHECK: Is user allowed to see this project?
        const hasAccess = 
            currentUser.role === UserRole.ADMIN || 
            projectExists.team.some(member => member.id === currentUser.id);

        if (!hasAccess) {
            console.warn(`Access denied to project ${pId} for user ${currentUser.name}`);
            // If access denied, strip URL params and stay on dashboard
            window.history.pushState({}, '', window.location.pathname);
            setView({ type: 'DASHBOARD' });
            return;
        }

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
  }, [projects, currentUser]); 

  // Navigation handlers
  const handleSelectProject = (project: Project) => {
    // Security check redundant here as UI hides it, but good practice
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

  const handleDeleteProject = (projectId: string) => {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      // If viewing deleted project, go back to dashboard
      if (view.type !== 'DASHBOARD' && view.projectId === projectId) {
          handleBackToDashboard();
      }
  };

  // Login Handler with Auto-Join Team Logic
  const handleLogin = (user: User) => {
    setCurrentUser(user);

    // If logging in via a link, ensure user is added to the project team
    // This allows the "Invite via Link" workflow to actually work
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');

    if (pId) {
        setProjects(prevProjects => {
            return prevProjects.map(p => {
                if (p.id === pId) {
                    // Avoid duplicates
                    const isMember = p.team.some(m => m.id === user.id);
                    if (!isMember) {
                        return {
                            ...p,
                            team: [...p.team, user]
                        };
                    }
                }
                return p;
            });
        });
    }
  };

  const currentProject = view.type !== 'DASHBOARD' 
    ? projects.find(p => p.id === view.projectId) 
    : null;

  const currentAsset = (view.type === 'PLAYER' && currentProject)
    ? currentProject.assets.find(a => a.id === view.assetId)
    : null;

  if (!currentUser) {
    // Pass the new handleLogin wrapper instead of setting state directly
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <main className="h-full">
        {/* Sync Indicator */}
        <div className="fixed top-2 right-2 z-[100] flex gap-2">
            {isSyncing && (
                <div className="px-2 py-1 bg-zinc-900 rounded text-[10px] text-zinc-500 flex items-center gap-2 border border-zinc-800 animate-pulse">
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
                    Saving...
                </div>
            )}
        </div>

        {view.type === 'DASHBOARD' && (
          <Dashboard 
            projects={projects} 
            currentUser={currentUser}
            onSelectProject={handleSelectProject}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
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
            isSyncing={isSyncing}
          />
        )}
      </main>
    </div>
  );
};

export default App;