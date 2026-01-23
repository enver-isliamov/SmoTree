
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { Player } from './components/Player';
import { Login } from './components/Login';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { Project, ProjectAsset, User, UserRole } from './types';
import { MOCK_PROJECTS } from './constants';
import { generateId } from './services/utils';

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
  
  // TOAST STATE
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRemoteUpdate = useRef(false);
  
  // RACE CONDITION FIX: 
  // Blocks the `useEffect` fetch if we are in the middle of a Login->Join sequence.
  const isJoiningFlow = useRef(false);

  // TOAST HANDLER
  const notify = (message: string, type: ToastType = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

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

  // EXTRACTED FETCH LOGIC
  const fetchCloudData = useCallback(async (userOverride?: User) => {
      const userToUse = userOverride || currentUser;
      if (!userToUse) return;

       try {
         setIsSyncing(true);
         const res = await fetch('/api/data', {
            headers: getAuthHeader(userToUse)
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
                 notify("Session expired. Please login again.", "error");
             }
         }
       } catch (e) {
         console.warn("Offline or no backend detected, using local data.");
       } finally {
         setIsSyncing(false);
       }
  }, [currentUser]);

  // 1. Initial Data Fetch (Auto)
  // ONLY runs if we are NOT in the middle of a manual join flow.
  useEffect(() => {
    if (!currentUser || isJoiningFlow.current) return; 
    fetchCloudData();
  }, [currentUser, fetchCloudData]);

  // 2. Polling for updates
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(async () => {
        if (isSyncing || isJoiningFlow.current) return;

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
                            // Optional: notify("Project data updated from cloud", "info"); 
                            return cloudData;
                        }
                        return prevCurrent;
                    });
                }
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
                 notify("Session expired during sync", "error");
            }

        } catch (e) {
            console.error("Failed to sync to cloud", e);
            notify("Failed to save changes to cloud", "error");
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
        // SAAS UPDATE: Check access via Team list OR Ownership
        const hasAccess = 
            projectExists.ownerId === currentUser.id ||
            projectExists.team.some(member => member.id === currentUser.id) ||
            currentUser.role === UserRole.ADMIN; // Global admin fallback (optional)

        if (!hasAccess) {
            console.warn(`Access denied to project ${pId}`);
            // Don't notify immediately, gives time for sync
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
    notify("Project created successfully", "success");
  };

  const handleDeleteProject = async (projectId: string) => {
      // Optimistic local update
      setProjects(prev => prev.filter(p => p.id !== projectId));
      notify("Project deleted", "info");
      
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
    // 1. Lock the auto-fetch in useEffect to prevent Race Condition
    isJoiningFlow.current = true;
    
    setCurrentUser(user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    notify(`Welcome back, ${user.name.split(' ')[0]}`, "success");

    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');

    // If joining a project, call Join API immediately and WAIT
    if (pId) {
        try {
            // 2. Send Join Request (Synchronous wait)
            const joinRes = await fetch('/api/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: pId, user: user })
            });
            
            if (joinRes.ok) {
                const joinData = await joinRes.json();
                
                // 3. IMMEDIATE UPDATE: Inject the returned project into local state
                if (joinData.project) {
                    isRemoteUpdate.current = true; // Tell persistence NOT to overwrite this immediately
                    setProjects(prev => {
                        const exists = prev.some(p => p.id === joinData.project.id);
                        if (exists) return prev.map(p => p.id === joinData.project.id ? joinData.project : p);
                        return [...prev, joinData.project];
                    });
                    notify("Joined project successfully", "success");
                }
            } else {
                console.error("Join failed", await joinRes.text());
                notify("Failed to join project", "error");
            }

            // 4. NOW fetch the full list (Safe to do so because DB is updated)
            await fetchCloudData(user);

        } catch (e) {
            console.error("Failed to join project process:", e);
        }
    } else {
        // No invite code? Just fetch data normally.
        await fetchCloudData(user);
    }
    
    // 5. Release the lock
    isJoiningFlow.current = false;
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
        {view.type === 'DASHBOARD' && (
          <Dashboard 
            projects={projects} 
            currentUser={currentUser}
            onSelectProject={handleSelectProject}
            onAddProject={handleAddProject}
            onDeleteProject={handleDeleteProject}
            onLogout={handleLogout}
            notify={notify}
          />
        )}

        {view.type === 'PROJECT_VIEW' && currentProject && (
          <ProjectView 
            project={currentProject} 
            currentUser={currentUser}
            onBack={handleBackToDashboard}
            onSelectAsset={handleSelectAsset}
            onUpdateProject={handleUpdateProject}
            notify={notify}
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
            notify={notify}
          />
        )}

        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>
    </div>
  );
};

export default App;
