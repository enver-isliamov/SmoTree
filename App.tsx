
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { ProjectView } from './components/ProjectView';
import { Player } from './components/Player';
import { Login } from './components/Login';
import { Profile } from './components/Profile';
import { WorkflowPage, AboutPage, PricingPage } from './components/StaticPages';
import { ToastContainer, ToastMessage, ToastType } from './components/Toast';
import { Project, ProjectAsset, User, UserRole } from './types';
import { MOCK_PROJECTS } from './constants';
import { generateId } from './services/utils';
import { LanguageProvider } from './services/i18n';

type ViewState = 
  | { type: 'DASHBOARD' }
  | { type: 'PROJECT_VIEW', projectId: string }
  | { type: 'PLAYER', assetId: string, projectId: string }
  | { type: 'PROFILE' }
  | { type: 'WORKFLOW' }
  | { type: 'ABOUT' }
  | { type: 'PRICING' };

const STORAGE_KEY = 'smotree_projects_data';
const USER_STORAGE_KEY = 'smotree_auth_user';
const POLLING_INTERVAL_MS = 5000;

const AppContent: React.FC = () => {
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
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const isRemoteUpdate = useRef(false);
  const isJoiningFlow = useRef(false);
  const offlineModeNotified = useRef(false);
  const processedInvites = useRef<Set<string>>(new Set()); // Prevent double-joining on strict mode/rerenders

  // TOAST HANDLER
  const notify = (message: string, type: ToastType = 'info') => {
    const id = generateId();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getAuthHeader = (overrideUser?: User) => {
    const token = localStorage.getItem('smotree_auth_token');
    if (token) return { 'Authorization': `Bearer ${token}` };
    const targetUser = overrideUser || currentUser;
    if (targetUser) return { 'X-Guest-ID': targetUser.id };
    return {};
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('smotree_auth_token');
    setView({ type: 'DASHBOARD' });
    window.history.pushState({}, '', window.location.pathname);
  };

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
                offlineModeNotified.current = false;
            }
         } else if (res.status === 401) {
             handleLogout();
             notify("Session expired. Please login again.", "error");
         } else if (res.status === 503) {
             if (!offlineModeNotified.current) {
                console.warn("Backend 503: Offline Mode active");
             }
         }
       } catch (e) {
         // Silent fail on fetch
       } finally {
         setIsSyncing(false);
       }
  }, [currentUser]);

  // HELPER: Strip local-only fields (Blob URLs) before sending to cloud.
  const sanitizeProjectsForCloud = (projectsList: Project[]): Project[] => {
      return projectsList.map(p => ({
          ...p,
          assets: p.assets.map(a => ({
              ...a,
              versions: a.versions.map(v => {
                  const cleanVersion = { ...v };
                  delete cleanVersion.localFileUrl;
                  delete cleanVersion.localFileName;
                  return cleanVersion;
              })
          }))
      }));
  };

  // SELF-HEALING SYNC
  const forceSync = async (projectsData: Project[], isRetry = false) => {
      if (!currentUser || currentUser.role === UserRole.GUEST) return;
      
      const cleanData = sanitizeProjectsForCloud(projectsData);

      try {
          setIsSyncing(true);
          const res = await fetch('/api/data', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  ...getAuthHeader()
              },
              body: JSON.stringify(cleanData)
          });
          
          if (!res.ok) {
             if (res.status === 503) {
                 if (!offlineModeNotified.current) {
                     notify("Offline Mode: Cloud DB disconnected. Changes saved locally.", "info");
                     offlineModeNotified.current = true;
                 }
                 return;
             }

             if (!isRetry && res.status !== 404 && res.status !== 500) {
                 try {
                     const setupRes = await fetch('/api/setup');
                     if (setupRes.ok) {
                        await forceSync(projectsData, true);
                        return;
                     }
                 } catch (setupError) {
                     console.error("Auto-repair failed", setupError);
                 }
             }

             if (res.status !== 404 && res.status !== 500 && res.status !== 503) {
                notify("Warning: Cloud save failed.", "error");
             }
          } else {
             if (offlineModeNotified.current) {
                 notify("Online: Cloud Sync Restored", "success");
                 offlineModeNotified.current = false;
             }
          }
      } catch (e) {
          console.error("Force sync network error", e);
      } finally {
          setIsSyncing(false);
      }
  };

  useEffect(() => {
    if (!currentUser || isJoiningFlow.current) return; 
    fetchCloudData();
  }, [currentUser, fetchCloudData]);

  // Polling Sync
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(async () => {
        if (isSyncing || isJoiningFlow.current) return;
        try {
            const res = await fetch('/api/data', { headers: getAuthHeader() });
            if (res.ok) {
                const cloudData = await res.json();
                if (cloudData && Array.isArray(cloudData)) {
                    setProjects(prevCurrent => {
                        const cleanPrev = sanitizeProjectsForCloud(prevCurrent);
                        if (JSON.stringify(cleanPrev) !== JSON.stringify(cloudData)) {
                            isRemoteUpdate.current = true;
                            return cloudData;
                        }
                        return prevCurrent;
                    });
                }
            }
        } catch (e) {}
    }, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isSyncing, currentUser]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  // CORE LOGIC: Join Project Handler
  const processInviteLink = async (user: User, projectId: string) => {
      if (processedInvites.current.has(projectId)) return; // Prevent double join in strict mode
      
      console.log(`🔗 Processing invite for project: ${projectId}`);
      isJoiningFlow.current = true;
      notify("Accepting invitation...", "info");

      try {
          const joinRes = await fetch('/api/join', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ projectId: projectId, user: user })
          });
          
          if (joinRes.ok) {
              const joinData = await joinRes.json();
              if (joinData.project) {
                  processedInvites.current.add(projectId);
                  isRemoteUpdate.current = true;
                  setProjects(prev => {
                      const exists = prev.some(p => p.id === joinData.project.id);
                      if (exists) return prev.map(p => p.id === joinData.project.id ? joinData.project : p);
                      return [joinData.project, ...prev]; // Add to top
                  });
                  notify(`You joined "${joinData.project.name}"`, "success");
                  
                  // Auto-open project
                  setView({ type: 'PROJECT_VIEW', projectId: joinData.project.id });
                  
                  // Clean URL
                  const url = new URL(window.location.href);
                  url.searchParams.delete('projectId');
                  window.history.replaceState({}, '', url.toString());
              }
          } else {
              if (joinRes.status === 404) notify("Project not found or invitation expired.", "error");
              else if (joinRes.status === 503) notify("Cloud Offline. Cannot process invite.", "error");
              else notify("Failed to join project.", "error");
          }
      } catch (e) {
          console.error("Join flow error:", e);
          notify("Network error joining project.", "error");
      } finally {
          // Keep flag true briefly to prevent sync from overwriting immediately, then release
          setTimeout(() => { isJoiningFlow.current = false; }, 1000);
          await fetchCloudData(user);
      }
  };

  // INITIAL LOAD & INVITE CHECKER (For Already Logged In Users)
  useEffect(() => {
    if (!currentUser) return;

    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');
    const aId = params.get('assetId');

    // Scenario 1: Processing an Invite Link
    if (pId && !projects.some(p => p.id === pId)) {
        // If we don't have the project locally yet, try to join/fetch it
        processInviteLink(currentUser, pId);
        return; 
    } 
    
    // Scenario 2: Deep Link Navigation (Project already in list or just viewing)
    if (pId) {
      const projectExists = projects.find(p => p.id === pId);
      if (projectExists) {
        // Simple permission check mainly for UI, backend is source of truth
        const hasAccess = 
            projectExists.ownerId === currentUser.id ||
            projectExists.team.some(member => member.id === currentUser.id) ||
            currentUser.role === UserRole.ADMIN;

        if (hasAccess) {
            if (aId) {
                const assetExists = projectExists.assets.find(a => a.id === aId);
                if (assetExists) setView({ type: 'PLAYER', projectId: pId, assetId: aId });
                else setView({ type: 'PROJECT_VIEW', projectId: pId });
            } else {
                setView({ type: 'PROJECT_VIEW', projectId: pId });
            }
        }
      } else {
          // If project ID exists in URL but NOT in local list, 
          // AND we haven't processed it yet (maybe user was removed then clicked link again),
          // Try to join again to be sure.
          processInviteLink(currentUser, pId);
      }
    }
  }, [currentUser]); // Run when user is confirmed

  // Listen for navigation events from Dashboard header
  useEffect(() => {
      const handleProfileNav = () => setView({ type: 'PROFILE' });
      window.addEventListener('NAVIGATE_PROFILE', handleProfileNav);
      return () => window.removeEventListener('NAVIGATE_PROFILE', handleProfileNav);
  }, []);

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

  const handleUpdateProject = (updatedProject: Project, skipSync = false) => {
    const newProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(newProjects);
    
    if (!skipSync && currentUser?.role !== UserRole.GUEST) {
        forceSync(newProjects);
    }
  };
  
  const handleEditProject = (projectId: string, data: Partial<Project>) => {
      const updated = projects.map(p => p.id === projectId ? { ...p, ...data, updatedAt: 'Just now' } : p);
      setProjects(updated);
      forceSync(updated);
      notify("Project updated", "success");
  };

  const handleAddProject = (newProject: Project) => {
    const newProjects = [newProject, ...projects];
    setProjects(newProjects);
    notify("Project created successfully", "success");
    forceSync(newProjects);
  };

  const handleDeleteProject = async (projectId: string) => {
      setProjects(prev => prev.filter(p => p.id !== projectId));
      notify("Project deleted", "info");
      
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
      
      if ((view.type === 'PROJECT_VIEW' || view.type === 'PLAYER') && view.projectId === projectId) {
          handleBackToDashboard();
      }
  };

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    notify(`Welcome back, ${user.name.split(' ')[0]}`, "success");

    const params = new URLSearchParams(window.location.search);
    const pId = params.get('projectId');

    if (pId) {
        // Reuse the core invite logic
        await processInviteLink(user, pId);
    } else {
        await fetchCloudData(user);
    }
  };
  
  const handleNavigate = (page: string) => {
      switch(page) {
          case 'WORKFLOW': setView({ type: 'WORKFLOW' }); break;
          case 'ABOUT': setView({ type: 'ABOUT' }); break;
          case 'PRICING': setView({ type: 'PRICING' }); break;
          default: setView({ type: 'DASHBOARD' });
      }
  };

  const handleGuestMigration = async (googleCredential: string) => {
      if (!currentUser || currentUser.role !== UserRole.GUEST) return;
      
      notify("Migrating account...", "info");
      try {
          const res = await fetch('/api/migrate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  guestId: currentUser.id,
                  googleToken: googleCredential
              })
          });

          if (res.ok) {
              const data = await res.json();
              if (data.user) {
                  // 1. Update Auth Token
                  localStorage.setItem('smotree_auth_token', googleCredential);
                  // 2. Update Local User
                  const newUser = { ...data.user, role: UserRole.ADMIN };
                  setCurrentUser(newUser);
                  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
                  // 3. Refresh Data
                  notify("Account migrated successfully!", "success");
                  await fetchCloudData(newUser);
              }
          } else {
              notify("Migration failed. Please try again.", "error");
          }
      } catch (e) {
          console.error("Migration Error", e);
          notify("Network error during migration.", "error");
      }
  };

  const currentProject = (view.type === 'PROJECT_VIEW' || view.type === 'PLAYER') ? projects.find(p => p.id === view.projectId) : null;
  const currentAsset = (view.type === 'PLAYER' && currentProject) ? currentProject.assets.find(a => a.id === view.assetId) : null;

  // Render Static Pages
  if (view.type === 'WORKFLOW') return <WorkflowPage onBack={handleBackToDashboard} onNavigate={handleNavigate} isLoggedIn={!!currentUser} />;
  if (view.type === 'ABOUT') return <AboutPage onBack={handleBackToDashboard} onNavigate={handleNavigate} isLoggedIn={!!currentUser} />;
  if (view.type === 'PRICING') return <PricingPage onBack={handleBackToDashboard} onNavigate={handleNavigate} isLoggedIn={!!currentUser} />;

  if (!currentUser) return <Login onLogin={handleLogin} onNavigate={handleNavigate} />;
  
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
            onEditProject={handleEditProject}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            notify={notify}
          />
        )}
        {view.type === 'PROFILE' && (
            <Profile 
                currentUser={currentUser}
                onBack={handleBackToDashboard}
                onLogout={handleLogout}
                onMigrate={handleGuestMigration}
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
            onUpdateProject={(p, skipSync) => handleUpdateProject(p, skipSync)}
            isSyncing={isSyncing}
            notify={notify}
          />
        )}
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </main>
    </div>
  );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
};

export default App;
