
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
const USER_STORAGE_KEY = 'smotree_auth_user';
const SYNC_DEBOUNCE_MS = 2000;
const POLLING_INTERVAL_MS = 5000;

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });

  const [view, setView] = useState<ViewState>({ type: 'DASHBOARD' });
  const [isSyncing, setIsSyncing] = useState(false);
  
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);

  // Helper to get token OR guest ID
  const getAuthHeader = (overrideUser?: User) => {
    const token = localStorage.getItem('smotree_auth_token');
    if (token) {
        return { 'Authorization': `Bearer ${token}` };
    }
    // Fallback for guests to read projects they are part of
    const targetUser = overrideUser || currentUser;
    if (targetUser) {
        return { 'X-Guest-ID': targetUser.id };
    }
    return {};
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('smotree_auth_token');
    setView({ type: 'DASHBOARD' });
    window.history.pushState({}, '', window.location.pathname);
  };

  // 1. Initial Data Fetch
  useEffect(() => {
    if (!currentUser) return; // Wait for login

    const fetchCloudData = async () => {
       try {
         setIsSyncing(true);
         const res = await fetch('/api/data', {
            headers: getAuthHeader()
         });
         
         if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data)) {
                isRemoteUpdate.current = true;
                setProjects(data);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
            }
         } else {
             if (res.status === 401) {
                 console.warn("Session expired. Logging out.");
                 handleLogout();
             } else {
                 console.warn("API Sync failed (offline or server error)");
             }
         }
       } catch (e) {
         console.warn("Offline or no backend detected, using local data.");
       } finally {
         setIsSyncing(false);
       }
    };
    fetchCloudData();
  }, [currentUser]);

  // 2. Polling for updates
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
        if (isSyncing) return;

        try {
            const res = await fetch('/api/data', {
                headers: getAuthHeader()
            });

            if (res.ok) {
                const cloudData = await res.json();
                if (cloudData && Array.isArray(cloudData)) {
                    setProjects(prevCurrent => {
                        // Simple equality check to avoid re-renders
                        if (JSON.stringify(prevCurrent) !== JSON.stringify(cloudData)) {
                            isRemoteUpdate.current = true;
                            console.log("☁️ Received remote updates");
                            return cloudData;
                        }
                        return prevCurrent;
                    });
                }
            } else if (res.status === 401) {
                // handleLogout(); 
            }
        } catch (e) {
            // Silent fail
        }
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isSyncing, currentUser]);

  // 3. Persist Changes (Debounced Sync) - POST only allowed for verified users
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

    if (isRemoteUpdate.current) {
        isRemoteUpdate.current = false;
        return;
    }
    
    // GUESTS cannot write to main data API directly via POST
    const isGuest = currentUser?.role === UserRole.GUEST;
    if (!currentUser || isGuest) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(async () => {
        try {
            setIsSyncing(true);
            const res = await fetch('/api/data', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...getAuthHeader()
                },
                body: JSON.stringify(projects)
            });
            
            if (res.status === 401) {
                 console.warn("Session expired during sync.");
            }

        } catch (e) {
            console.error("Failed to sync to cloud", e);
        } finally {
            setIsSyncing(false);
        }
    }, SYNC_DEBOUNCE_MS);

    return () => {
        if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [projects, currentUser]);

  // 4. Deep Linking & Security
  useEffect(() => {
    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    const aId = params.get('assetId');

    if (pId) {
      // Look in local projects first, but also wait for fetch
      const projectExists = projects.find(p => p.id === pId);
      
      if (projectExists) {
        const hasAccess = 
            currentUser.role === UserRole.ADMIN || 
            projectExists.team.some(member => member.id === currentUser.id);

        if (!hasAccess) {
            console.warn(`Access denied to project ${pId} for user ${currentUser.name}`);
            // Don't redirect immediately, give chance for state to settle if just joined
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

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleAddProject = (newProject: Project) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleDeleteProject = async (projectId: string) => {
      // Optimistic local update
      setProjects(prev => prev.filter(p => p.id !== projectId));
      
      // Send explicit delete command to server
      if (currentUser) {
          try {
             const token = localStorage.getItem('smotree_auth_token');
             await fetch(`/api/data?id=${projectId}`, {
                 method: 'DELETE',
                 headers: token ? { 'Authorization': `Bearer ${token}` } : {}
             });
          } catch (e) {
             console.error("Delete sync failed", e);
          }
      }

      if (view.type !== 'DASHBOARD' && view.projectId === projectId) {
          handleBackToDashboard();
      }
  };

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));

    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');

    // If joining a project and is Guest, call Join API immediately
    if (pId) {
        try {
            // 1. Send Join Request
            const joinRes = await fetch('/api/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: pId, user: user })
            });
            
            if (joinRes.ok) {
                const joinData = await joinRes.json();
                
                // 2. IMMEDIATE UPDATE: Inject the returned project into local state
                // This bypasses the wait for the next polling cycle or race conditions in /api/data fetch
                if (joinData.project) {
                    console.log("🚀 Successfully joined project via link");
                    isRemoteUpdate.current = true; // Prevent this from triggering a sync-back
                    setProjects(prev => {
                        const exists = prev.some(p => p.id === joinData.project.id);
                        if (exists) return prev.map(p => p.id === joinData.project.id ? joinData.project : p);
                        return [...prev, joinData.project];
                    });
                }
            } else {
                console.error("Join failed", await joinRes.text());
            }

            // 3. Trigger a full background sync just in case
            // Explicitly pass the user here because 'currentUser' state might not be updated yet in this closure
            const res = await fetch('/api/data', {
                 headers: getAuthHeader(user)
            });
            
            if (res.ok) {
                const data = await res.json();
                // Merge strategies could be complex, but replacing is standard here
                if (Array.isArray(data) && data.length > 0) {
                     setProjects(data);
                }
            }

        } catch (e) {
            console.error("Failed to join project process:", e);
        }
    }
  };

  const currentProject = view.type !== 'DASHBOARD' 
    ? projects.find(p => p.id === view.projectId) 
    : null;

  const currentAsset = (view.type === 'PLAYER' && currentProject)
    ? currentProject.assets.find(a => a.id === view.assetId)
    : null;

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <main className="h-full">
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
